import { Workspace, DryRunLogEntry } from '../../shared/types';
import * as workspaceStorage from './workspace-storage';
import * as stateSnapshot from './state-snapshot';
import * as processManager from './process-manager';
import * as systemSettings from './system-settings';
import * as audioController from './audio-controller';
import * as displayController from './display-controller';
import * as soundPlayer from './sound-player';
import * as dryRunLogger from './dry-run-logger';
import { shell } from 'electron';

// In-memory state
let activeWorkspaceId: string | null = null;
let openedApps: Set<string> = new Set(); // paths of apps opened by current workspace

// Dry run check — injected so it's testable without requiring electron-store
let isDryRunFn: () => boolean = () => false;

export function setDryRunCheck(fn: () => boolean): void {
  isDryRunFn = fn;
}

type ProgressSender = { send: (channel: string, ...args: unknown[]) => void };

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

  // 1. Capture snapshot (only on first activation — captureSnapshot itself guards against overwrites)
  try {
    sendProgress(sender, 'Saving current state...');
    await stateSnapshot.captureSnapshot();
  } catch (err) {
    sendProgress(sender, 'Failed to save current state, continuing...');
    console.error('Snapshot capture error:', err);
  }

  // 2. Play transition sound
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
      const processName = app.path.split('\\').pop() || app.name;
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

  // 5. Restore monitor layout
  try {
    if (workspace.display.monitorLayout) {
      sendProgress(sender, 'Restoring monitor layout...');
      await displayController.restoreMonitorLayout(workspace.display.monitorLayout);
    }
  } catch (err) {
    sendProgress(sender, 'Failed to restore monitor layout, continuing...');
    console.error('Monitor layout error:', err);
  }

  // 6. Apply system settings (nightLight, focusAssist)
  try {
    sendProgress(sender, 'Applying system settings...');
    await systemSettings.applySystemSettings({
      nightLight: workspace.system.nightLight,
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

  // 9. Open folders
  for (const folder of workspace.folders) {
    try {
      shell.openPath(folder);
    } catch (err) {
      console.error(`Open folder error (${folder}):`, err);
    }
  }

  // 10. Open URLs
  for (const url of workspace.urls) {
    try {
      shell.openExternal(url);
    } catch (err) {
      console.error(`Open URL error (${url}):`, err);
    }
  }

  // 11. Music — open playlist URI if both musicApp and playlistUri are set
  try {
    if (workspace.audio.musicApp && workspace.audio.playlistUri) {
      shell.openExternal(workspace.audio.playlistUri);
    }
  } catch (err) {
    console.error('Music launch error:', err);
  }

  activeWorkspaceId = workspace.id;
  sendProgress(sender, 'Done');
}

async function activateWorkspaceDryRun(
  workspace: Workspace,
  sender: ProgressSender | null
): Promise<void> {
  const actions: DryRunLogEntry[] = [];
  const now = () => new Date().toISOString();

  sendProgress(sender, '[DRY RUN] Simulating activation...');

  actions.push({ timestamp: now(), action: 'snapshot:capture', details: { skipped: true, reason: 'dry run' } });

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

  if (workspace.display.monitorLayout) {
    actions.push({ timestamp: now(), action: 'display:restore-monitor-layout', details: { monitors: workspace.display.monitorLayout.monitors.length } });
  }

  if (workspace.system.nightLight !== null) {
    actions.push({ timestamp: now(), action: 'system:set-night-light', details: { enabled: workspace.system.nightLight } });
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

  for (const folder of workspace.folders) {
    actions.push({ timestamp: now(), action: 'shell:open-folder', details: { path: folder } });
  }

  for (const url of workspace.urls) {
    actions.push({ timestamp: now(), action: 'shell:open-url', details: { url } });
  }

  if (workspace.audio.musicApp && workspace.audio.playlistUri) {
    actions.push({ timestamp: now(), action: 'music:launch', details: { app: workspace.audio.musicApp, uri: workspace.audio.playlistUri } });
  }

  await dryRunLogger.logActivation(workspace.name, actions);

  activeWorkspaceId = workspace.id;
  sendProgress(sender, `[DRY RUN] Done — ${actions.length} actions logged`);
}

export async function deactivateWorkspace(
  sender: ProgressSender | null
): Promise<void> {
  if (!activeWorkspaceId) return;

  const dryRun = isDryRunFn();

  if (dryRun) {
    await deactivateWorkspaceDryRun(sender);
    return;
  }

  // Close apps that were opened by the workspace
  for (const appPath of openedApps) {
    try {
      const processName = appPath.split('\\').pop() || '';
      sendProgress(sender, `Closing ${processName}...`);
      await processManager.closeApp(processName);
    } catch (err) {
      console.error(`Close app error (${appPath}):`, err);
    }
  }

  // Restore snapshot
  try {
    sendProgress(sender, 'Restoring previous state...');
    await stateSnapshot.restoreSnapshot();
  } catch (err) {
    sendProgress(sender, 'Failed to restore previous state, continuing...');
    console.error('Snapshot restore error:', err);
  }

  openedApps.clear();
  activeWorkspaceId = null;
  sendProgress(sender, 'Done');
}

async function deactivateWorkspaceDryRun(
  sender: ProgressSender | null
): Promise<void> {
  const actions: DryRunLogEntry[] = [];
  const now = () => new Date().toISOString();

  sendProgress(sender, '[DRY RUN] Simulating deactivation...');

  for (const appPath of openedApps) {
    const processName = appPath.split('\\').pop() || '';
    sendProgress(sender, `[DRY RUN] Would close ${processName}`);
    actions.push({ timestamp: now(), action: 'app:close', details: { path: appPath, process: processName } });
  }

  actions.push({ timestamp: now(), action: 'snapshot:restore', details: { skipped: true, reason: 'dry run' } });

  await dryRunLogger.logDeactivation(actions);

  openedApps.clear();
  activeWorkspaceId = null;
  sendProgress(sender, `[DRY RUN] Done — ${actions.length} actions logged`);
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
          const processName = app.path.split('\\').pop() || '';
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
      const processName = app.path.split('\\').pop() || app.name;
      sendProgress(sender, `Closing ${app.name}...`);
      await processManager.closeApp(processName);
    } catch (err) {
      sendProgress(sender, `Failed to close ${app.name}, continuing...`);
      console.error(`Close app error (${app.name}):`, err);
    }
  }

  // Apply settings (do NOT capture new snapshot — preserve original)

  // Set wallpaper
  try {
    if (newWorkspace.display.wallpaper) {
      await displayController.setWallpaper(newWorkspace.display.wallpaper);
    }
  } catch (err) {
    sendProgress(sender, 'Failed to set wallpaper, continuing...');
    console.error('Wallpaper error:', err);
  }

  // Restore monitor layout
  try {
    if (newWorkspace.display.monitorLayout) {
      await displayController.restoreMonitorLayout(newWorkspace.display.monitorLayout);
    }
  } catch (err) {
    sendProgress(sender, 'Failed to restore monitor layout, continuing...');
    console.error('Monitor layout error:', err);
  }

  // System settings
  try {
    await systemSettings.applySystemSettings({
      nightLight: newWorkspace.system.nightLight,
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

  // Open folders
  for (const folder of newWorkspace.folders) {
    try {
      shell.openPath(folder);
    } catch (err) {
      console.error(`Open folder error (${folder}):`, err);
    }
  }

  // Open URLs
  for (const url of newWorkspace.urls) {
    try {
      shell.openExternal(url);
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

  if (newWorkspace.display.monitorLayout) {
    actions.push({ timestamp: now(), action: 'display:restore-monitor-layout', details: { monitors: newWorkspace.display.monitorLayout.monitors.length } });
  }

  if (newWorkspace.system.nightLight !== null) {
    actions.push({ timestamp: now(), action: 'system:set-night-light', details: { enabled: newWorkspace.system.nightLight } });
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
  sendProgress(sender, `[DRY RUN] Done — ${actions.length} actions logged`);
}
