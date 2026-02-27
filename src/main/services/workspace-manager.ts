import { Workspace, AppEntry, ActivationStep } from '../../shared/types';
import * as workspaceStorage from './workspace-storage';
import * as processManager from './process-manager';
import * as audioController from './audio-controller';
import * as displayController from './display-controller';
import * as soundPlayer from './sound-player';
import * as logger from './logger';
import * as explorerWindows from './explorer-windows';
import { shell } from 'electron';
import { setActiveWorkspaceId as setStoreActiveWorkspaceId } from '../store';
import fs from 'fs';

const ALLOWED_URL_SCHEMES = ['http:', 'https:', 'spotify:'];

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_URL_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
}

// In-memory state
let activeWorkspaceId: string | null = null;
let openedApps: Set<string> = new Set(); // paths of apps opened by current workspace
let isActivating = false;

export function getIsActivating(): boolean {
  return isActivating;
}

// Dry run check — injected so it's testable without requiring electron-store
let isDryRunFn: () => boolean = () => false;

export function setDryRunCheck(fn: () => boolean): void {
  isDryRunFn = fn;
}

type ProgressSender = { send: (channel: string, ...args: unknown[]) => void };

function getProcessName(appPath: string, fallback?: string): string {
  return appPath.split('\\').pop() || fallback || '';
}

function sendProgress(sender: ProgressSender | null, message: string): void {
  sender?.send('activation:progress', message);
}

function sendOverlayStart(
  sender: ProgressSender | null,
  workspaceName: string,
  workspaceIcon: string,
  isDeactivation: boolean,
  steps: ActivationStep[]
): void {
  sender?.send('activation:overlay-start', {
    workspaceName,
    workspaceIcon,
    isDeactivation,
    steps,
  });
}

function sendOverlayStep(
  sender: ProgressSender | null,
  stepId: string,
  status: ActivationStep['status'],
  error?: string
): void {
  sender?.send('activation:overlay-step', { stepId, status, error });
}

function sendOverlayComplete(
  sender: ProgressSender | null,
  succeeded: number,
  total: number,
  skipped: number,
  failed: number
): void {
  sender?.send('activation:overlay-complete', { succeeded, total, skipped, failed });
}

function getDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname || url;
  } catch {
    return url;
  }
}

function getFolderName(folderPath: string): string {
  return folderPath.split('\\').pop() || folderPath;
}

interface ValidationResult {
  validAppsToOpen: AppEntry[];
  skippedAppsToOpen: AppEntry[];
  validWallpaper: boolean;
  validSound: boolean;
  validFolders: string[];
  skippedFolders: string[];
  validAudioDevice: boolean;
  skippedCount: number;
}

async function validateResources(workspace: Workspace): Promise<ValidationResult> {
  const result: ValidationResult = {
    validAppsToOpen: [],
    skippedAppsToOpen: [],
    validWallpaper: true,
    validSound: true,
    validFolders: [],
    skippedFolders: [],
    validAudioDevice: true,
    skippedCount: 0,
  };

  // Validate app paths
  for (const app of workspace.apps.open) {
    if (fs.existsSync(app.path)) {
      result.validAppsToOpen.push(app);
    } else {
      result.skippedAppsToOpen.push(app);
      result.skippedCount++;
    }
  }

  // Validate wallpaper
  if (workspace.display.wallpaper && !fs.existsSync(workspace.display.wallpaper)) {
    result.validWallpaper = false;
    result.skippedCount++;
  }

  // Validate transition sound (resolve builtin: prefix)
  if (workspace.audio.transitionSound) {
    const soundPath = workspace.audio.transitionSound.startsWith('builtin:')
      ? // Can't easily validate builtin sounds here, assume valid
        true
      : fs.existsSync(workspace.audio.transitionSound);
    if (!soundPath) {
      result.validSound = false;
      result.skippedCount++;
    }
  }

  // Validate folders
  for (const folder of workspace.folders) {
    if (fs.existsSync(folder)) {
      result.validFolders.push(folder);
    } else {
      result.skippedFolders.push(folder);
      result.skippedCount++;
    }
  }

  // Validate audio device
  if (workspace.system.audioDevice) {
    const devices = await audioController.getAudioDevices();
    const deviceExists = devices.some(d => d.id === workspace.system.audioDevice);
    if (!deviceExists) {
      result.validAudioDevice = false;
      result.skippedCount++;
    }
  }

  return result;
}

/** Build overlay step list for activateWorkspace */
function buildActivateSteps(
  workspace: Workspace,
  validation: ValidationResult
): ActivationStep[] {
  const steps: ActivationStep[] = [];

  // Sound
  if (workspace.audio.transitionSound && validation.validSound) {
    steps.push({ id: 'sound', label: 'Playing transition sound', status: 'pending' });
  }

  // Close apps
  workspace.apps.close.forEach((app, i) => {
    steps.push({ id: `close-${i}`, label: `Closing ${app.name}`, status: 'pending' });
  });

  // Wallpaper
  if (workspace.display.wallpaper && validation.validWallpaper) {
    steps.push({ id: 'wallpaper', label: 'Setting wallpaper', status: 'pending' });
  }

  // Audio device
  if (workspace.system.audioDevice && validation.validAudioDevice) {
    steps.push({ id: 'audio-device', label: `Switching audio \u2192 ${workspace.system.audioDevice}`, status: 'pending' });
  }

  // Volume
  if (workspace.system.volume !== null) {
    steps.push({ id: 'volume', label: `Setting volume \u2192 ${workspace.system.volume}%`, status: 'pending' });
  }

  // Open apps
  validation.validAppsToOpen.forEach((app, i) => {
    steps.push({ id: `open-${i}`, label: `Opening ${app.name}`, status: 'pending' });
  });

  // Skipped apps (show as skipped from the start)
  validation.skippedAppsToOpen.forEach((app, i) => {
    steps.push({ id: `open-skipped-${i}`, label: `Opening ${app.name}`, status: 'skipped', error: `Path not found: ${app.path}` });
  });

  // Close folders
  if (workspace.closeFolders) {
    steps.push({ id: 'close-folders', label: 'Closing other Explorer windows', status: 'pending' });
  }

  // Folders
  validation.validFolders.forEach((folder, i) => {
    steps.push({ id: `folder-${i}`, label: `Opening folder: ${getFolderName(folder)}`, status: 'pending' });
  });

  // Skipped folders
  validation.skippedFolders.forEach((folder, i) => {
    steps.push({ id: `folder-skipped-${i}`, label: `Opening folder: ${getFolderName(folder)}`, status: 'skipped', error: 'Path not found' });
  });

  // URLs
  workspace.urls.forEach((url, i) => {
    steps.push({ id: `url-${i}`, label: `Opening URL: ${getDomain(url)}`, status: 'pending' });
  });

  // Music
  if (workspace.audio.playlistUri && isSafeUrl(workspace.audio.playlistUri)) {
    steps.push({ id: 'music', label: 'Launching Spotify playlist', status: 'pending' });
  }

  // Skipped: wallpaper
  if (workspace.display.wallpaper && !validation.validWallpaper) {
    steps.push({ id: 'wallpaper-skipped', label: 'Setting wallpaper', status: 'skipped', error: 'File not found' });
  }

  // Skipped: sound
  if (workspace.audio.transitionSound && !validation.validSound) {
    steps.push({ id: 'sound-skipped', label: 'Playing transition sound', status: 'skipped', error: 'File not found' });
  }

  // Skipped: audio device
  if (workspace.system.audioDevice && !validation.validAudioDevice) {
    steps.push({ id: 'audio-device-skipped', label: `Switching audio \u2192 ${workspace.system.audioDevice}`, status: 'skipped', error: 'Device not found' });
  }

  return steps;
}

/** Build overlay step list for switchWorkspaceInternal */
function buildSwitchSteps(
  newWorkspace: Workspace,
  validation: ValidationResult,
  currentWorkspace?: Workspace,
  isDeactivation?: boolean
): ActivationStep[] {
  const steps: ActivationStep[] = [];
  let closeIndex = 0;

  const closingSuffix = isDeactivation && currentWorkspace
    ? ` (opened by ${currentWorkspace.name})`
    : '';

  // Close old workspace apps not in new workspace
  if (currentWorkspace) {
    const newOpenPaths = new Set(
      newWorkspace.apps.open.map((a) => a.path.toLowerCase())
    );
    for (const app of currentWorkspace.apps.open) {
      if (!newOpenPaths.has(app.path.toLowerCase())) {
        steps.push({ id: `close-${closeIndex}`, label: `Closing ${app.name}${closingSuffix}`, status: 'pending' });
        closeIndex++;
      }
    }
  }

  // Close apps from new workspace's close list
  newWorkspace.apps.close.forEach((app) => {
    steps.push({ id: `close-${closeIndex}`, label: `Closing ${app.name}`, status: 'pending' });
    closeIndex++;
  });

  // Wallpaper
  if (newWorkspace.display.wallpaper && validation.validWallpaper) {
    steps.push({ id: 'wallpaper', label: 'Setting wallpaper', status: 'pending' });
  }

  // Audio device
  if (newWorkspace.system.audioDevice && validation.validAudioDevice) {
    steps.push({ id: 'audio-device', label: `Switching audio \u2192 ${newWorkspace.system.audioDevice}`, status: 'pending' });
  }

  // Volume
  if (newWorkspace.system.volume !== null) {
    steps.push({ id: 'volume', label: `Setting volume \u2192 ${newWorkspace.system.volume}%`, status: 'pending' });
  }

  // Open apps
  validation.validAppsToOpen.forEach((app, i) => {
    steps.push({ id: `open-${i}`, label: `Opening ${app.name}`, status: 'pending' });
  });

  // Skipped apps
  validation.skippedAppsToOpen.forEach((app, i) => {
    steps.push({ id: `open-skipped-${i}`, label: `Opening ${app.name}`, status: 'skipped', error: `Path not found: ${app.path}` });
  });

  // Close folders
  if (newWorkspace.closeFolders) {
    steps.push({ id: 'close-folders', label: 'Closing other Explorer windows', status: 'pending' });
  }

  // Folders
  validation.validFolders.forEach((folder, i) => {
    steps.push({ id: `folder-${i}`, label: `Opening folder: ${getFolderName(folder)}`, status: 'pending' });
  });

  // Skipped folders
  validation.skippedFolders.forEach((folder, i) => {
    steps.push({ id: `folder-skipped-${i}`, label: `Opening folder: ${getFolderName(folder)}`, status: 'skipped', error: 'Path not found' });
  });

  // URLs
  newWorkspace.urls.forEach((url, i) => {
    steps.push({ id: `url-${i}`, label: `Opening URL: ${getDomain(url)}`, status: 'pending' });
  });

  // Transition sound (at end in switch)
  if (newWorkspace.audio.transitionSound && validation.validSound) {
    steps.push({ id: 'sound', label: 'Playing transition sound', status: 'pending' });
  }

  // Skipped: wallpaper
  if (newWorkspace.display.wallpaper && !validation.validWallpaper) {
    steps.push({ id: 'wallpaper-skipped', label: 'Setting wallpaper', status: 'skipped', error: 'File not found' });
  }

  // Skipped: sound
  if (newWorkspace.audio.transitionSound && !validation.validSound) {
    steps.push({ id: 'sound-skipped', label: 'Playing transition sound', status: 'skipped', error: 'File not found' });
  }

  // Skipped: audio device
  if (newWorkspace.system.audioDevice && !validation.validAudioDevice) {
    steps.push({ id: 'audio-device-skipped', label: `Switching audio \u2192 ${newWorkspace.system.audioDevice}`, status: 'skipped', error: 'Device not found' });
  }

  return steps;
}

export function getActiveWorkspaceId(): string | null {
  return activeWorkspaceId;
}

export async function activateWorkspaceById(
  id: string,
  sender?: ProgressSender
): Promise<void> {
  if (isActivating) return;
  const workspace = await workspaceStorage.getWorkspace(id);
  await activateWorkspace(workspace, sender ?? null);
}

export async function activateWorkspace(
  workspace: Workspace,
  sender: ProgressSender | null
): Promise<void> {
  if (isActivating) return;
  isActivating = true;
  try {
  const dryRun = isDryRunFn();

  if (dryRun) {
    await activateWorkspaceDryRun(workspace, sender);
    return;
  }

  // Pre-validate resources
  const validation = await validateResources(workspace);

  // Log skipped resources
  for (const app of validation.skippedAppsToOpen) {
    await logger.logStep('OPEN APP', app.name, 'SKIPPED', `Path not found: ${app.path}`);
  }
  for (const folder of validation.skippedFolders) {
    await logger.logStep('OPEN FOLDER', folder, 'SKIPPED', 'Path not found');
  }
  if (!validation.validWallpaper) {
    await logger.logStep('SET WALLPAPER', workspace.display.wallpaper || '', 'SKIPPED', 'File not found');
  }
  if (!validation.validSound) {
    await logger.logStep('PLAY SOUND', workspace.audio.transitionSound || '', 'SKIPPED', 'File not found');
  }
  if (!validation.validAudioDevice) {
    await logger.logStep('SET AUDIO DEVICE', workspace.system.audioDevice || '', 'SKIPPED', 'Device not found');
  }

  // Build and send overlay steps
  const overlaySteps = buildActivateSteps(workspace, validation);
  sendOverlayStart(sender, workspace.name, workspace.icon, false, overlaySteps);

  const startTime = Date.now();
  let succeeded = 0;
  let total = 0;
  let skipped = validation.skippedCount;
  let failed = 0;

  await logger.logActivationStart(workspace.name);

  // 1. Play transition sound (only if valid)
  try {
    if (workspace.audio.transitionSound && sender && validation.validSound) {
      total++;
      sendOverlayStep(sender, 'sound', 'in-progress');
      soundPlayer.playSound(workspace.audio.transitionSound, sender);
      await logger.logStep('PLAY SOUND', workspace.audio.transitionSound, 'SUCCESS');
      sendOverlayStep(sender, 'sound', 'success');
      succeeded++;
    }
  } catch (err) {
    console.error('Transition sound error:', err);
    await logger.logStep('PLAY SOUND', workspace.audio.transitionSound || '', 'FAILED', err instanceof Error ? err.message : String(err));
    sendOverlayStep(sender, 'sound', 'failed', err instanceof Error ? err.message : String(err));
    failed++;
  }

  // 3. Close apps from close list
  for (let i = 0; i < workspace.apps.close.length; i++) {
    const app = workspace.apps.close[i];
    total++;
    const stepId = `close-${i}`;
    try {
      const processName = getProcessName(app.path, app.name);
      sendProgress(sender, `Closing ${app.name}...`);
      sendOverlayStep(sender, stepId, 'in-progress');
      await processManager.closeApp(processName);
      await logger.logStep('CLOSE APP', processName, 'SUCCESS');
      sendOverlayStep(sender, stepId, 'success');
      succeeded++;
    } catch (err) {
      sendProgress(sender, `Failed to close ${app.name}, continuing...`);
      console.error(`Close app error (${app.name}):`, err);
      await logger.logStep('CLOSE APP', getProcessName(app.path, app.name), 'FAILED', err instanceof Error ? err.message : String(err));
      sendOverlayStep(sender, stepId, 'failed', err instanceof Error ? err.message : String(err));
      failed++;
    }
  }

  // 4. Set wallpaper (only if valid)
  try {
    if (workspace.display.wallpaper && validation.validWallpaper) {
      total++;
      sendProgress(sender, 'Setting wallpaper...');
      sendOverlayStep(sender, 'wallpaper', 'in-progress');
      await displayController.setWallpaper(workspace.display.wallpaper);
      await logger.logStep('SET WALLPAPER', workspace.display.wallpaper, 'SUCCESS');
      sendOverlayStep(sender, 'wallpaper', 'success');
      succeeded++;
    }
  } catch (err) {
    sendProgress(sender, 'Failed to set wallpaper, continuing...');
    console.error('Wallpaper error:', err);
    await logger.logStep('SET WALLPAPER', workspace.display.wallpaper || '', 'FAILED', err instanceof Error ? err.message : String(err));
    sendOverlayStep(sender, 'wallpaper', 'failed', err instanceof Error ? err.message : String(err));
    failed++;
  }

  // 7. Audio device and volume (only switch device if valid)
  try {
    if (workspace.system.audioDevice && validation.validAudioDevice) {
      total++;
      sendProgress(sender, `Switching audio to ${workspace.system.audioDevice}...`);
      sendOverlayStep(sender, 'audio-device', 'in-progress');
      const audioSuccess = await audioController.setAudioDevice(workspace.system.audioDevice);
      if (audioSuccess) {
        await logger.logStep('SET AUDIO DEVICE', workspace.system.audioDevice, 'SUCCESS');
        sendOverlayStep(sender, 'audio-device', 'success');
      } else {
        await logger.logStep('SET AUDIO DEVICE', workspace.system.audioDevice, 'FAILED', 'Verification failed after retry');
        sendOverlayStep(sender, 'audio-device', 'failed', 'Verification failed after retry');
        failed++;
      }
      succeeded++;
    }
    if (workspace.system.volume !== null) {
      total++;
      sendOverlayStep(sender, 'volume', 'in-progress');
      await audioController.setVolume(workspace.system.volume);
      await logger.logStep('SET VOLUME', `${workspace.system.volume}%`, 'SUCCESS');
      sendOverlayStep(sender, 'volume', 'success');
      succeeded++;
    }
  } catch (err) {
    sendProgress(sender, 'Failed to set audio, continuing...');
    console.error('Audio error:', err);
    if (workspace.system.audioDevice) {
      await logger.logStep('SET AUDIO DEVICE', workspace.system.audioDevice, 'FAILED', err instanceof Error ? err.message : String(err));
      sendOverlayStep(sender, 'audio-device', 'failed', err instanceof Error ? err.message : String(err));
      failed++;
    }
    if (workspace.system.volume !== null) {
      await logger.logStep('SET VOLUME', `${workspace.system.volume}%`, 'FAILED', err instanceof Error ? err.message : String(err));
      sendOverlayStep(sender, 'volume', 'failed', err instanceof Error ? err.message : String(err));
      failed++;
    }
  }

  // 8. Launch apps from open list (only valid ones)
  openedApps.clear();
  for (let i = 0; i < validation.validAppsToOpen.length; i++) {
    const app = validation.validAppsToOpen[i];
    total++;
    const stepId = `open-${i}`;
    try {
      sendProgress(sender, `Launching ${app.name}...`);
      sendOverlayStep(sender, stepId, 'in-progress');
      await processManager.launchApp(app);
      openedApps.add(app.path);
      await logger.logStep('OPEN APP', app.name, 'SUCCESS');
      sendOverlayStep(sender, stepId, 'success');
      succeeded++;
    } catch (err) {
      sendProgress(sender, `Failed to launch ${app.name}, continuing...`);
      console.error(`Launch app error (${app.name}):`, err);
      await logger.logStep('OPEN APP', app.name, 'FAILED', err instanceof Error ? err.message : String(err));
      sendOverlayStep(sender, stepId, 'failed', err instanceof Error ? err.message : String(err));
      failed++;
    }
  }

  // 9. Close Explorer windows (if enabled), then open valid folders
  let alreadyOpenFolders: Set<string> = new Set();
  if (workspace.closeFolders) {
    try {
      total++;
      sendProgress(sender, 'Closing Explorer windows...');
      sendOverlayStep(sender, 'close-folders', 'in-progress');
      const openPaths = await explorerWindows.getOpenExplorerPaths();
      alreadyOpenFolders = new Set(openPaths.map((p) => p.toLowerCase()));
      await explorerWindows.closeExplorerWindows(validation.validFolders);
      await logger.logStep('CLOSE EXPLORER WINDOWS', `keeping ${validation.validFolders.length} folders`, 'SUCCESS');
      sendOverlayStep(sender, 'close-folders', 'success');
      succeeded++;
    } catch (err) {
      console.error('Close Explorer windows error:', err);
      await logger.logStep('CLOSE EXPLORER WINDOWS', '', 'FAILED', err instanceof Error ? err.message : String(err));
      sendOverlayStep(sender, 'close-folders', 'failed', err instanceof Error ? err.message : String(err));
      failed++;
    }
  }
  for (let i = 0; i < validation.validFolders.length; i++) {
    const folder = validation.validFolders[i];
    const stepId = `folder-${i}`;
    // Skip folders already open (kept open by closeExplorerWindows)
    if (alreadyOpenFolders.has(folder.toLowerCase())) {
      skipped++;
      await logger.logStep('OPEN FOLDER', folder, 'SKIPPED');
      sendOverlayStep(sender, stepId, 'skipped');
      continue;
    }
    total++;
    try {
      sendOverlayStep(sender, stepId, 'in-progress');
      await shell.openPath(folder);
      await logger.logStep('OPEN FOLDER', folder, 'SUCCESS');
      sendOverlayStep(sender, stepId, 'success');
      succeeded++;
    } catch (err) {
      console.error(`Open folder error (${folder}):`, err);
      await logger.logStep('OPEN FOLDER', folder, 'FAILED', err instanceof Error ? err.message : String(err));
      sendOverlayStep(sender, stepId, 'failed', err instanceof Error ? err.message : String(err));
      failed++;
    }
  }

  // 10. Open URLs
  for (let i = 0; i < workspace.urls.length; i++) {
    const url = workspace.urls[i];
    total++;
    const stepId = `url-${i}`;
    try {
      if (isSafeUrl(url)) {
        sendOverlayStep(sender, stepId, 'in-progress');
        await shell.openExternal(url);
        await logger.logStep('OPEN URL', url, 'SUCCESS');
        sendOverlayStep(sender, stepId, 'success');
        succeeded++;
      } else {
        console.error(`Blocked unsafe URL: ${url}`);
        await logger.logStep('OPEN URL', url, 'FAILED', 'Blocked unsafe URL');
        sendOverlayStep(sender, stepId, 'failed', 'Blocked unsafe URL');
        failed++;
      }
    } catch (err) {
      console.error(`Open URL error (${url}):`, err);
      await logger.logStep('OPEN URL', url, 'FAILED', err instanceof Error ? err.message : String(err));
      sendOverlayStep(sender, stepId, 'failed', err instanceof Error ? err.message : String(err));
      failed++;
    }
  }

  // 11. Music — open playlist URI if set
  try {
    if (workspace.audio.playlistUri && isSafeUrl(workspace.audio.playlistUri)) {
      total++;
      sendOverlayStep(sender, 'music', 'in-progress');
      await shell.openExternal(workspace.audio.playlistUri);
      await logger.logStep('LAUNCH MUSIC', workspace.audio.playlistUri, 'SUCCESS');
      sendOverlayStep(sender, 'music', 'success');
      succeeded++;
    }
  } catch (err) {
    console.error('Music launch error:', err);
    await logger.logStep('LAUNCH MUSIC', workspace.audio.playlistUri || '', 'FAILED', err instanceof Error ? err.message : String(err));
    sendOverlayStep(sender, 'music', 'failed', err instanceof Error ? err.message : String(err));
    failed++;
  }

  activeWorkspaceId = workspace.id;
  setStoreActiveWorkspaceId(workspace.id);

  await logger.logActivationComplete(Date.now() - startTime, succeeded, total, skipped);

  // Send overlay complete
  sendOverlayComplete(sender, succeeded, total, skipped, failed);

  if (validation.skippedCount > 0) {
    sendProgress(sender, `Done (${validation.skippedCount} items skipped — check logs)`);
  } else {
    sendProgress(sender, 'Done');
  }
  } finally {
    isActivating = false;
  }
}

async function activateWorkspaceDryRun(
  workspace: Workspace,
  sender: ProgressSender | null
): Promise<void> {
  const ts = () => new Date().toTimeString().slice(0, 8);
  let actionCount = 0;

  sendProgress(sender, '[DRY RUN] Simulating activation...');

  await logger.logDryRunStep(`[${ts()}] [DRY RUN] ACTIVATION START — Workspace: ${workspace.name}`);

  if (workspace.audio.transitionSound) {
    await logger.logDryRunStep(`[${ts()}] [DRY RUN] PLAY SOUND — ${workspace.audio.transitionSound}`);
    actionCount++;
  }

  for (const app of workspace.apps.close) {
    sendProgress(sender, `[DRY RUN] Would close ${app.name}`);
    await logger.logDryRunStep(`[${ts()}] [DRY RUN] CLOSE APP — ${getProcessName(app.path, app.name)}`);
    actionCount++;
  }

  if (workspace.display.wallpaper) {
    await logger.logDryRunStep(`[${ts()}] [DRY RUN] SET WALLPAPER — ${workspace.display.wallpaper}`);
    actionCount++;
  }

  if (workspace.system.audioDevice) {
    await logger.logDryRunStep(`[${ts()}] [DRY RUN] SET AUDIO DEVICE — ${workspace.system.audioDevice}`);
    actionCount++;
  }

  if (workspace.system.volume !== null) {
    await logger.logDryRunStep(`[${ts()}] [DRY RUN] SET VOLUME — ${workspace.system.volume}%`);
    actionCount++;
  }

  for (const app of workspace.apps.open) {
    sendProgress(sender, `[DRY RUN] Would launch ${app.name}`);
    await logger.logDryRunStep(`[${ts()}] [DRY RUN] OPEN APP — ${app.name}`);
    actionCount++;
  }

  if (workspace.closeFolders) {
    await logger.logDryRunStep(`[${ts()}] [DRY RUN] CLOSE EXPLORER WINDOWS — keeping ${workspace.folders.length} folders`);
    actionCount++;
  }

  for (const folder of workspace.folders) {
    await logger.logDryRunStep(`[${ts()}] [DRY RUN] OPEN FOLDER — ${folder}`);
    actionCount++;
  }

  for (const url of workspace.urls) {
    await logger.logDryRunStep(`[${ts()}] [DRY RUN] OPEN URL — ${url}`);
    actionCount++;
  }

  if (workspace.audio.playlistUri) {
    await logger.logDryRunStep(`[${ts()}] [DRY RUN] LAUNCH MUSIC — ${workspace.audio.playlistUri}`);
    actionCount++;
  }

  await logger.logDryRunStep(`[${ts()}] [DRY RUN] ACTIVATION COMPLETE — ${actionCount} actions logged`);
  await logger.logDryRunStep('---');

  activeWorkspaceId = workspace.id;
  setStoreActiveWorkspaceId(workspace.id);
  sendProgress(sender, `[DRY RUN] Done — ${actionCount} actions logged`);
}

export async function deactivateWorkspace(
  sender: ProgressSender | null
): Promise<void> {
  if (isActivating) return;
  if (!activeWorkspaceId) return;

  // Find the default workspace and activate it
  // This uses smart switching (switchWorkspace) to close apps from the
  // previous workspace and apply the default workspace's system settings.
  const defaultWs = await workspaceStorage.getDefaultWorkspace();
  if (!defaultWs) {
    console.error('No default workspace found — cannot deactivate');
    return;
  }

  // If already on the default workspace, do nothing
  if (activeWorkspaceId === defaultWs.id) return;

  isActivating = true;
  try {
    // Get the current workspace to enable smart switching
    let currentWorkspace: Workspace | undefined;
    try {
      currentWorkspace = await workspaceStorage.getWorkspace(activeWorkspaceId);
    } catch {
      // If current workspace can't be read, proceed without smart close
    }

    const startTime = Date.now();
    const closingName = currentWorkspace?.name || activeWorkspaceId;
    await logger.logDeactivationStart(closingName, defaultWs.name);

    // Call internal switch — bypasses isActivating guard since we own the flag
    await switchWorkspaceInternal(defaultWs, sender, currentWorkspace, true);

    await logger.logDeactivationComplete(Date.now() - startTime);
  } finally {
    isActivating = false;
  }
}

export async function switchWorkspace(
  newWorkspace: Workspace,
  sender: ProgressSender | null,
  currentWorkspace?: Workspace
): Promise<void> {
  if (isActivating) return;
  isActivating = true;
  try {
    await switchWorkspaceInternal(newWorkspace, sender, currentWorkspace, false);
  } finally {
    isActivating = false;
  }
}

async function switchWorkspaceInternal(
  newWorkspace: Workspace,
  sender: ProgressSender | null,
  currentWorkspace?: Workspace,
  isDeactivation?: boolean
): Promise<void> {
  const dryRun = isDryRunFn();

  if (dryRun) {
    await switchWorkspaceDryRun(newWorkspace, sender, currentWorkspace);
    return;
  }

  // Pre-validate resources
  const validation = await validateResources(newWorkspace);

  // Log skipped resources
  for (const app of validation.skippedAppsToOpen) {
    await logger.logStep('OPEN APP', app.name, 'SKIPPED', `Path not found: ${app.path}`);
  }
  for (const folder of validation.skippedFolders) {
    await logger.logStep('OPEN FOLDER', folder, 'SKIPPED', 'Path not found');
  }
  if (!validation.validWallpaper) {
    await logger.logStep('SET WALLPAPER', newWorkspace.display.wallpaper || '', 'SKIPPED', 'File not found');
  }
  if (!validation.validSound) {
    await logger.logStep('PLAY SOUND', newWorkspace.audio.transitionSound || '', 'SKIPPED', 'File not found');
  }
  if (!validation.validAudioDevice) {
    await logger.logStep('SET AUDIO DEVICE', newWorkspace.system.audioDevice || '', 'SKIPPED', 'Device not found');
  }

  // Build and send overlay steps
  const overlaySteps = buildSwitchSteps(newWorkspace, validation, currentWorkspace, isDeactivation);
  sendOverlayStart(sender, newWorkspace.name, newWorkspace.icon, !!isDeactivation, overlaySteps);

  const startTime = Date.now();
  let succeeded = 0;
  let total = 0;
  let skipped = validation.skippedCount;
  let failed = 0;
  let closeIndex = 0;

  await logger.logActivationStart(newWorkspace.name);

  if (currentWorkspace) {
    // Close apps that are in old workspace but NOT in new workspace
    const newOpenPaths = new Set(
      newWorkspace.apps.open.map((a) => a.path.toLowerCase())
    );
    for (const app of currentWorkspace.apps.open) {
      if (!newOpenPaths.has(app.path.toLowerCase())) {
        total++;
        const stepId = `close-${closeIndex}`;
        closeIndex++;
        try {
          const processName = getProcessName(app.path);
          sendProgress(sender, `Closing ${app.name}...`);
          sendOverlayStep(sender, stepId, 'in-progress');
          await processManager.closeApp(processName);
          await logger.logStep('CLOSE APP', processName, 'SUCCESS');
          sendOverlayStep(sender, stepId, 'success');
          succeeded++;
        } catch (err) {
          sendProgress(sender, `Failed to close ${app.name}, continuing...`);
          console.error(`Close app error (${app.name}):`, err);
          await logger.logStep('CLOSE APP', getProcessName(app.path), 'FAILED', err instanceof Error ? err.message : String(err));
          sendOverlayStep(sender, stepId, 'failed', err instanceof Error ? err.message : String(err));
          failed++;
        }
      }
    }
  }

  // Process new workspace's close list
  for (const app of newWorkspace.apps.close) {
    total++;
    const stepId = `close-${closeIndex}`;
    closeIndex++;
    try {
      const processName = getProcessName(app.path, app.name);
      sendProgress(sender, `Closing ${app.name}...`);
      sendOverlayStep(sender, stepId, 'in-progress');
      await processManager.closeApp(processName);
      await logger.logStep('CLOSE APP', processName, 'SUCCESS');
      sendOverlayStep(sender, stepId, 'success');
      succeeded++;
    } catch (err) {
      sendProgress(sender, `Failed to close ${app.name}, continuing...`);
      console.error(`Close app error (${app.name}):`, err);
      await logger.logStep('CLOSE APP', getProcessName(app.path, app.name), 'FAILED', err instanceof Error ? err.message : String(err));
      sendOverlayStep(sender, stepId, 'failed', err instanceof Error ? err.message : String(err));
      failed++;
    }
  }

  // Apply new workspace settings

  // Set wallpaper (only if valid)
  try {
    if (newWorkspace.display.wallpaper && validation.validWallpaper) {
      total++;
      sendOverlayStep(sender, 'wallpaper', 'in-progress');
      await displayController.setWallpaper(newWorkspace.display.wallpaper);
      await logger.logStep('SET WALLPAPER', newWorkspace.display.wallpaper, 'SUCCESS');
      sendOverlayStep(sender, 'wallpaper', 'success');
      succeeded++;
    }
  } catch (err) {
    sendProgress(sender, 'Failed to set wallpaper, continuing...');
    console.error('Wallpaper error:', err);
    await logger.logStep('SET WALLPAPER', newWorkspace.display.wallpaper || '', 'FAILED', err instanceof Error ? err.message : String(err));
    sendOverlayStep(sender, 'wallpaper', 'failed', err instanceof Error ? err.message : String(err));
    failed++;
  }

  // Audio (only switch device if valid)
  try {
    if (newWorkspace.system.audioDevice && validation.validAudioDevice) {
      total++;
      sendOverlayStep(sender, 'audio-device', 'in-progress');
      const audioSuccess = await audioController.setAudioDevice(newWorkspace.system.audioDevice);
      if (audioSuccess) {
        await logger.logStep('SET AUDIO DEVICE', newWorkspace.system.audioDevice, 'SUCCESS');
        sendOverlayStep(sender, 'audio-device', 'success');
      } else {
        await logger.logStep('SET AUDIO DEVICE', newWorkspace.system.audioDevice, 'FAILED', 'Verification failed after retry');
        sendOverlayStep(sender, 'audio-device', 'failed', 'Verification failed after retry');
        failed++;
      }
      succeeded++;
    }
    if (newWorkspace.system.volume !== null) {
      total++;
      sendOverlayStep(sender, 'volume', 'in-progress');
      await audioController.setVolume(newWorkspace.system.volume);
      await logger.logStep('SET VOLUME', `${newWorkspace.system.volume}%`, 'SUCCESS');
      sendOverlayStep(sender, 'volume', 'success');
      succeeded++;
    }
  } catch (err) {
    sendProgress(sender, 'Failed to set audio, continuing...');
    console.error('Audio error:', err);
    if (newWorkspace.system.audioDevice) {
      await logger.logStep('SET AUDIO DEVICE', newWorkspace.system.audioDevice, 'FAILED', err instanceof Error ? err.message : String(err));
      sendOverlayStep(sender, 'audio-device', 'failed', err instanceof Error ? err.message : String(err));
      failed++;
    }
    if (newWorkspace.system.volume !== null) {
      await logger.logStep('SET VOLUME', `${newWorkspace.system.volume}%`, 'FAILED', err instanceof Error ? err.message : String(err));
      sendOverlayStep(sender, 'volume', 'failed', err instanceof Error ? err.message : String(err));
      failed++;
    }
  }

  // Launch new apps (only valid ones)
  openedApps.clear();
  for (let i = 0; i < validation.validAppsToOpen.length; i++) {
    const app = validation.validAppsToOpen[i];
    total++;
    const stepId = `open-${i}`;
    try {
      sendOverlayStep(sender, stepId, 'in-progress');
      await processManager.launchApp(app);
      openedApps.add(app.path);
      await logger.logStep('OPEN APP', app.name, 'SUCCESS');
      sendOverlayStep(sender, stepId, 'success');
      succeeded++;
    } catch (err) {
      sendProgress(sender, `Failed to launch ${app.name}, continuing...`);
      console.error(`Launch app error (${app.name}):`, err);
      await logger.logStep('OPEN APP', app.name, 'FAILED', err instanceof Error ? err.message : String(err));
      sendOverlayStep(sender, stepId, 'failed', err instanceof Error ? err.message : String(err));
      failed++;
    }
  }

  // Close Explorer windows (if enabled), then open valid folders
  let alreadyOpenSwitchFolders: Set<string> = new Set();
  if (newWorkspace.closeFolders) {
    try {
      total++;
      sendOverlayStep(sender, 'close-folders', 'in-progress');
      const openPaths = await explorerWindows.getOpenExplorerPaths();
      alreadyOpenSwitchFolders = new Set(openPaths.map((p) => p.toLowerCase()));
      await explorerWindows.closeExplorerWindows(validation.validFolders);
      await logger.logStep('CLOSE EXPLORER WINDOWS', `keeping ${validation.validFolders.length} folders`, 'SUCCESS');
      sendOverlayStep(sender, 'close-folders', 'success');
      succeeded++;
    } catch (err) {
      console.error('Close Explorer windows error:', err);
      await logger.logStep('CLOSE EXPLORER WINDOWS', '', 'FAILED', err instanceof Error ? err.message : String(err));
      sendOverlayStep(sender, 'close-folders', 'failed', err instanceof Error ? err.message : String(err));
      failed++;
    }
  }
  for (let i = 0; i < validation.validFolders.length; i++) {
    const folder = validation.validFolders[i];
    const stepId = `folder-${i}`;
    if (alreadyOpenSwitchFolders.has(folder.toLowerCase())) {
      skipped++;
      await logger.logStep('OPEN FOLDER', folder, 'SKIPPED');
      sendOverlayStep(sender, stepId, 'skipped');
      continue;
    }
    total++;
    try {
      sendOverlayStep(sender, stepId, 'in-progress');
      await shell.openPath(folder);
      await logger.logStep('OPEN FOLDER', folder, 'SUCCESS');
      sendOverlayStep(sender, stepId, 'success');
      succeeded++;
    } catch (err) {
      console.error(`Open folder error (${folder}):`, err);
      await logger.logStep('OPEN FOLDER', folder, 'FAILED', err instanceof Error ? err.message : String(err));
      sendOverlayStep(sender, stepId, 'failed', err instanceof Error ? err.message : String(err));
      failed++;
    }
  }

  // Open URLs
  for (let i = 0; i < newWorkspace.urls.length; i++) {
    const url = newWorkspace.urls[i];
    total++;
    const stepId = `url-${i}`;
    try {
      if (isSafeUrl(url)) {
        sendOverlayStep(sender, stepId, 'in-progress');
        await shell.openExternal(url);
        await logger.logStep('OPEN URL', url, 'SUCCESS');
        sendOverlayStep(sender, stepId, 'success');
        succeeded++;
      } else {
        console.error(`Blocked unsafe URL: ${url}`);
        await logger.logStep('OPEN URL', url, 'FAILED', 'Blocked unsafe URL');
        sendOverlayStep(sender, stepId, 'failed', 'Blocked unsafe URL');
        failed++;
      }
    } catch (err) {
      console.error(`Open URL error (${url}):`, err);
      await logger.logStep('OPEN URL', url, 'FAILED', err instanceof Error ? err.message : String(err));
      sendOverlayStep(sender, stepId, 'failed', err instanceof Error ? err.message : String(err));
      failed++;
    }
  }

  // Transition sound (only if valid)
  try {
    if (newWorkspace.audio.transitionSound && sender && validation.validSound) {
      total++;
      sendOverlayStep(sender, 'sound', 'in-progress');
      soundPlayer.playSound(newWorkspace.audio.transitionSound, sender);
      await logger.logStep('PLAY SOUND', newWorkspace.audio.transitionSound, 'SUCCESS');
      sendOverlayStep(sender, 'sound', 'success');
      succeeded++;
    }
  } catch (err) {
    console.error('Transition sound error:', err);
    await logger.logStep('PLAY SOUND', newWorkspace.audio.transitionSound || '', 'FAILED', err instanceof Error ? err.message : String(err));
    sendOverlayStep(sender, 'sound', 'failed', err instanceof Error ? err.message : String(err));
    failed++;
  }

  activeWorkspaceId = newWorkspace.id;
  setStoreActiveWorkspaceId(newWorkspace.id);

  await logger.logActivationComplete(Date.now() - startTime, succeeded, total, skipped);

  // Send overlay complete
  sendOverlayComplete(sender, succeeded, total, skipped, failed);

  if (validation.skippedCount > 0) {
    sendProgress(sender, `Done (${validation.skippedCount} items skipped — check logs)`);
  } else {
    sendProgress(sender, 'Done');
  }
}

async function switchWorkspaceDryRun(
  newWorkspace: Workspace,
  sender: ProgressSender | null,
  currentWorkspace?: Workspace
): Promise<void> {
  const ts = () => new Date().toTimeString().slice(0, 8);
  let actionCount = 0;

  sendProgress(sender, '[DRY RUN] Simulating workspace switch...');

  await logger.logDryRunStep(`[${ts()}] [DRY RUN] SWITCH START — Workspace: ${newWorkspace.name}`);

  if (currentWorkspace) {
    const newOpenPaths = new Set(
      newWorkspace.apps.open.map((a) => a.path.toLowerCase())
    );
    for (const app of currentWorkspace.apps.open) {
      if (!newOpenPaths.has(app.path.toLowerCase())) {
        sendProgress(sender, `[DRY RUN] Would close ${app.name} (not in new workspace)`);
        await logger.logDryRunStep(`[${ts()}] [DRY RUN] CLOSE APP — ${getProcessName(app.path, app.name)} (not in new workspace)`);
        actionCount++;
      } else {
        await logger.logDryRunStep(`[${ts()}] [DRY RUN] KEEP APP — ${app.name} (exists in both workspaces)`);
      }
    }
  }

  for (const app of newWorkspace.apps.close) {
    sendProgress(sender, `[DRY RUN] Would close ${app.name}`);
    await logger.logDryRunStep(`[${ts()}] [DRY RUN] CLOSE APP — ${getProcessName(app.path, app.name)}`);
    actionCount++;
  }

  if (newWorkspace.display.wallpaper) {
    await logger.logDryRunStep(`[${ts()}] [DRY RUN] SET WALLPAPER — ${newWorkspace.display.wallpaper}`);
    actionCount++;
  }

  if (newWorkspace.system.audioDevice) {
    await logger.logDryRunStep(`[${ts()}] [DRY RUN] SET AUDIO DEVICE — ${newWorkspace.system.audioDevice}`);
    actionCount++;
  }

  if (newWorkspace.system.volume !== null) {
    await logger.logDryRunStep(`[${ts()}] [DRY RUN] SET VOLUME — ${newWorkspace.system.volume}%`);
    actionCount++;
  }

  for (const app of newWorkspace.apps.open) {
    sendProgress(sender, `[DRY RUN] Would launch ${app.name}`);
    await logger.logDryRunStep(`[${ts()}] [DRY RUN] OPEN APP — ${app.name}`);
    actionCount++;
  }

  if (newWorkspace.closeFolders) {
    await logger.logDryRunStep(`[${ts()}] [DRY RUN] CLOSE EXPLORER WINDOWS — keeping ${newWorkspace.folders.length} folders`);
    actionCount++;
  }

  for (const folder of newWorkspace.folders) {
    await logger.logDryRunStep(`[${ts()}] [DRY RUN] OPEN FOLDER — ${folder}`);
    actionCount++;
  }

  for (const url of newWorkspace.urls) {
    await logger.logDryRunStep(`[${ts()}] [DRY RUN] OPEN URL — ${url}`);
    actionCount++;
  }

  if (newWorkspace.audio.transitionSound) {
    await logger.logDryRunStep(`[${ts()}] [DRY RUN] PLAY SOUND — ${newWorkspace.audio.transitionSound}`);
    actionCount++;
  }

  await logger.logDryRunStep(`[${ts()}] [DRY RUN] SWITCH COMPLETE — ${actionCount} actions logged`);
  await logger.logDryRunStep('---');

  activeWorkspaceId = newWorkspace.id;
  setStoreActiveWorkspaceId(newWorkspace.id);
  sendProgress(sender, `[DRY RUN] Done — ${actionCount} actions logged`);
}
