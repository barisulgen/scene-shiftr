import { ipcMain, dialog, BrowserWindow } from 'electron';

export function registerShellHandlers(): void {
  ipcMain.handle('dialog:open-file', async (e, filters) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!win) return null;

    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: filters ?? [],
    });

    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  ipcMain.handle('dialog:open-folder', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!win) return null;

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
    });

    return result.canceled ? null : result.filePaths[0] ?? null;
  });
}
