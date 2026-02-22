import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

import { exec } from 'child_process';
import {
  getWallpaper,
  setWallpaper,
  captureMonitorLayout,
  restoreMonitorLayout,
} from '../display-controller';
import { MonitorLayout } from '../../../../shared/types';

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

// Helper to create a mock exec that resolves differently on each successive call
function mockExecResolvesSequence(stdouts: string[]): void {
  let callIndex = 0;
  mockExec.mockImplementation((_cmd: string, callback: any) => {
    const stdout = callIndex < stdouts.length ? stdouts[callIndex] : '';
    callIndex++;
    callback(null, { stdout, stderr: '' });
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

  describe('captureMonitorLayout', () => {
    it('uses PowerShell to query monitor information via System.Windows.Forms', async () => {
      mockExecResolves(
        '\\\\.\\DISPLAY1|True|0|0|1920|1080\r\n\\\\.\\DISPLAY2|False|1920|0|2560|1440\r\n'
      );

      await captureMonitorLayout();

      expect(mockExec).toHaveBeenCalledTimes(1);
      const cmd = String(mockExec.mock.calls[0][0]);
      expect(cmd).toContain('powershell');
      expect(cmd).toContain('System.Windows.Forms');
      expect(cmd).toContain('AllScreens');
    });

    it('parses multi-monitor output into MonitorConfig objects', async () => {
      mockExecResolves(
        '\\\\.\\DISPLAY1|True|0|0|1920|1080\r\n\\\\.\\DISPLAY2|False|1920|0|2560|1440\r\n'
      );

      const layout = await captureMonitorLayout();

      expect(layout.monitors).toHaveLength(2);
      expect(layout.monitors[0]).toEqual({
        deviceName: '\\\\.\\DISPLAY1',
        primary: true,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        refreshRate: 60,
      });
      expect(layout.monitors[1]).toEqual({
        deviceName: '\\\\.\\DISPLAY2',
        primary: false,
        x: 1920,
        y: 0,
        width: 2560,
        height: 1440,
        refreshRate: 60,
      });
    });

    it('includes a capturedAt timestamp in ISO format', async () => {
      mockExecResolves(
        '\\\\.\\DISPLAY1|True|0|0|1920|1080\r\n'
      );

      const layout = await captureMonitorLayout();

      expect(layout.capturedAt).toBeDefined();
      // Should parse as a valid date
      expect(new Date(layout.capturedAt).toISOString()).toBe(layout.capturedAt);
    });

    it('handles single monitor output', async () => {
      mockExecResolves('\\\\.\\DISPLAY1|True|0|0|2560|1440\r\n');

      const layout = await captureMonitorLayout();

      expect(layout.monitors).toHaveLength(1);
      expect(layout.monitors[0].deviceName).toBe('\\\\.\\DISPLAY1');
      expect(layout.monitors[0].primary).toBe(true);
      expect(layout.monitors[0].width).toBe(2560);
      expect(layout.monitors[0].height).toBe(1440);
    });

    it('returns an empty monitors array when the command fails', async () => {
      mockExecRejects(new Error('Command failed'));

      const layout = await captureMonitorLayout();

      expect(layout.monitors).toEqual([]);
      expect(layout.capturedAt).toBeDefined();
    });

    it('filters out malformed lines from the output', async () => {
      mockExecResolves(
        '\\\\.\\DISPLAY1|True|0|0|1920|1080\r\nbadline\r\n\\\\.\\DISPLAY2|False|1920|0|2560|1440\r\n'
      );

      const layout = await captureMonitorLayout();

      expect(layout.monitors).toHaveLength(2);
    });
  });

  describe('restoreMonitorLayout', () => {
    it('calls PowerShell for each monitor in the layout', async () => {
      mockExecResolves('');

      const layout: MonitorLayout = {
        capturedAt: new Date().toISOString(),
        monitors: [
          {
            deviceName: '\\\\.\\DISPLAY1',
            primary: true,
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            refreshRate: 60,
          },
        ],
      };

      await restoreMonitorLayout(layout);

      expect(mockExec).toHaveBeenCalled();
      const cmd = String(mockExec.mock.calls[0][0]);
      expect(cmd).toContain('powershell');
    });

    it('does not throw when the command fails', async () => {
      mockExecRejects(new Error('Command failed'));

      const layout: MonitorLayout = {
        capturedAt: new Date().toISOString(),
        monitors: [
          {
            deviceName: '\\\\.\\DISPLAY1',
            primary: true,
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            refreshRate: 60,
          },
        ],
      };

      await expect(restoreMonitorLayout(layout)).resolves.toBeUndefined();
    });

    it('handles an empty monitors array without calling any commands', async () => {
      const layout: MonitorLayout = {
        capturedAt: new Date().toISOString(),
        monitors: [],
      };

      await restoreMonitorLayout(layout);

      expect(mockExec).not.toHaveBeenCalled();
    });
  });
});
