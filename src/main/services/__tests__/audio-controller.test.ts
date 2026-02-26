import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

import { exec } from 'child_process';
import {
  getAudioDevices,
  getCurrentDevice,
  setAudioDevice,
  getVolume,
  setVolume,
  setNircmdPath,
} from '../audio-controller';

const mockExec = vi.mocked(exec);

// Helper to create a mock exec that resolves with stdout/stderr
function mockExecResolves(stdout: string, stderr: string = ''): void {
  mockExec.mockImplementation((_cmd: string, _opts: any, callback?: any) => {
    const cb = typeof _opts === 'function' ? _opts : callback;
    cb(null, { stdout, stderr });
    return {} as any;
  });
}

// Helper to create a mock exec that rejects with an error
function mockExecRejects(error: Error): void {
  mockExec.mockImplementation((_cmd: string, _opts: any, callback?: any) => {
    const cb = typeof _opts === 'function' ? _opts : callback;
    cb(error, { stdout: '', stderr: '' });
    return {} as any;
  });
}

describe('audio-controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setNircmdPath('nircmd.exe');
  });

  describe('getAudioDevices', () => {
    it('returns a list of audio devices with id and name parsed from PowerShell output', async () => {
      mockExecResolves(
        '{0.0.0.00000000}.{guid-1}||Realtek High Definition Audio\r\n{0.0.0.00000000}.{guid-2}||NVIDIA Virtual Audio Device\r\n{0.0.0.00000000}.{guid-3}||SteelSeries Arctis 7'
      );

      const devices = await getAudioDevices();

      expect(devices).toEqual([
        { id: '{0.0.0.00000000}.{guid-1}', name: 'Realtek High Definition Audio' },
        { id: '{0.0.0.00000000}.{guid-2}', name: 'NVIDIA Virtual Audio Device' },
        { id: '{0.0.0.00000000}.{guid-3}', name: 'SteelSeries Arctis 7' },
      ]);
    });

    it('uses PowerShell with AudioDeviceCmdlets to query audio devices', async () => {
      mockExecResolves('{0.0.0.00000000}.{guid-1}||Speaker');

      await getAudioDevices();

      expect(mockExec).toHaveBeenCalledTimes(1);
      const cmd = String(mockExec.mock.calls[0][0]);
      expect(cmd).toContain('powershell');
      expect(cmd).toContain('Get-AudioDevice');
    });

    it('filters out empty lines from the output', async () => {
      mockExecResolves('{0.0.0.00000000}.{guid-1}||Speaker\r\n\r\n{0.0.0.00000000}.{guid-2}||Headphones\r\n');

      const devices = await getAudioDevices();

      expect(devices).toEqual([
        { id: '{0.0.0.00000000}.{guid-1}', name: 'Speaker' },
        { id: '{0.0.0.00000000}.{guid-2}', name: 'Headphones' },
      ]);
    });

    it('returns an empty array when the command fails', async () => {
      mockExecRejects(new Error('Command failed'));

      const devices = await getAudioDevices();

      expect(devices).toEqual([]);
    });

    it('returns an empty array when stdout is empty', async () => {
      mockExecResolves('');

      const devices = await getAudioDevices();

      expect(devices).toEqual([]);
    });
  });

  describe('getCurrentDevice', () => {
    it('returns the name of the currently active audio device', async () => {
      mockExecResolves('Realtek High Definition Audio');

      const device = await getCurrentDevice();

      expect(device).toBe('Realtek High Definition Audio');
    });

    it('uses PowerShell with AudioDeviceCmdlets to query the active device', async () => {
      mockExecResolves('Speaker');

      await getCurrentDevice();

      expect(mockExec).toHaveBeenCalledTimes(1);
      const cmd = String(mockExec.mock.calls[0][0]);
      expect(cmd).toContain('powershell');
      expect(cmd).toContain('Get-AudioDevice');
      expect(cmd).toContain('Playback');
    });

    it('returns an empty string when the command fails', async () => {
      mockExecRejects(new Error('Command failed'));

      const device = await getCurrentDevice();

      expect(device).toBe('');
    });

    it('trims whitespace from the output', async () => {
      mockExecResolves('  Realtek High Definition Audio  \r\n');

      const device = await getCurrentDevice();

      expect(device).toBe('Realtek High Definition Audio');
    });
  });

  describe('setAudioDevice', () => {
    it('calls PowerShell Set-AudioDevice with the correct device ID and returns true on success', async () => {
      // Mock sequence: Set-AudioDevice, getCurrentDevice, getAudioDevices
      let callIndex = 0;
      mockExec.mockImplementation((_cmd: string, _opts: any, callback?: any) => {
        const cb = typeof _opts === 'function' ? _opts : callback;
        const cmd = String(_cmd);
        callIndex++;
        if (cmd.includes('Set-AudioDevice')) {
          cb(null, { stdout: '', stderr: '' });
        } else if (cmd.includes('Get-AudioDevice -Playback') && !cmd.includes('-List')) {
          cb(null, { stdout: 'Speaker\r\n', stderr: '' });
        } else if (cmd.includes('Get-AudioDevice -List')) {
          cb(null, { stdout: '{0.0.0.00000000}.{guid-1}||Speaker\r\n', stderr: '' });
        } else {
          cb(null, { stdout: '', stderr: '' });
        }
        return {} as any;
      });

      const result = await setAudioDevice('{0.0.0.00000000}.{guid-1}');

      expect(result).toBe(true);
      const firstCmd = String(mockExec.mock.calls[0][0]);
      expect(firstCmd).toContain('powershell');
      expect(firstCmd).toContain('Set-AudioDevice');
      expect(firstCmd).toContain('{0.0.0.00000000}.{guid-1}');
    });

    it('returns false when the command fails', async () => {
      mockExecRejects(new Error('Command failed'));

      const result = await setAudioDevice('{0.0.0.00000000}.{guid-1}');
      expect(result).toBe(false);
    });

    it('retries once and returns false if verification still fails', async () => {
      // Mock: Set-AudioDevice succeeds, but getCurrentDevice returns wrong device
      mockExec.mockImplementation((_cmd: string, _opts: any, callback?: any) => {
        const cb = typeof _opts === 'function' ? _opts : callback;
        const cmd = String(_cmd);
        if (cmd.includes('Set-AudioDevice')) {
          cb(null, { stdout: '', stderr: '' });
        } else if (cmd.includes('Get-AudioDevice -Playback') && !cmd.includes('-List')) {
          cb(null, { stdout: 'Wrong Device\r\n', stderr: '' });
        } else if (cmd.includes('Get-AudioDevice -List')) {
          cb(null, { stdout: '{0.0.0.00000000}.{guid-1}||Speaker\r\n', stderr: '' });
        } else {
          cb(null, { stdout: '', stderr: '' });
        }
        return {} as any;
      });

      const result = await setAudioDevice('{0.0.0.00000000}.{guid-1}');
      expect(result).toBe(false);
    });
  });

  describe('getVolume', () => {
    it('returns the current volume as a number between 0 and 100', async () => {
      mockExecResolves('75');

      const volume = await getVolume();

      expect(volume).toBe(75);
    });

    it('returns 50 when the command fails', async () => {
      mockExecRejects(new Error('Command failed'));

      const volume = await getVolume();

      expect(volume).toBe(50);
    });

    it('returns 50 when the output is not a valid number', async () => {
      mockExecResolves('not-a-number');

      const volume = await getVolume();

      expect(volume).toBe(50);
    });

    it('returns 0 when the volume is 0', async () => {
      mockExecResolves('0');

      const volume = await getVolume();

      expect(volume).toBe(0);
    });

    it('returns 100 when the volume is 100', async () => {
      mockExecResolves('100');

      const volume = await getVolume();

      expect(volume).toBe(100);
    });
  });

  describe('setVolume', () => {
    it('calls nircmd with the correct volume value scaled to 0-65535', async () => {
      mockExecResolves('');

      await setVolume(50);

      expect(mockExec).toHaveBeenCalledTimes(1);
      const cmd = String(mockExec.mock.calls[0][0]);
      expect(cmd).toContain('nircmd');
      expect(cmd).toContain('setsysvolume');
      // 50 * 655.35 = 32767.5, rounded to 32768
      expect(cmd).toContain('32768');
    });

    it('converts volume 100 to nircmd value 65535', async () => {
      mockExecResolves('');

      await setVolume(100);

      const cmd = String(mockExec.mock.calls[0][0]);
      expect(cmd).toContain('65535');
    });

    it('converts volume 0 to nircmd value 0', async () => {
      mockExecResolves('');

      await setVolume(0);

      const cmd = String(mockExec.mock.calls[0][0]);
      expect(cmd).toContain('setsysvolume 0');
    });

    it('uses the configured nircmd path', async () => {
      setNircmdPath('C:\\tools\\nircmd.exe');
      mockExecResolves('');

      await setVolume(75);

      const cmd = String(mockExec.mock.calls[0][0]);
      expect(cmd).toContain('C:\\tools\\nircmd.exe');
    });

    it('does not throw when the command fails', async () => {
      mockExecRejects(new Error('Command failed'));

      await expect(setVolume(50)).resolves.toBeUndefined();
    });
  });

  describe('setNircmdPath', () => {
    it('updates the nircmd path used by subsequent commands', async () => {
      setNircmdPath('D:\\custom\\path\\nircmd.exe');
      mockExecResolves('');

      await setVolume(50);

      const cmd = String(mockExec.mock.calls[0][0]);
      expect(cmd).toContain('D:\\custom\\path\\nircmd.exe');
    });
  });
});
