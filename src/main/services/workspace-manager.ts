import { Workspace, DryRunLogEntry } from '../../shared/types';
import * as workspaceStorage from './workspace-storage';
import * as processManager from './process-manager';
import * as systemSettings from './system-settings';
import * as audioController from './audio-controller';
import * as displayController from './display-controller';
import * as soundPlayer from './sound-player';
import * as dryRunLogger from './dry-run-logger';
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
  const dryRun = isDryRunFn();

  if (dryRun) {
    await activateWorkspaceDryRun(workspace, sender);
    return;
  }

  // 1. Play transition sound
  try {
    if (workspace.audio.transitionSound && sender) {
      soundPlayer.playSound(workspace.audio.transitionSound, sender);
    }
  } catch (err) {
    console.error('Transition sound error:', err);
  }

  // 3. Close apps from close list
  for (const app of workspace.apps.close) {
    try {
      const processName = getProcessName(app.path, app.name);
      sendProgress(sender, `Closing ${app.name}...`);
      await processManager.closeApp(processName);
    } catch (err) {
      sendProgress(sender, `Failed to close ${app.name}, continuing...`);
      console.error(`Close app error (${app.name}):`, err);
    }
  }

  // 4. Set wallpaper
  try {
    if (workspace.display.wallpaper) {
      sendProgress(sender, 'Setting wallpaper...');
      await displayController.setWallpaper(workspace.display.wallpaper);
    }
  } catch (err) {
    sendProgress(sender, 'Failed to set wallpaper, continuing...');
    console.error('Wallpaper error:', err);
  }

  // 5. Apply system settings (focusAssist)
  try {
    sendProgress(sender, 'Applying system settings...');
    await systemSettings.applySystemSettings({
      focusAssist: workspace.system.focusAssist,
    });
  } catch (err) {
    sendProgress(sender, 'Failed to apply system settings, continuing...');
    console.error('System settings error:', err);
  }

  // 7. Audio device and volume
  try {
    if (workspace.system.audioDevice) {
      sendProgress(sender, `Switching audio to ${workspace.system.audioDevice}...`);
      await audioController.setAudioDevice(workspace.system.audioDevice);
    }
    if (workspace.system.volume !== null) {
      await audioController.setVolume(workspace.system.volume);
    }
  } catch (err) {
    sendProgress(sender, 'Failed to set audio, continuing...');
    console.error('Audio error:', err);
  }

  // 8. Launch apps from open list
  openedApps.clear();
  for (const app of workspace.apps.open) {
    try {
      sendProgress(sender, `Launching ${app.name}...`);
      await processManager.launchApp(app);
      openedApps.add(app.path);
    } catch (err) {
      sendProgress(sender, `Failed to launch ${app.name}, continuing...`);
      console.error(`Launch app error (${app.name}):`, err);
    }
  }

  // 9. Close Explorer windows (if enabled), then open folders
  let alreadyOpenFolders: Set<string> = new Set();
  if (workspace.closeFolders) {
    try {
      sendProgress(sender, 'Closing Explorer windows...');
      const openPaths = await explorerWindows.getOpenExplorerPaths();
      alreadyOpenFolders = new Set(openPaths.map((p) => p.toLowerCase()));
      await explorerWindows.closeExplorerWindows(workspace.folders);
    } catch (err) {
      console.error('Close Explorer windows error:', err);
    }
  }
  for (const folder of workspace.folders) {
    // Skip folders already open (kept open by closeExplorerWindows)
    if (alreadyOpenFolders.has(folder.toLowerCase())) continue;
    try {
      await shell.openPath(folder);
    } catch (err) {
      console.error(`Open folder error (${folder}):`, err);
    }
  }

  // 10. Open URLs
  for (const url of workspace.urls) {
    try {
      if (isSafeUrl(url)) {
        await shell.openExternal(url);
      } else {
        console.error(`Blocked unsafe URL: ${url}`);
      }
    } catch (err) {
      console.error(`Open URL error (${url}):`, err);
    }
  }

  // 11. Music — open playlist URI if set
  try {
    if (workspace.audio.playlistUri && isSafeUrl(workspace.audio.playlistUri)) {
      await shell.openExternal(workspace.audio.playlistUri);
    }
  } catch (err) {
    console.error('Music launch error:', err);
  }

  activeWorkspaceId = workspace.id;
  setStoreActiveWorkspaceId(workspace.id);
  sendProgress(sender, 'Done');
}

async function activateWorkspaceDryRun(
  workspace: Workspace,
  sender: ProgressSender | null
): Promise<void> {
  const actions: DryRunLogEntry[] = [];
  const now = () => new Date().toISOString();

  sendProgress(sender, '[DRY RUN] Simulating activation...');

  if (workspace.audio.transitionSound) {
    actions.push({ timestamp: now(), action: 'sound:play', details: { sound: workspace.audio.transitionSound } });
  }

  for (const app of workspace.apps.close) {
    sendProgress(sender, `[DRY RUN] Would close ${app.name}`);
    actions.push({ timestamp: now(), action: 'app:close', details: { name: app.name, path: app.path } });
  }

  if (workspace.display.wallpaper) {
    actions.push({ timestamp: now(), action: 'display:set-wallpaper', details: { path: workspace.display.wallpaper } });
  }

  if (workspace.system.focusAssist !== null) {
    actions.push({ timestamp: now(), action: 'system:set-focus-assist', details: { enabled: workspace.system.focusAssist } });
  }

  if (workspace.system.audioDevice) {
    actions.push({ timestamp: now(), action: 'audio:set-device', details: { device: workspace.system.audioDevice } });
  }

  if (workspace.system.volume !== null) {
    actions.push({ timestamp: now(), action: 'audio:set-volume', details: { volume: workspace.system.volume } });
  }

  for (const app of workspace.apps.open) {
    sendProgress(sender, `[DRY RUN] Would launch ${app.name}`);
    actions.push({ timestamp: now(), action: 'app:launch', details: { name: app.name, path: app.path, args: app.args || '' } });
  }

  if (workspace.closeFolders) {
    actions.push({ timestamp: now(), action: 'explorer:close-windows', details: { keepPaths: workspace.folders } });
  }

  for (const folder of workspace.folders) {
    actions.push({ timestamp: now(), action: 'shell:open-folder', details: { path: folder } });
  }

  for (const url of workspace.urls) {
    actions.push({ timestamp: now(), action: 'shell:open-url', details: { url } });
  }

  if (workspace.audio.playlistUri) {
    actions.push({ timestamp: now(), action: 'music:launch', details: { uri: workspace.audio.playlistUri } });
  }

  await dryRunLogger.logActivation(workspace.name, actions);

  activeWorkspaceId = workspace.id;
  setStoreActiveWorkspaceId(workspace.id);
  sendProgress(sender, `[DRY RUN] Done — ${actions.length} actions logged`);
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

  // Get the current workspace to enable smart switching
  let currentWorkspace: Workspace | undefined;
  try {
    currentWorkspace = await workspaceStorage.getWorkspace(activeWorkspaceId);
  } catch {
    // If current workspace can't be read, proceed without smart close
  }

  await switchWorkspace(defaultWs, sender, currentWorkspace);
}

export async function switchWorkspace(
  newWorkspace: Workspace,
  sender: ProgressSender | null,
  currentWorkspace?: Workspace
): Promise<void> {
  const dryRun = isDryRunFn();

  if (dryRun) {
    await switchWorkspaceDryRun(newWorkspace, sender, currentWorkspace);
    return;
  }

  if (currentWorkspace) {
    // Close apps that are in old workspace but NOT in new workspace
    const newOpenPaths = new Set(
      newWorkspace.apps.open.map((a) => a.path.toLowerCase())
    );
    for (const app of currentWorkspace.apps.open) {
      if (!newOpenPaths.has(app.path.toLowerCase())) {
        try {
          const processName = getProcessName(app.path);
          sendProgress(sender, `Closing ${app.name}...`);
          await processManager.closeApp(processName);
        } catch (err) {
          sendProgress(sender, `Failed to close ${app.name}, continuing...`);
          console.error(`Close app error (${app.name}):`, err);
        }
      }
    }
  }

  // Process new workspace's close list
  for (const app of newWorkspace.apps.close) {
    try {
      const processName = getProcessName(app.path, app.name);
      sendProgress(sender, `Closing ${app.name}...`);
      await processManager.closeApp(processName);
    } catch (err) {
      sendProgress(sender, `Failed to close ${app.name}, continuing...`);
      console.error(`Close app error (${app.name}):`, err);
    }
  }

  // Apply new workspace settings

  // Set wallpaper
  try {
    if (newWorkspace.display.wallpaper) {
      await displayController.setWallpaper(newWorkspace.display.wallpaper);
    }
  } catch (err) {
    sendProgress(sender, 'Failed to set wallpaper, continuing...');
    console.error('Wallpaper error:', err);
  }

  // System settings
  try {
    await systemSettings.applySystemSettings({
      focusAssist: newWorkspace.system.focusAssist,
    });
  } catch (err) {
    sendProgress(sender, 'Failed to apply system settings, continuing...');
    console.error('System settings error:', err);
  }

  // Audio
  try {
    if (newWorkspace.system.audioDevice) {
      await audioController.setAudioDevice(newWorkspace.system.audioDevice);
    }
    if (newWorkspace.system.volume !== null) {
      await audioController.setVolume(newWorkspace.system.volume);
    }
  } catch (err) {
    sendProgress(sender, 'Failed to set audio, continuing...');
    console.error('Audio error:', err);
  }

  // Launch new apps
  openedApps.clear();
  for (const app of newWorkspace.apps.open) {
    try {
      await processManager.launchApp(app);
      openedApps.add(app.path);
    } catch (err) {
      sendProgress(sender, `Failed to launch ${app.name}, continuing...`);
      console.error(`Launch app error (${app.name}):`, err);
    }
  }

  // Close Explorer windows (if enabled), then open folders
  let alreadyOpenSwitchFolders: Set<string> = new Set();
  if (newWorkspace.closeFolders) {
    try {
      const openPaths = await explorerWindows.getOpenExplorerPaths();
      alreadyOpenSwitchFolders = new Set(openPaths.map((p) => p.toLowerCase()));
      await explorerWindows.closeExplorerWindows(newWorkspace.folders);
    } catch (err) {
      console.error('Close Explorer windows error:', err);
    }
  }
  for (const folder of newWorkspace.folders) {
    if (alreadyOpenSwitchFolders.has(folder.toLowerCase())) continue;
    try {
      await shell.openPath(folder);
    } catch (err) {
      console.error(`Open folder error (${folder}):`, err);
    }
  }

  // Open URLs
  for (const url of newWorkspace.urls) {
    try {
      if (isSafeUrl(url)) {
        await shell.openExternal(url);
      } else {
        console.error(`Blocked unsafe URL: ${url}`);
      }
    } catch (err) {
      console.error(`Open URL error (${url}):`, err);
    }
  }

  // Transition sound
  try {
    if (newWorkspace.audio.transitionSound && sender) {
      soundPlayer.playSound(newWorkspace.audio.transitionSound, sender);
    }
  } catch (err) {
    console.error('Transition sound error:', err);
  }

  activeWorkspaceId = newWorkspace.id;
  setStoreActiveWorkspaceId(newWorkspace.id);
  sendProgress(sender, 'Done');
}

async function switchWorkspaceDryRun(
  newWorkspace: Workspace,
  sender: ProgressSender | null,
  currentWorkspace?: Workspace
): Promise<void> {
  const actions: DryRunLogEntry[] = [];
  const now = () => new Date().toISOString();

  sendProgress(sender, '[DRY RUN] Simulating workspace switch...');

  if (currentWorkspace) {
    const newOpenPaths = new Set(
      newWorkspace.apps.open.map((a) => a.path.toLowerCase())
    );
    for (const app of currentWorkspace.apps.open) {
      if (!newOpenPaths.has(app.path.toLowerCase())) {
        sendProgress(sender, `[DRY RUN] Would close ${app.name} (not in new workspace)`);
        actions.push({ timestamp: now(), action: 'app:close', details: { name: app.name, path: app.path, reason: 'not in new workspace' } });
      } else {
        actions.push({ timestamp: now(), action: 'app:keep-running', details: { name: app.name, path: app.path, reason: 'exists in both workspaces' } });
      }
    }
  }

  for (const app of newWorkspace.apps.close) {
    sendProgress(sender, `[DRY RUN] Would close ${app.name}`);
    actions.push({ timestamp: now(), action: 'app:close', details: { name: app.name, path: app.path } });
  }

  if (newWorkspace.display.wallpaper) {
    actions.push({ timestamp: now(), action: 'display:set-wallpaper', details: { path: newWorkspace.display.wallpaper } });
  }

  if (newWorkspace.system.focusAssist !== null) {
    actions.push({ timestamp: now(), action: 'system:set-focus-assist', details: { enabled: newWorkspace.system.focusAssist } });
  }

  if (newWorkspace.system.audioDevice) {
    actions.push({ timestamp: now(), action: 'audio:set-device', details: { device: newWorkspace.system.audioDevice } });
  }

  if (newWorkspace.system.volume !== null) {
    actions.push({ timestamp: now(), action: 'audio:set-volume', details: { volume: newWorkspace.system.volume } });
  }

  for (const app of newWorkspace.apps.open) {
    sendProgress(sender, `[DRY RUN] Would launch ${app.name}`);
    actions.push({ timestamp: now(), action: 'app:launch', details: { name: app.name, path: app.path, args: app.args || '' } });
  }

  if (newWorkspace.closeFolders) {
    actions.push({ timestamp: now(), action: 'explorer:close-windows', details: { keepPaths: newWorkspace.folders } });
  }

  for (const folder of newWorkspace.folders) {
    actions.push({ timestamp: now(), action: 'shell:open-folder', details: { path: folder } });
  }

  for (const url of newWorkspace.urls) {
    actions.push({ timestamp: now(), action: 'shell:open-url', details: { url } });
  }

  if (newWorkspace.audio.transitionSound) {
    actions.push({ timestamp: now(), action: 'sound:play', details: { sound: newWorkspace.audio.transitionSound } });
  }

  await dryRunLogger.logActivation(newWorkspace.name, actions);

  activeWorkspaceId = newWorkspace.id;
  setStoreActiveWorkspaceId(newWorkspace.id);
  sendProgress(sender, `[DRY RUN] Done — ${actions.length} actions logged`);
}
