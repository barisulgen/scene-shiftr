import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

import { exec } from 'child_process';
import {
  getNightLight,
  setNightLight,
  getFocusAssist,
  setFocusAssist,
  applySystemSettings,
} from '../system-settings';

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

describe('system-settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNightLight', () => {
    it('runs a PowerShell command to query night light state', async () => {
      mockExecResolves('enabled');

      await getNightLight();

      expect(mockExec).toHaveBeenCalledTimes(1);
      const cmd = String(mockExec.mock.calls[0][0]);
      expect(cmd).toContain('powershell');
      expect(cmd).toContain('bluelightreduction');
    });

    it('returns true when the output indicates night light is enabled', async () => {
      mockExecResolves('enabled');

      const result = await getNightLight();

      expect(result).toBe(true);
    });

    it('returns false when the output indicates night light is disabled', async () => {
      mockExecResolves('disabled');

      const result = await getNightLight();

      expect(result).toBe(false);
    });

    it('returns false when the command fails', async () => {
      mockExecRejects(new Error('Command failed'));

      const result = await getNightLight();

      expect(result).toBe(false);
    });
  });

  describe('setNightLight', () => {
    it('runs the correct PowerShell command to enable night light', async () => {
      mockExecResolves('');

      await setNightLight(true);

      expect(mockExec).toHaveBeenCalledTimes(1);
      const cmd = String(mockExec.mock.calls[0][0]);
      expect(cmd).toContain('powershell');
      expect(cmd).toContain('bluelightreduction');
      expect(cmd).toContain('0x15');
    });

    it('runs the correct PowerShell command to disable night light', async () => {
      mockExecResolves('');

      await setNightLight(false);

      expect(mockExec).toHaveBeenCalledTimes(1);
      const cmd = String(mockExec.mock.calls[0][0]);
      expect(cmd).toContain('powershell');
      expect(cmd).toContain('bluelightreduction');
      expect(cmd).toContain('0x13');
    });

    it('does not throw when the command fails', async () => {
      mockExecRejects(new Error('Command failed'));

      await expect(setNightLight(true)).resolves.toBeUndefined();
    });
  });

  describe('getFocusAssist', () => {
    it('reads the registry to check focus assist state', async () => {
      mockExecResolves(
        'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings\n' +
        '    NOC_GLOBAL_SETTING_TOASTS_ENABLED    REG_DWORD    0x0'
      );

      await getFocusAssist();

      expect(mockExec).toHaveBeenCalledTimes(1);
      const cmd = String(mockExec.mock.calls[0][0]);
      expect(cmd).toContain('reg query');
      expect(cmd).toContain('NOC_GLOBAL_SETTING_TOASTS_ENABLED');
    });

    it('returns true when toast notifications are disabled (focus assist on)', async () => {
      mockExecResolves(
        'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings\n' +
        '    NOC_GLOBAL_SETTING_TOASTS_ENABLED    REG_DWORD    0x0'
      );

      const result = await getFocusAssist();

      expect(result).toBe(true);
    });

    it('returns false when toast notifications are enabled (focus assist off)', async () => {
      mockExecResolves(
        'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings\n' +
        '    NOC_GLOBAL_SETTING_TOASTS_ENABLED    REG_DWORD    0x1'
      );

      const result = await getFocusAssist();

      expect(result).toBe(false);
    });

    it('returns false when the command fails', async () => {
      mockExecRejects(new Error('Command failed'));

      const result = await getFocusAssist();

      expect(result).toBe(false);
    });
  });

  describe('setFocusAssist', () => {
    it('writes the correct registry value to enable focus assist', async () => {
      mockExecResolves('');

      await setFocusAssist(true);

      expect(mockExec).toHaveBeenCalledTimes(1);
      const cmd = String(mockExec.mock.calls[0][0]);
      expect(cmd).toContain('reg add');
      expect(cmd).toContain('NOC_GLOBAL_SETTING_TOASTS_ENABLED');
      expect(cmd).toContain('/d 0');
      expect(cmd).toContain('/f');
    });

    it('writes the correct registry value to disable focus assist', async () => {
      mockExecResolves('');

      await setFocusAssist(false);

      expect(mockExec).toHaveBeenCalledTimes(1);
      const cmd = String(mockExec.mock.calls[0][0]);
      expect(cmd).toContain('reg add');
      expect(cmd).toContain('NOC_GLOBAL_SETTING_TOASTS_ENABLED');
      expect(cmd).toContain('/d 1');
      expect(cmd).toContain('/f');
    });

    it('does not throw when the command fails', async () => {
      mockExecRejects(new Error('Command failed'));

      await expect(setFocusAssist(true)).resolves.toBeUndefined();
    });
  });

  describe('applySystemSettings', () => {
    it('applies both night light and focus assist when both are non-null', async () => {
      mockExecResolves('');

      await applySystemSettings({ nightLight: true, focusAssist: true });

      expect(mockExec).toHaveBeenCalledTimes(2);
    });

    it('only applies nightLight when focusAssist is null', async () => {
      mockExecResolves('');

      await applySystemSettings({ nightLight: true, focusAssist: null });

      expect(mockExec).toHaveBeenCalledTimes(1);
      const cmd = String(mockExec.mock.calls[0][0]);
      expect(cmd).toContain('bluelightreduction');
    });

    it('only applies focusAssist when nightLight is null', async () => {
      mockExecResolves('');

      await applySystemSettings({ nightLight: null, focusAssist: false });

      expect(mockExec).toHaveBeenCalledTimes(1);
      const cmd = String(mockExec.mock.calls[0][0]);
      expect(cmd).toContain('reg add');
    });

    it('skips all commands when both fields are null', async () => {
      await applySystemSettings({ nightLight: null, focusAssist: null });

      expect(mockExec).not.toHaveBeenCalled();
    });

    it('does not throw when underlying commands fail', async () => {
      mockExecRejects(new Error('Command failed'));

      await expect(
        applySystemSettings({ nightLight: true, focusAssist: true })
      ).resolves.toBeUndefined();
    });
  });
});
