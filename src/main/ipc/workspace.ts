import { ipcMain, BrowserWindow } from 'electron';
import * as storage from '../services/workspace-storage';
import * as manager from '../services/workspace-manager';
import * as audioController from '../services/audio-controller';
import * as displayController from '../services/display-controller';
import { refreshTrayMenu } from '../tray-bridge';
import { setActiveWorkspaceId } from '../store';

export function registerWorkspaceHandlers(): void {
  ipcMain.handle('workspace:list', () => storage.listWorkspaces());
  ipcMain.handle('workspace:get', (_e, id: string) => storage.getWorkspace(id));

  ipcMain.handle('workspace:create', async (_e, data) => {
    const result = await storage.createWorkspace(data);
    refreshTrayMenu();
    return result;
  });

  ipcMain.handle('workspace:update', async (_e, id: string, data) => {
    const result = await storage.updateWorkspace(id, data);
    refreshTrayMenu();
    return result;
  });

  ipcMain.handle('workspace:delete', async (_e, id: string) => {
    await storage.deleteWorkspace(id);
    refreshTrayMenu();
  });

  ipcMain.handle('workspace:reorder', async (_e, ids: string[]) => {
    await storage.reorderWorkspaces(ids);
    refreshTrayMenu();
  });

  ipcMain.handle('workspace:activate', async (e, id: string) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    await manager.activateWorkspaceById(id, win?.webContents);
    refreshTrayMenu();
  });

  ipcMain.handle('workspace:deactivate', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    await manager.deactivateWorkspace(win?.webContents ?? null);
    refreshTrayMenu();
  });

  ipcMain.handle('workspace:reset', async () => {
    // 1. Delete all existing workspace files
    await storage.deleteAllWorkspaces();

    // 2. Read current system state
    const [audioDevice, volume, wallpaper] = await Promise.all([
      audioController.getCurrentDevice(),
      audioController.getVolume(),
      displayController.getWallpaper(),
    ]);

    // 3. Create a new default workspace
    const defaultWs = await storage.createDefaultWorkspace({
      audioDevice,
      volume,
      wallpaper,
    });

    // 4. Set it as active
    setActiveWorkspaceId(defaultWs.id);

    refreshTrayMenu();
    return defaultWs;
  });
}
