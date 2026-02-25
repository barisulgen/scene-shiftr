import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

import { exec } from 'child_process';
import {
  getWallpaper,
  setWallpaper,
} from '../display-controller';

const mockExec = vi.mocked(exec);

// Helper to create a mock exec that resolves with stdout/stderr
function mockExecResolves(stdout: string, stderr: string = ''): void {
  mockExec.mockImplementation((_cmd: string, callback: any) => {
    callback(null, { stdout, stderr });
    return {} as any;
  });
}

// Helper to create a mock exec that rejects with an error
function mockExecRejects(error: Error): void {
  mockExec.mockImplementation((_cmd: string, callback: any) => {
    callback(error, { stdout: '', stderr: '' });
    return {} as any;
  });
}


describe('display-controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWallpaper', () => {
    it('queries the registry for the current wallpaper path', async () => {
      mockExecResolves(
        'HKEY_CURRENT_USER\\Control Panel\\Desktop\n' +
          '    Wallpaper    REG_SZ    C:\\Users\\Test\\Pictures\\wallpaper.jpg\n'
      );

      await getWallpaper();

      expect(mockExec).toHaveBeenCalledTimes(1);
      const cmd = String(mockExec.mock.calls[0][0]);
      expect(cmd).toContain('reg query');
      expect(cmd).toContain('Control Panel\\Desktop');
      expect(cmd).toContain('Wallpaper');
    });

    it('returns the wallpaper path from the registry output', async () => {
      mockExecResolves(
        'HKEY_CURRENT_USER\\Control Panel\\Desktop\n' +
          '    Wallpaper    REG_SZ    C:\\Users\\Test\\Pictures\\wallpaper.jpg\n'
      );

      const result = await getWallpaper();

      expect(result).toBe('C:\\Users\\Test\\Pictures\\wallpaper.jpg');
    });

    it('returns an empty string when the registry value is empty', async () => {
      mockExecResolves(
        'HKEY_CURRENT_USER\\Control Panel\\Desktop\n' +
          '    Wallpaper    REG_SZ    \n'
      );

      const result = await getWallpaper();

      expect(result).toBe('');
    });

    it('returns an empty string when the command fails', async () => {
      mockExecRejects(new Error('Command failed'));

      const result = await getWallpaper();

      expect(result).toBe('');
    });
  });

  describe('setWallpaper', () => {
    it('calls reg add and PowerShell SystemParametersInfo to set the wallpaper', async () => {
      mockExecResolves('');

      await setWallpaper('C:\\Users\\Test\\Pictures\\new-wallpaper.jpg');

      // Should call reg add first, then PowerShell
      expect(mockExec).toHaveBeenCalledTimes(2);

      const regCmd = String(mockExec.mock.calls[0][0]);
      expect(regCmd).toContain('reg add');
      expect(regCmd).toContain('Control Panel\\Desktop');
      expect(regCmd).toContain('Wallpaper');
      expect(regCmd).toContain('C:\\Users\\Test\\Pictures\\new-wallpaper.jpg');
      expect(regCmd).toContain('/f');

      const psCmd = String(mockExec.mock.calls[1][0]);
      expect(psCmd).toContain('powershell');
      expect(psCmd).toContain('SystemParametersInfo');
      expect(psCmd).toContain('C:\\Users\\Test\\Pictures\\new-wallpaper.jpg');
    });

    it('does not throw when the command fails', async () => {
      mockExecRejects(new Error('Command failed'));

      await expect(
        setWallpaper('C:\\Users\\Test\\Pictures\\wallpaper.jpg')
      ).resolves.toBeUndefined();
    });
  });

});
