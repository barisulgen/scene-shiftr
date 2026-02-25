import { ipcMain } from 'electron';
import * as audioController from '../services/audio-controller';
import * as systemSettings from '../services/system-settings';
import * as displayController from '../services/display-controller';

export function registerSystemHandlers(): void {
  ipcMain.handle('system:get-audio-devices', () => audioController.getAudioDevices());

  ipcMain.handle('system:get-current-state', async () => {
    const [focusAssist, audioDevice, volume, wallpaper] = await Promise.all([
      systemSettings.getFocusAssist(),
      audioController.getCurrentDevice(),
      audioController.getVolume(),
      displayController.getWallpaper(),
    ]);

    return { focusAssist, audioDevice, volume, wallpaper };
  });
}
