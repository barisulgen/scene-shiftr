import { ipcMain } from 'electron';
import * as appDetector from '../services/app-detector';
import * as processManager from '../services/process-manager';

export function registerProcessHandlers(): void {
  ipcMain.handle('process:detect-apps', () => appDetector.detectInstalledApps());
  ipcMain.handle('process:is-running', (_e, name: string) => processManager.isRunning(name));
}
