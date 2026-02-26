import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// nircmd path — kept for volume control only
let nircmdPath = 'nircmd.exe';

export function setNircmdPath(p: string): void {
  nircmdPath = p;
}

export interface AudioDevice {
  id: string;
  name: string;
}

/**
 * Ensures AudioDeviceCmdlets module is installed.
 * Runs once at startup — installs to CurrentUser scope if missing.
 */
export async function ensureAudioModule(): Promise<void> {
  try {
    await execAsync(
      'powershell -NoProfile -Command "if (!(Get-Module -ListAvailable -Name AudioDeviceCmdlets)) { Install-Module -Name AudioDeviceCmdlets -Force -Scope CurrentUser }"'
    );
  } catch {
    // Module might already exist or install might fail — best effort
  }
}

/**
 * Returns active playback devices using AudioDeviceCmdlets.
 * Each device has an `id` and `name`.
 */
export async function getAudioDevices(): Promise<AudioDevice[]> {
  try {
    const { stdout } = await execAsync(
      'powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-AudioDevice -List | Where-Object Type -eq \'Playback\' | ForEach-Object { $_.ID + \'||\' + $_.Name }"',
      { maxBuffer: 1024 * 1024 }
    );
    return stdout
      .trim()
      .split('\n')
      .map((line) => {
        const parts = line.trim().split('||');
        if (parts.length >= 2) {
          return { id: parts[0], name: parts.slice(1).join('||') };
        }
        return null;
      })
      .filter((d): d is AudioDevice => d !== null && d.id.length > 0);
  } catch {
    return [];
  }
}

/**
 * Returns the currently active playback device name.
 */
export async function getCurrentDevice(): Promise<string> {
  try {
    const { stdout } = await execAsync(
      'powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; (Get-AudioDevice -Playback).Name"'
    );
    return stdout.trim();
  } catch {
    return '';
  }
}

/**
 * Sets the default audio device by ID using AudioDeviceCmdlets.
 * Returns true if the switch was confirmed, false if verification failed.
 */
export async function setAudioDevice(deviceId: string): Promise<boolean> {
  try {
    await execAsync(
      `powershell -NoProfile -Command "Set-AudioDevice -ID '${deviceId.replace(/'/g, "''")}'"`,
    );

    // Wait 500ms for the switch to take effect
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify the switch worked
    const currentDevice = await getCurrentDevice();
    const devices = await getAudioDevices();
    const targetDevice = devices.find(d => d.id === deviceId);

    if (targetDevice && currentDevice === targetDevice.name) {
      return true; // Switch confirmed
    }

    // Retry once
    await execAsync(
      `powershell -NoProfile -Command "Set-AudioDevice -ID '${deviceId.replace(/'/g, "''")}'"`,
    );
    await new Promise(resolve => setTimeout(resolve, 500));

    const retryDevice = await getCurrentDevice();
    return targetDevice ? retryDevice === targetDevice.name : false;
  } catch {
    return false;
  }
}

export async function getVolume(): Promise<number> {
  try {
    const { stdout } = await execAsync(
      'powershell -NoProfile -Command "(Get-AudioDevice -PlaybackVolume)"'
    );
    const vol = parseInt(stdout.trim(), 10);
    return isNaN(vol) ? 50 : vol;
  } catch {
    return 50;
  }
}

export async function setVolume(level: number): Promise<void> {
  try {
    // nircmd uses 0-65535 range — kept for volume since it's fast and encoding doesn't matter
    const nircmdLevel = Math.round(level * 655.35);
    await execAsync(`"${nircmdPath}" setsysvolume ${nircmdLevel}`);
  } catch {
    // Best effort
  }
}
