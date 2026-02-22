import { ipcMain } from 'electron';
import * as displayController from '../services/display-controller';

export function registerDisplayHandlers(): void {
  ipcMain.handle('display:capture-layout', () => displayController.captureMonitorLayout());
}
