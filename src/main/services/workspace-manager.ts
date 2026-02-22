import { Workspace } from '../../shared/types';
import * as workspaceStorage from './workspace-storage';
import * as stateSnapshot from './state-snapshot';
import * as processManager from './process-manager';
import * as systemSettings from './system-settings';
import * as audioController from './audio-controller';
import * as displayController from './display-controller';
import * as soundPlayer from './sound-player';
import { shell } from 'electron';

// In-memory state
let activeWorkspaceId: string | null = null;
let openedApps: Set<string> = new Set(); // paths of apps opened by current workspace

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
  // 1. Capture snapshot (only on first activation — captureSnapshot itself guards against overwrites)
  sendProgress(sender, 'Saving current state...');
  await stateSnapshot.captureSnapshot();

  // 2. Play transition sound
  if (workspace.audio.transitionSound && sender) {
    soundPlayer.playSound(workspace.audio.transitionSound, sender);
  }

  // 3. Close apps from close list
  for (const app of workspace.apps.close) {
    const processName = app.path.split('\\').pop() || app.name;
    sendProgress(sender, `Closing ${app.name}...`);
    await processManager.closeApp(processName);
  }

  // 4. Set wallpaper
  if (workspace.display.wallpaper) {
    sendProgress(sender, 'Setting wallpaper...');
    await displayController.setWallpaper(workspace.display.wallpaper);
  }

  // 5. Restore monitor layout
  if (workspace.display.monitorLayout) {
    sendProgress(sender, 'Restoring monitor layout...');
    await displayController.restoreMonitorLayout(workspace.display.monitorLayout);
  }

  // 6. Apply system settings (nightLight, focusAssist)
  sendProgress(sender, 'Applying system settings...');
  await systemSettings.applySystemSettings({
    nightLight: workspace.system.nightLight,
    focusAssist: workspace.system.focusAssist,
  });

  // 7. Audio device and volume
  if (workspace.system.audioDevice) {
    sendProgress(sender, `Switching audio to ${workspace.system.audioDevice}...`);
    await audioController.setAudioDevice(workspace.system.audioDevice);
  }
  if (workspace.system.volume !== null) {
    await audioController.setVolume(workspace.system.volume);
  }

  // 8. Launch apps from open list
  openedApps.clear();
  for (const app of workspace.apps.open) {
    sendProgress(sender, `Launching ${app.name}...`);
    await processManager.launchApp(app);
    openedApps.add(app.path);
  }

  // 9. Open folders
  for (const folder of workspace.folders) {
    shell.openPath(folder);
  }

  // 10. Open URLs
  for (const url of workspace.urls) {
    shell.openExternal(url);
  }

  // 11. Music — open playlist URI if both musicApp and playlistUri are set
  if (workspace.audio.musicApp && workspace.audio.playlistUri) {
    shell.openExternal(workspace.audio.playlistUri);
  }

  activeWorkspaceId = workspace.id;
  sendProgress(sender, 'Done');
}

export async function deactivateWorkspace(
  sender: ProgressSender | null
): Promise<void> {
  if (!activeWorkspaceId) return;

  // Close apps that were opened by the workspace
  for (const appPath of openedApps) {
    const processName = appPath.split('\\').pop() || '';
    sendProgress(sender, `Closing ${processName}...`);
    await processManager.closeApp(processName);
  }

  // Restore snapshot
  sendProgress(sender, 'Restoring previous state...');
  await stateSnapshot.restoreSnapshot();

  openedApps.clear();
  activeWorkspaceId = null;
  sendProgress(sender, 'Done');
}

export async function switchWorkspace(
  newWorkspace: Workspace,
  sender: ProgressSender | null,
  currentWorkspace?: Workspace
): Promise<void> {
  if (currentWorkspace) {
    // Close apps that are in old workspace but NOT in new workspace
    const newOpenPaths = new Set(
      newWorkspace.apps.open.map((a) => a.path.toLowerCase())
    );
    for (const app of currentWorkspace.apps.open) {
      if (!newOpenPaths.has(app.path.toLowerCase())) {
        const processName = app.path.split('\\').pop() || '';
        sendProgress(sender, `Closing ${app.name}...`);
        await processManager.closeApp(processName);
      }
    }
  }

  // Process new workspace's close list
  for (const app of newWorkspace.apps.close) {
    const processName = app.path.split('\\').pop() || app.name;
    sendProgress(sender, `Closing ${app.name}...`);
    await processManager.closeApp(processName);
  }

  // Apply settings (do NOT capture new snapshot — preserve original)

  // Set wallpaper
  if (newWorkspace.display.wallpaper) {
    await displayController.setWallpaper(newWorkspace.display.wallpaper);
  }

  // Restore monitor layout
  if (newWorkspace.display.monitorLayout) {
    await displayController.restoreMonitorLayout(newWorkspace.display.monitorLayout);
  }

  // System settings
  await systemSettings.applySystemSettings({
    nightLight: newWorkspace.system.nightLight,
    focusAssist: newWorkspace.system.focusAssist,
  });

  // Audio
  if (newWorkspace.system.audioDevice) {
    await audioController.setAudioDevice(newWorkspace.system.audioDevice);
  }
  if (newWorkspace.system.volume !== null) {
    await audioController.setVolume(newWorkspace.system.volume);
  }

  // Launch new apps
  openedApps.clear();
  for (const app of newWorkspace.apps.open) {
    await processManager.launchApp(app);
    openedApps.add(app.path);
  }

  // Open folders
  for (const folder of newWorkspace.folders) {
    shell.openPath(folder);
  }

  // Open URLs
  for (const url of newWorkspace.urls) {
    shell.openExternal(url);
  }

  // Transition sound
  if (newWorkspace.audio.transitionSound && sender) {
    soundPlayer.playSound(newWorkspace.audio.transitionSound, sender);
  }

  activeWorkspaceId = newWorkspace.id;
  sendProgress(sender, 'Done');
}
