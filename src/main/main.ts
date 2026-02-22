import { app, shell, BrowserWindow } from 'electron';
import { join } from 'path';
import { registerAllHandlers } from './ipc';
import { setStorageDir } from './services/workspace-storage';
import { setSnapshotDir } from './services/state-snapshot';
import { setNircmdPath } from './services/audio-controller';
import { setAssetsPath } from './services/sound-player';

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#09090b',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer based on electron-vite CLI.
  // Load the remote URL for development or the local html file for production.
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  // Set app user model id for windows
  if (process.platform === 'win32') {
    app.setAppUserModelId(!app.isPackaged ? process.execPath : 'com.scene-shiftr');
  }

  // Configure service paths
  const appDataDir = join(app.getPath('appData'), 'scene-shiftr');
  setStorageDir(join(appDataDir, 'workspaces'));
  setSnapshotDir(appDataDir);
  setNircmdPath(join(app.getAppPath(), 'tools', 'nircmd.exe'));
  setAssetsPath(join(app.getAppPath(), 'assets', 'sounds'));

  // Register all IPC handlers
  registerAllHandlers();

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// On Windows, don't quit when all windows are closed — we'll add tray support later.
// On macOS, it's common to keep the app running until the user quits explicitly.
app.on('window-all-closed', () => {
  if (process.platform !== 'win32' && process.platform !== 'darwin') {
    app.quit();
  }
});
