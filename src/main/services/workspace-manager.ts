import { Workspace } from '../../shared/types';
import * as workspaceStorage from './workspace-storage';
import * as processManager from './process-manager';
import * as systemSettings from './system-settings';
import * as audioController from './audio-controller';
import * as displayController from './display-controller';
import * as soundPlayer from './sound-player';
import * as logger from './logger';
import * as explorerWindows from './explorer-windows';
import { shell } from 'electron';
import { setActiveWorkspaceId as setStoreActiveWorkspaceId } from '../store';

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

export function getActiveWorkspaceId(): string | null {
  return activeWorkspaceId;
}

export async function activateWorkspaceById(
  id: string,
  sender?: ProgressSender
): Promise<void> {
  const workspace = await workspaceStorage.getWorkspace(id);
  await activateWorkspace(workspace, sender ?? null);
}

export async function activateWorkspace(
  workspace: Workspace,
  sender: ProgressSender | null
): Promise<void> {
  isActivating = true;
  try {
  const dryRun = isDryRunFn();

  if (dryRun) {
    await activateWorkspaceDryRun(workspace, sender);
    return;
  }

  const startTime = Date.now();
  let succeeded = 0;
  let total = 0;
  let skipped = 0;

  await logger.logActivationStart(workspace.name);

  // 1. Play transition sound
  try {
    if (workspace.audio.transitionSound && sender) {
      total++;
      soundPlayer.playSound(workspace.audio.transitionSound, sender);
      await logger.logStep('PLAY SOUND', workspace.audio.transitionSound, 'SUCCESS');
      succeeded++;
    }
  } catch (err) {
    console.error('Transition sound error:', err);
    await logger.logStep('PLAY SOUND', workspace.audio.transitionSound || '', 'FAILED', err instanceof Error ? err.message : String(err));
  }

  // 3. Close apps from close list
  for (const app of workspace.apps.close) {
    total++;
    try {
      const processName = getProcessName(app.path, app.name);
      sendProgress(sender, `Closing ${app.name}...`);
      await processManager.closeApp(processName);
      await logger.logStep('CLOSE APP', processName, 'SUCCESS');
      succeeded++;
    } catch (err) {
      sendProgress(sender, `Failed to close ${app.name}, continuing...`);
      console.error(`Close app error (${app.name}):`, err);
      await logger.logStep('CLOSE APP', getProcessName(app.path, app.name), 'FAILED', err instanceof Error ? err.message : String(err));
    }
  }

  // 4. Set wallpaper
  try {
    if (workspace.display.wallpaper) {
      total++;
      sendProgress(sender, 'Setting wallpaper...');
      await displayController.setWallpaper(workspace.display.wallpaper);
      await logger.logStep('SET WALLPAPER', workspace.display.wallpaper, 'SUCCESS');
      succeeded++;
    }
  } catch (err) {
    sendProgress(sender, 'Failed to set wallpaper, continuing...');
    console.error('Wallpaper error:', err);
    await logger.logStep('SET WALLPAPER', workspace.display.wallpaper || '', 'FAILED', err instanceof Error ? err.message : String(err));
  }

  // 5. Apply system settings (focusAssist)
  try {
    total++;
    sendProgress(sender, 'Applying system settings...');
    await systemSettings.applySystemSettings({
      focusAssist: workspace.system.focusAssist,
    });
    if (workspace.system.focusAssist !== null) {
      await logger.logStep('SET FOCUS ASSIST', workspace.system.focusAssist ? 'on' : 'off', 'SUCCESS');
    } else {
      skipped++;
      await logger.logStep('SET FOCUS ASSIST', 'null', 'SKIPPED');
    }
    succeeded++;
  } catch (err) {
    sendProgress(sender, 'Failed to apply system settings, continuing...');
    console.error('System settings error:', err);
    await logger.logStep('SET FOCUS ASSIST', workspace.system.focusAssist !== null ? (workspace.system.focusAssist ? 'on' : 'off') : 'null', 'FAILED', err instanceof Error ? err.message : String(err));
  }

  // 7. Audio device and volume
  try {
    if (workspace.system.audioDevice) {
      total++;
      sendProgress(sender, `Switching audio to ${workspace.system.audioDevice}...`);
      await audioController.setAudioDevice(workspace.system.audioDevice);
      await logger.logStep('SET AUDIO DEVICE', workspace.system.audioDevice, 'SUCCESS');
      succeeded++;
    }
    if (workspace.system.volume !== null) {
      total++;
      await audioController.setVolume(workspace.system.volume);
      await logger.logStep('SET VOLUME', `${workspace.system.volume}%`, 'SUCCESS');
      succeeded++;
    }
  } catch (err) {
    sendProgress(sender, 'Failed to set audio, continuing...');
    console.error('Audio error:', err);
    if (workspace.system.audioDevice) {
      await logger.logStep('SET AUDIO DEVICE', workspace.system.audioDevice, 'FAILED', err instanceof Error ? err.message : String(err));
    }
    if (workspace.system.volume !== null) {
      await logger.logStep('SET VOLUME', `${workspace.system.volume}%`, 'FAILED', err instanceof Error ? err.message : String(err));
    }
  }

  // 8. Launch apps from open list
  openedApps.clear();
  for (const app of workspace.apps.open) {
    total++;
    try {
      sendProgress(sender, `Launching ${app.name}...`);
      await processManager.launchApp(app);
      openedApps.add(app.path);
      await logger.logStep('OPEN APP', app.name, 'SUCCESS');
      succeeded++;
    } catch (err) {
      sendProgress(sender, `Failed to launch ${app.name}, continuing...`);
      console.error(`Launch app error (${app.name}):`, err);
      await logger.logStep('OPEN APP', app.name, 'FAILED', err instanceof Error ? err.message : String(err));
    }
  }

  // 9. Close Explorer windows (if enabled), then open folders
  let alreadyOpenFolders: Set<string> = new Set();
  if (workspace.closeFolders) {
    try {
      total++;
      sendProgress(sender, 'Closing Explorer windows...');
      const openPaths = await explorerWindows.getOpenExplorerPaths();
      alreadyOpenFolders = new Set(openPaths.map((p) => p.toLowerCase()));
      await explorerWindows.closeExplorerWindows(workspace.folders);
      await logger.logStep('CLOSE EXPLORER WINDOWS', `keeping ${workspace.folders.length} folders`, 'SUCCESS');
      succeeded++;
    } catch (err) {
      console.error('Close Explorer windows error:', err);
      await logger.logStep('CLOSE EXPLORER WINDOWS', '', 'FAILED', err instanceof Error ? err.message : String(err));
    }
  }
  for (const folder of workspace.folders) {
    // Skip folders already open (kept open by closeExplorerWindows)
    if (alreadyOpenFolders.has(folder.toLowerCase())) {
      skipped++;
      await logger.logStep('OPEN FOLDER', folder, 'SKIPPED');
      continue;
    }
    total++;
    try {
      await shell.openPath(folder);
      await logger.logStep('OPEN FOLDER', folder, 'SUCCESS');
      succeeded++;
    } catch (err) {
      console.error(`Open folder error (${folder}):`, err);
      await logger.logStep('OPEN FOLDER', folder, 'FAILED', err instanceof Error ? err.message : String(err));
    }
  }

  // 10. Open URLs
  for (const url of workspace.urls) {
    total++;
    try {
      if (isSafeUrl(url)) {
        await shell.openExternal(url);
        await logger.logStep('OPEN URL', url, 'SUCCESS');
        succeeded++;
      } else {
        console.error(`Blocked unsafe URL: ${url}`);
        await logger.logStep('OPEN URL', url, 'FAILED', 'Blocked unsafe URL');
      }
    } catch (err) {
      console.error(`Open URL error (${url}):`, err);
      await logger.logStep('OPEN URL', url, 'FAILED', err instanceof Error ? err.message : String(err));
    }
  }

  // 11. Music — open playlist URI if set
  try {
    if (workspace.audio.playlistUri && isSafeUrl(workspace.audio.playlistUri)) {
      total++;
      await shell.openExternal(workspace.audio.playlistUri);
      await logger.logStep('LAUNCH MUSIC', workspace.audio.playlistUri, 'SUCCESS');
      succeeded++;
    }
  } catch (err) {
    console.error('Music launch error:', err);
    await logger.logStep('LAUNCH MUSIC', workspace.audio.playlistUri || '', 'FAILED', err instanceof Error ? err.message : String(err));
  }

  activeWorkspaceId = workspace.id;
  setStoreActiveWorkspaceId(workspace.id);

  await logger.logActivationComplete(Date.now() - startTime, succeeded, total, skipped);

  sendProgress(sender, 'Done');
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

  if (workspace.system.focusAssist !== null) {
    await logger.logDryRunStep(`[${ts()}] [DRY RUN] SET FOCUS ASSIST — ${workspace.system.focusAssist ? 'on' : 'off'}`);
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

    await switchWorkspace(defaultWs, sender, currentWorkspace);

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
  isActivating = true;
  try {
  const dryRun = isDryRunFn();

  if (dryRun) {
    await switchWorkspaceDryRun(newWorkspace, sender, currentWorkspace);
    return;
  }

  const startTime = Date.now();
  let succeeded = 0;
  let total = 0;
  let skipped = 0;

  await logger.logActivationStart(newWorkspace.name);

  if (currentWorkspace) {
    // Close apps that are in old workspace but NOT in new workspace
    const newOpenPaths = new Set(
      newWorkspace.apps.open.map((a) => a.path.toLowerCase())
    );
    for (const app of currentWorkspace.apps.open) {
      if (!newOpenPaths.has(app.path.toLowerCase())) {
        total++;
        try {
          const processName = getProcessName(app.path);
          sendProgress(sender, `Closing ${app.name}...`);
          await processManager.closeApp(processName);
          await logger.logStep('CLOSE APP', processName, 'SUCCESS');
          succeeded++;
        } catch (err) {
          sendProgress(sender, `Failed to close ${app.name}, continuing...`);
          console.error(`Close app error (${app.name}):`, err);
          await logger.logStep('CLOSE APP', getProcessName(app.path), 'FAILED', err instanceof Error ? err.message : String(err));
        }
      }
    }
  }

  // Process new workspace's close list
  for (const app of newWorkspace.apps.close) {
    total++;
    try {
      const processName = getProcessName(app.path, app.name);
      sendProgress(sender, `Closing ${app.name}...`);
      await processManager.closeApp(processName);
      await logger.logStep('CLOSE APP', processName, 'SUCCESS');
      succeeded++;
    } catch (err) {
      sendProgress(sender, `Failed to close ${app.name}, continuing...`);
      console.error(`Close app error (${app.name}):`, err);
      await logger.logStep('CLOSE APP', getProcessName(app.path, app.name), 'FAILED', err instanceof Error ? err.message : String(err));
    }
  }

  // Apply new workspace settings

  // Set wallpaper
  try {
    if (newWorkspace.display.wallpaper) {
      total++;
      await displayController.setWallpaper(newWorkspace.display.wallpaper);
      await logger.logStep('SET WALLPAPER', newWorkspace.display.wallpaper, 'SUCCESS');
      succeeded++;
    }
  } catch (err) {
    sendProgress(sender, 'Failed to set wallpaper, continuing...');
    console.error('Wallpaper error:', err);
    await logger.logStep('SET WALLPAPER', newWorkspace.display.wallpaper || '', 'FAILED', err instanceof Error ? err.message : String(err));
  }

  // System settings
  try {
    total++;
    await systemSettings.applySystemSettings({
      focusAssist: newWorkspace.system.focusAssist,
    });
    if (newWorkspace.system.focusAssist !== null) {
      await logger.logStep('SET FOCUS ASSIST', newWorkspace.system.focusAssist ? 'on' : 'off', 'SUCCESS');
    } else {
      skipped++;
      await logger.logStep('SET FOCUS ASSIST', 'null', 'SKIPPED');
    }
    succeeded++;
  } catch (err) {
    sendProgress(sender, 'Failed to apply system settings, continuing...');
    console.error('System settings error:', err);
    await logger.logStep('SET FOCUS ASSIST', newWorkspace.system.focusAssist !== null ? (newWorkspace.system.focusAssist ? 'on' : 'off') : 'null', 'FAILED', err instanceof Error ? err.message : String(err));
  }

  // Audio
  try {
    if (newWorkspace.system.audioDevice) {
      total++;
      await audioController.setAudioDevice(newWorkspace.system.audioDevice);
      await logger.logStep('SET AUDIO DEVICE', newWorkspace.system.audioDevice, 'SUCCESS');
      succeeded++;
    }
    if (newWorkspace.system.volume !== null) {
      total++;
      await audioController.setVolume(newWorkspace.system.volume);
      await logger.logStep('SET VOLUME', `${newWorkspace.system.volume}%`, 'SUCCESS');
      succeeded++;
    }
  } catch (err) {
    sendProgress(sender, 'Failed to set audio, continuing...');
    console.error('Audio error:', err);
    if (newWorkspace.system.audioDevice) {
      await logger.logStep('SET AUDIO DEVICE', newWorkspace.system.audioDevice, 'FAILED', err instanceof Error ? err.message : String(err));
    }
    if (newWorkspace.system.volume !== null) {
      await logger.logStep('SET VOLUME', `${newWorkspace.system.volume}%`, 'FAILED', err instanceof Error ? err.message : String(err));
    }
  }

  // Launch new apps
  openedApps.clear();
  for (const app of newWorkspace.apps.open) {
    total++;
    try {
      await processManager.launchApp(app);
      openedApps.add(app.path);
      await logger.logStep('OPEN APP', app.name, 'SUCCESS');
      succeeded++;
    } catch (err) {
      sendProgress(sender, `Failed to launch ${app.name}, continuing...`);
      console.error(`Launch app error (${app.name}):`, err);
      await logger.logStep('OPEN APP', app.name, 'FAILED', err instanceof Error ? err.message : String(err));
    }
  }

  // Close Explorer windows (if enabled), then open folders
  let alreadyOpenSwitchFolders: Set<string> = new Set();
  if (newWorkspace.closeFolders) {
    try {
      total++;
      const openPaths = await explorerWindows.getOpenExplorerPaths();
      alreadyOpenSwitchFolders = new Set(openPaths.map((p) => p.toLowerCase()));
      await explorerWindows.closeExplorerWindows(newWorkspace.folders);
      await logger.logStep('CLOSE EXPLORER WINDOWS', `keeping ${newWorkspace.folders.length} folders`, 'SUCCESS');
      succeeded++;
    } catch (err) {
      console.error('Close Explorer windows error:', err);
      await logger.logStep('CLOSE EXPLORER WINDOWS', '', 'FAILED', err instanceof Error ? err.message : String(err));
    }
  }
  for (const folder of newWorkspace.folders) {
    if (alreadyOpenSwitchFolders.has(folder.toLowerCase())) {
      skipped++;
      await logger.logStep('OPEN FOLDER', folder, 'SKIPPED');
      continue;
    }
    total++;
    try {
      await shell.openPath(folder);
      await logger.logStep('OPEN FOLDER', folder, 'SUCCESS');
      succeeded++;
    } catch (err) {
      console.error(`Open folder error (${folder}):`, err);
      await logger.logStep('OPEN FOLDER', folder, 'FAILED', err instanceof Error ? err.message : String(err));
    }
  }

  // Open URLs
  for (const url of newWorkspace.urls) {
    total++;
    try {
      if (isSafeUrl(url)) {
        await shell.openExternal(url);
        await logger.logStep('OPEN URL', url, 'SUCCESS');
        succeeded++;
      } else {
        console.error(`Blocked unsafe URL: ${url}`);
        await logger.logStep('OPEN URL', url, 'FAILED', 'Blocked unsafe URL');
      }
    } catch (err) {
      console.error(`Open URL error (${url}):`, err);
      await logger.logStep('OPEN URL', url, 'FAILED', err instanceof Error ? err.message : String(err));
    }
  }

  // Transition sound
  try {
    if (newWorkspace.audio.transitionSound && sender) {
      total++;
      soundPlayer.playSound(newWorkspace.audio.transitionSound, sender);
      await logger.logStep('PLAY SOUND', newWorkspace.audio.transitionSound, 'SUCCESS');
      succeeded++;
    }
  } catch (err) {
    console.error('Transition sound error:', err);
    await logger.logStep('PLAY SOUND', newWorkspace.audio.transitionSound || '', 'FAILED', err instanceof Error ? err.message : String(err));
  }

  activeWorkspaceId = newWorkspace.id;
  setStoreActiveWorkspaceId(newWorkspace.id);

  await logger.logActivationComplete(Date.now() - startTime, succeeded, total, skipped);

  sendProgress(sender, 'Done');
  } finally {
    isActivating = false;
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

  if (newWorkspace.system.focusAssist !== null) {
    await logger.logDryRunStep(`[${ts()}] [DRY RUN] SET FOCUS ASSIST — ${newWorkspace.system.focusAssist ? 'on' : 'off'}`);
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
