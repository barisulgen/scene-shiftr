import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

import { exec } from 'child_process';
import {
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
    it('applies focusAssist when it is non-null', async () => {
      mockExecResolves('');

      await applySystemSettings({ focusAssist: true });

      expect(mockExec).toHaveBeenCalledTimes(1);
    });

    it('skips all commands when focusAssist is null', async () => {
      await applySystemSettings({ focusAssist: null });

      expect(mockExec).not.toHaveBeenCalled();
    });

    it('does not throw when underlying commands fail', async () => {
      mockExecRejects(new Error('Command failed'));

      await expect(
        applySystemSettings({ focusAssist: true })
      ).resolves.toBeUndefined();
    });
  });
});
