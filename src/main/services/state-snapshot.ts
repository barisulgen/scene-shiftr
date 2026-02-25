import fs from 'fs/promises';
import path from 'path';
import { SystemSnapshot } from '../../shared/types';
import * as systemSettings from './system-settings';
import * as audioController from './audio-controller';
import * as displayController from './display-controller';

let snapshotDir = '';

export function setSnapshotDir(dir: string): void {
  snapshotDir = dir;
}

function getSnapshotPath(): string {
  return path.join(snapshotDir, 'snapshot.json');
}

export async function hasSnapshot(): Promise<boolean> {
  try {
    await fs.access(getSnapshotPath());
    return true;
  } catch {
    return false;
  }
}

export async function captureSnapshot(): Promise<void> {
  if (await hasSnapshot()) return; // Preserve original baseline

  const snapshot: SystemSnapshot = {
    capturedAt: new Date().toISOString(),
    focusAssist: await systemSettings.getFocusAssist(),
    audioDevice: await audioController.getCurrentDevice(),
    volume: await audioController.getVolume(),
    wallpaper: await displayController.getWallpaper(),
  };

  await fs.writeFile(getSnapshotPath(), JSON.stringify(snapshot, null, 2));
}

export async function restoreSnapshot(): Promise<void> {
  if (!(await hasSnapshot())) return;

  const data = await fs.readFile(getSnapshotPath(), 'utf-8');
  const snapshot: SystemSnapshot = JSON.parse(data);

  await systemSettings.setFocusAssist(snapshot.focusAssist);
  await audioController.setAudioDevice(snapshot.audioDevice);
  await audioController.setVolume(snapshot.volume);
  await displayController.setWallpaper(snapshot.wallpaper);

  await fs.unlink(getSnapshotPath());
}

export async function discardSnapshot(): Promise<void> {
  try {
    await fs.unlink(getSnapshotPath());
  } catch {
    // ignore if doesn't exist
  }
}
