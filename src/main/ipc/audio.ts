import { ipcMain, BrowserWindow } from 'electron';
import * as soundPlayer from '../services/sound-player';

export function registerAudioHandlers(): void {
  ipcMain.handle('audio:preview-sound', (e, soundId: string) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (win) {
      soundPlayer.playSound(soundId, win.webContents);
    }
  });
}
