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

export async function deactivateWorkspace(
  sender: ProgressSender | null
): Promise<void> {
  if (!activeWorkspaceId) return;

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
