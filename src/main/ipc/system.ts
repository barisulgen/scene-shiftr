import { ipcMain } from 'electron';
import * as audioController from '../services/audio-controller';
import * as displayController from '../services/display-controller';

export function registerSystemHandlers(): void {
  ipcMain.handle('system:get-audio-devices', () => audioController.getAudioDevices());

  ipcMain.handle('system:get-current-state', async () => {
    const [audioDevice, volume, wallpaper] = await Promise.all([
      audioController.getCurrentDevice(),
      audioController.getVolume(),
      displayController.getWallpaper(),
    ]);

    return { audioDevice, volume, wallpaper };
  });
}
