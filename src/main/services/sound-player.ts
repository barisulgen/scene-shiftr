import path from 'path';

let assetsPath = path.join(__dirname, '../../assets/sounds');

export function setAssetsPath(p: string): void {
  assetsPath = p;
}

export function resolveSoundPath(soundId: string): string {
  if (soundId.startsWith('builtin:')) {
    const name = soundId.replace('builtin:', '');
    return path.join(assetsPath, `${name}.mp3`);
  }
  return soundId; // Custom file path
}

// The actual playback happens in the renderer via HTML5 Audio API.
// The main process resolves the path and sends it to the renderer via IPC.
// This function is called by workspace-manager and sends the event.
export function playSound(soundId: string, webContents: { send: (channel: string, ...args: unknown[]) => void }): void {
  const soundPath = resolveSoundPath(soundId);
  webContents.send('play-sound', soundPath);
}
