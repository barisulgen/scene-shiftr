import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { registerAllHandlers } from './ipc';
import { setStorageDir, getDefaultWorkspace, createDefaultWorkspace } from './services/workspace-storage';
import { setNircmdPath } from './services/audio-controller';
import { setAssetsPath } from './services/sound-player';
import { createTray, updateTrayMenu, destroyTray } from './tray';
import { setTrayRefreshCallback } from './tray-bridge';
import { setDryRunCheck } from './services/workspace-manager';
import { ensureAudioModule } from './services/audio-controller';
import { setLogBaseDir, rotateOldLogs } from './services/logger';
import { getSettings, setActiveWorkspaceId, getActiveWorkspaceId } from './store';
import * as audioController from './services/audio-controller';
import * as displayController from './services/display-controller';

const isMinimized = process.argv.includes('--minimized');

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 960,
    height: 700,
    resizable: false,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#09090b',
    icon: join(__dirname, '../../build/icon.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  win.on('ready-to-show', () => {
    if (!isMinimized) {
      win.show();
    }
  });

  // Hide to tray instead of closing
  win.on('close', (e) => {
    e.preventDefault();
    win.hide();
  });

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer based on electron-vite CLI.
  // Load the remote URL for development or the local html file for production.
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return win;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(async () => {
  // Set app user model id for windows
  if (process.platform === 'win32') {
    app.setAppUserModelId(!app.isPackaged ? process.execPath : 'com.scene-shiftr');
  }

  // Configure service paths
  const appDataDir = join(app.getPath('appData'), 'scene-shiftr');
  setStorageDir(join(appDataDir, 'workspaces'));
  setNircmdPath(join(app.getAppPath(), 'tools', 'nircmd.exe'));
  setAssetsPath(join(app.getAppPath(), 'assets', 'sounds'));
  setLogBaseDir(join(appDataDir, 'logs'));
  setDryRunCheck(() => getSettings().dryRun);

  // Clean up old log files on app launch
  rotateOldLogs();

  // Ensure AudioDeviceCmdlets module is installed (background, non-blocking)
  ensureAudioModule();

  // Register all IPC handlers
  registerAllHandlers();

  // First-launch: ensure a default workspace exists
  try {
    const existingDefault = await getDefaultWorkspace();
    if (!existingDefault) {
      const [audioDevice, volume, wallpaper] = await Promise.all([
        audioController.getCurrentDevice().catch(() => ''),
        audioController.getVolume().catch(() => 50),
        displayController.getWallpaper().catch(() => ''),
      ]);
      const defaultWs = await createDefaultWorkspace({ audioDevice, volume, wallpaper });
      setActiveWorkspaceId(defaultWs.id);
    } else if (!getActiveWorkspaceId()) {
      // Default exists but no active workspace set — use the default
      setActiveWorkspaceId(existingDefault.id);
    }
  } catch (err) {
    console.error('Failed to initialize default workspace:', err);
  }

  // Window control handlers
  ipcMain.handle('window:minimize', (e) => {
    BrowserWindow.fromWebContents(e.sender)?.minimize();
  });
  ipcMain.handle('window:maximize', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });
  ipcMain.handle('window:close', (e) => {
    BrowserWindow.fromWebContents(e.sender)?.close();
  });
  ipcMain.handle('window:resize', (e, width: number, height: number) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (win) {
      win.setResizable(true);
      win.setSize(Math.round(width), Math.round(height));
      win.setResizable(false);
      win.center();
    }
  });

  const win = createWindow();

  // Register tray refresh callback (breaks circular dependency via tray-bridge)
  setTrayRefreshCallback(() => updateTrayMenu(win));

  // Create system tray
  await createTray(win);

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// On Windows, don't quit when all windows are closed — app lives in the tray.
// On macOS, it's common to keep the app running until the user quits explicitly.
app.on('window-all-closed', () => {
  if (process.platform !== 'win32' && process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  destroyTray();
});
