import { ipcMain, BrowserWindow } from 'electron';
import * as storage from '../services/workspace-storage';
import * as manager from '../services/workspace-manager';

export function registerWorkspaceHandlers(): void {
  ipcMain.handle('workspace:list', () => storage.listWorkspaces());
  ipcMain.handle('workspace:get', (_e, id: string) => storage.getWorkspace(id));
  ipcMain.handle('workspace:create', (_e, data) => storage.createWorkspace(data));
  ipcMain.handle('workspace:update', (_e, id: string, data) => storage.updateWorkspace(id, data));
  ipcMain.handle('workspace:delete', (_e, id: string) => storage.deleteWorkspace(id));
  ipcMain.handle('workspace:reorder', (_e, ids: string[]) => storage.reorderWorkspaces(ids));

  ipcMain.handle('workspace:activate', (e, id: string) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    return manager.activateWorkspaceById(id, win?.webContents);
  });

  ipcMain.handle('workspace:deactivate', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    return manager.deactivateWorkspace(win?.webContents ?? null);
  });
}
