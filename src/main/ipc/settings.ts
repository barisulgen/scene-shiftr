import { ipcMain } from 'electron';
import * as store from '../store';

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', () => store.getSettings());
  ipcMain.handle('settings:update', (_e, data) => store.updateSettings(data));
}
