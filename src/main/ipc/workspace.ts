import { ipcMain, BrowserWindow } from 'electron';
import * as storage from '../services/workspace-storage';
import * as manager from '../services/workspace-manager';
import { refreshTrayMenu } from '../tray-bridge';

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
}
