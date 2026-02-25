import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// nircmd path — will be set at startup via setNircmdPath()
let nircmdPath = 'nircmd.exe';

export function setNircmdPath(p: string): void {
  nircmdPath = p;
}

export async function getAudioDevices(): Promise<string[]> {
  try {
    // Use PowerShell with MMDevice API to get output (render) devices only
    const { stdout } = await execAsync(
      'powershell -NoProfile -Command "Add-Type -TypeDefinition \'using System.Runtime.InteropServices; [Guid(\\"a95664d2-9614-4f35-a746-de8db63617e6\\"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IMMDeviceEnumerator { int EnumAudioEndpoints(int dataFlow, int stateMask, out IMMDeviceCollection devices); } [Guid(\\"0BD7A1BE-7A1A-44DB-8397-CC5392387B5E\\"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IMMDeviceCollection { int GetCount(out int count); }\'; Get-CimInstance -Namespace root/cimv2 -ClassName Win32_SoundDevice | Where-Object { $_.StatusInfo -eq 3 -or $_.Status -eq \'OK\' } | Select-Object -ExpandProperty Name"'
    );
    return stdout.trim().split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    // Fallback: try nircmd to list devices
    try {
      const { stdout: nircmdOut } = await execAsync(
        `"${nircmdPath}" showsounddevices render`
      );
      return nircmdOut.trim().split('\n').map((s) => s.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }
}

export async function getCurrentDevice(): Promise<string> {
  try {
    // Use PowerShell to get active audio device
    const { stdout } = await execAsync(
      'powershell -NoProfile -Command "(Get-CimInstance -Namespace root/cimv2 -ClassName Win32_SoundDevice | Where-Object { $_.Status -eq \'OK\' } | Select-Object -First 1).Name"'
    );
    return stdout.trim();
  } catch {
    return '';
  }
}

export async function setAudioDevice(name: string): Promise<void> {
  try {
    await execAsync(`"${nircmdPath}" setdefaultsounddevice "${name}"`);
  } catch {
    // Best effort
  }
}

export async function getVolume(): Promise<number> {
  try {
    const { stdout } = await execAsync(
      'powershell -NoProfile -Command "[Math]::Round((Get-AudioDevice -PlaybackVolume).Volume)"'
    );
    const vol = parseInt(stdout.trim(), 10);
    return isNaN(vol) ? 50 : vol;
  } catch {
    return 50;
  }
}

export async function setVolume(level: number): Promise<void> {
  try {
    // nircmd uses 0-65535 range
    const nircmdLevel = Math.round(level * 655.35);
    await execAsync(`"${nircmdPath}" setsysvolume ${nircmdLevel}`);
  } catch {
    // Best effort
  }
}
