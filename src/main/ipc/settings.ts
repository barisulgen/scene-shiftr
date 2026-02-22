import { ipcMain, app } from 'electron';
import * as store from '../store';

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', () => store.getSettings());

  ipcMain.handle('settings:update', (_e, data) => {
    const updated = store.updateSettings(data);

    // Sync the OS login-item setting when startWithWindows changes
    if ('startWithWindows' in data) {
      app.setLoginItemSettings({
        openAtLogin: data.startWithWindows as boolean,
        args: ['--minimized'],
      });
    }

    return updated;
  });
}
