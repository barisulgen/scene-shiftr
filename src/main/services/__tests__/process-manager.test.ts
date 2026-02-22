import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChildProcess } from 'child_process';
import type { AppEntry } from '../../../shared/types';

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
  spawn: vi.fn(),
}));

// Mock the safety module
vi.mock('../safety', () => ({
  assertSafeToKill: vi.fn(),
}));

import { exec, spawn } from 'child_process';
import { assertSafeToKill } from '../safety';
import {
  launchApp,
  launchApps,
  closeApp,
  isRunning,
  getRunningProcesses,
} from '../process-manager';

const mockExec = vi.mocked(exec);
const mockSpawn = vi.mocked(spawn);
const mockAssertSafeToKill = vi.mocked(assertSafeToKill);

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

describe('process-manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('launchApp', () => {
    it('spawns a detached process with the correct path and no args', async () => {
      const mockChild = {
        unref: vi.fn(),
      } as unknown as ChildProcess;
      mockSpawn.mockReturnValue(mockChild);

      const entry: AppEntry = {
        name: 'Notepad',
        path: 'C:\\Windows\\notepad.exe',
      };

      await launchApp(entry);

      expect(mockSpawn).toHaveBeenCalledWith('C:\\Windows\\notepad.exe', [], {
        detached: true,
        stdio: 'ignore',
      });
      expect(mockChild.unref).toHaveBeenCalled();
    });

    it('spawns with split args when entry has args', async () => {
      const mockChild = {
        unref: vi.fn(),
      } as unknown as ChildProcess;
      mockSpawn.mockReturnValue(mockChild);

      const entry: AppEntry = {
        name: 'VS Code',
        path: 'C:\\Program Files\\Code\\code.exe',
        args: '--new-window --goto file.txt',
      };

      await launchApp(entry);

      expect(mockSpawn).toHaveBeenCalledWith(
        'C:\\Program Files\\Code\\code.exe',
        ['--new-window', '--goto', 'file.txt'],
        {
          detached: true,
          stdio: 'ignore',
        }
      );
      expect(mockChild.unref).toHaveBeenCalled();
    });

    it('spawns with empty args array when args is undefined', async () => {
      const mockChild = {
        unref: vi.fn(),
      } as unknown as ChildProcess;
      mockSpawn.mockReturnValue(mockChild);

      const entry: AppEntry = {
        name: 'Calculator',
        path: 'C:\\Windows\\System32\\calc.exe',
      };

      await launchApp(entry);

      expect(mockSpawn).toHaveBeenCalledWith(
        'C:\\Windows\\System32\\calc.exe',
        [],
        {
          detached: true,
          stdio: 'ignore',
        }
      );
    });

    it('calls unref() on the spawned child process', async () => {
      const mockChild = {
        unref: vi.fn(),
      } as unknown as ChildProcess;
      mockSpawn.mockReturnValue(mockChild);

      const entry: AppEntry = {
        name: 'App',
        path: 'C:\\app.exe',
      };

      await launchApp(entry);

      expect(mockChild.unref).toHaveBeenCalledTimes(1);
    });
  });

  describe('launchApps', () => {
    it('launches all entries that are not already running', async () => {
      const mockChild = {
        unref: vi.fn(),
      } as unknown as ChildProcess;
      mockSpawn.mockReturnValue(mockChild);

      // isRunning will be called for each entry - mock exec to say nothing is running
      mockExec.mockImplementation((_cmd: string, callback: any) => {
        callback(null, { stdout: 'INFO: No tasks are running', stderr: '' });
        return {} as any;
      });

      const entries: AppEntry[] = [
        { name: 'Notepad', path: 'C:\\Windows\\notepad.exe' },
        { name: 'Calculator', path: 'C:\\Windows\\System32\\calc.exe' },
      ];

      await launchApps(entries);

      expect(mockSpawn).toHaveBeenCalledTimes(2);
    });

    it('skips entries that are already running', async () => {
      const mockChild = {
        unref: vi.fn(),
      } as unknown as ChildProcess;
      mockSpawn.mockReturnValue(mockChild);

      // First call to tasklist (for notepad.exe) returns it's running
      // Second call to tasklist (for calc.exe) returns not running
      let callCount = 0;
      mockExec.mockImplementation((_cmd: string, callback: any) => {
        callCount++;
        if (callCount === 1) {
          // notepad.exe is running
          callback(null, {
            stdout: 'notepad.exe                   1234 Console                    1     10,000 K',
            stderr: '',
          });
        } else {
          // calc.exe is not running
          callback(null, {
            stdout: 'INFO: No tasks are running which match the specified criteria.',
            stderr: '',
          });
        }
        return {} as any;
      });

      const entries: AppEntry[] = [
        { name: 'Notepad', path: 'C:\\Windows\\notepad.exe' },
        { name: 'Calculator', path: 'C:\\Windows\\System32\\calc.exe' },
      ];

      await launchApps(entries);

      // Only calc.exe should be spawned since notepad.exe is already running
      expect(mockSpawn).toHaveBeenCalledTimes(1);
      expect(mockSpawn).toHaveBeenCalledWith(
        'C:\\Windows\\System32\\calc.exe',
        [],
        { detached: true, stdio: 'ignore' }
      );
    });

    it('handles an empty entries array', async () => {
      await launchApps([]);

      expect(mockSpawn).not.toHaveBeenCalled();
    });
  });

  describe('closeApp', () => {
    it('calls assertSafeToKill before killing', async () => {
      mockAssertSafeToKill.mockImplementation(() => {});

      // taskkill succeeds
      mockExec.mockImplementation((_cmd: string, callback: any) => {
        const cmdStr = String(_cmd);
        if (cmdStr.includes('taskkill')) {
          callback(null, { stdout: 'SUCCESS', stderr: '' });
        } else if (cmdStr.includes('tasklist')) {
          // Process is no longer running
          callback(null, {
            stdout: 'INFO: No tasks are running which match the specified criteria.',
            stderr: '',
          });
        }
        return {} as any;
      });

      await closeApp('discord.exe');

      expect(mockAssertSafeToKill).toHaveBeenCalledWith('discord.exe');
    });

    it('returns "skipped" when safety check throws', async () => {
      mockAssertSafeToKill.mockImplementation(() => {
        throw new Error('Cannot kill protected system process: explorer.exe');
      });

      const result = await closeApp('explorer.exe');

      expect(result).toBe('skipped');
      expect(mockExec).not.toHaveBeenCalled();
    });

    it('returns "closed" when taskkill succeeds and process exits', async () => {
      mockAssertSafeToKill.mockImplementation(() => {});

      mockExec.mockImplementation((_cmd: string, callback: any) => {
        const cmdStr = String(_cmd);
        if (cmdStr.includes('taskkill')) {
          callback(null, { stdout: 'SUCCESS', stderr: '' });
        } else if (cmdStr.includes('tasklist')) {
          callback(null, {
            stdout: 'INFO: No tasks are running which match the specified criteria.',
            stderr: '',
          });
        }
        return {} as any;
      });

      const result = await closeApp('discord.exe');

      expect(result).toBe('closed');
    });

    it('returns "closed" when taskkill throws (process already gone)', async () => {
      mockAssertSafeToKill.mockImplementation(() => {});

      mockExec.mockImplementation((_cmd: string, callback: any) => {
        const cmdStr = String(_cmd);
        if (cmdStr.includes('taskkill')) {
          callback(new Error('No process found'), { stdout: '', stderr: '' });
        }
        return {} as any;
      });

      const result = await closeApp('discord.exe');

      expect(result).toBe('closed');
    });

    it('returns "timeout" when process does not close within timeout', async () => {
      mockAssertSafeToKill.mockImplementation(() => {});

      vi.useFakeTimers();

      mockExec.mockImplementation((_cmd: string, callback: any) => {
        const cmdStr = String(_cmd);
        if (cmdStr.includes('taskkill')) {
          callback(null, { stdout: 'SUCCESS', stderr: '' });
        } else if (cmdStr.includes('tasklist')) {
          // Process is still running every time we check
          callback(null, {
            stdout: 'discord.exe                   1234 Console                    1     50,000 K',
            stderr: '',
          });
        }
        return {} as any;
      });

      const closePromise = closeApp('discord.exe', 2000);

      // Advance time past the timeout, advancing in 500ms increments to match the polling interval
      for (let i = 0; i < 10; i++) {
        await vi.advanceTimersByTimeAsync(500);
      }

      const result = await closePromise;

      expect(result).toBe('timeout');
    });

    it('uses taskkill /IM with the process name', async () => {
      mockAssertSafeToKill.mockImplementation(() => {});

      mockExec.mockImplementation((_cmd: string, callback: any) => {
        const cmdStr = String(_cmd);
        if (cmdStr.includes('taskkill')) {
          callback(null, { stdout: 'SUCCESS', stderr: '' });
        } else if (cmdStr.includes('tasklist')) {
          callback(null, {
            stdout: 'INFO: No tasks are running which match the specified criteria.',
            stderr: '',
          });
        }
        return {} as any;
      });

      await closeApp('slack.exe');

      // Find the taskkill call
      const taskkillCall = mockExec.mock.calls.find((call) =>
        String(call[0]).includes('taskkill')
      );
      expect(taskkillCall).toBeDefined();
      expect(String(taskkillCall![0])).toContain('taskkill /IM "slack.exe"');
    });
  });

  describe('isRunning', () => {
    it('returns true when tasklist output contains the process name', async () => {
      mockExecResolves(
        'notepad.exe                   1234 Console                    1     10,000 K'
      );

      const result = await isRunning('notepad.exe');

      expect(result).toBe(true);
    });

    it('returns false when tasklist returns "INFO: No tasks"', async () => {
      mockExecResolves(
        'INFO: No tasks are running which match the specified criteria.'
      );

      const result = await isRunning('notepad.exe');

      expect(result).toBe(false);
    });

    it('returns false when exec throws an error', async () => {
      mockExecRejects(new Error('Command failed'));

      const result = await isRunning('notepad.exe');

      expect(result).toBe(false);
    });

    it('performs case-insensitive comparison', async () => {
      mockExecResolves(
        'Notepad.exe                   1234 Console                    1     10,000 K'
      );

      const result = await isRunning('notepad.exe');

      expect(result).toBe(true);
    });

    it('uses tasklist with IMAGENAME filter', async () => {
      mockExecResolves('INFO: No tasks are running.');

      await isRunning('discord.exe');

      expect(mockExec).toHaveBeenCalled();
      const cmdArg = String(mockExec.mock.calls[0][0]);
      expect(cmdArg).toContain('tasklist');
      expect(cmdArg).toContain('IMAGENAME eq discord.exe');
    });
  });

  describe('getRunningProcesses', () => {
    it('parses CSV output into an array of process names', async () => {
      mockExecResolves(
        [
          '"notepad.exe","1234","Console","1","10,000 K"',
          '"chrome.exe","5678","Console","1","150,000 K"',
          '"discord.exe","9012","Console","1","80,000 K"',
        ].join('\n')
      );

      const result = await getRunningProcesses();

      expect(result).toEqual(['notepad.exe', 'chrome.exe', 'discord.exe']);
    });

    it('returns an empty array when exec fails', async () => {
      mockExecRejects(new Error('Command failed'));

      const result = await getRunningProcesses();

      expect(result).toEqual([]);
    });

    it('filters out empty lines', async () => {
      mockExecResolves(
        [
          '"notepad.exe","1234","Console","1","10,000 K"',
          '',
          '"chrome.exe","5678","Console","1","150,000 K"',
        ].join('\n')
      );

      const result = await getRunningProcesses();

      expect(result).toEqual(['notepad.exe', 'chrome.exe']);
    });

    it('uses tasklist with CSV format', async () => {
      mockExecResolves('"notepad.exe","1234","Console","1","10,000 K"');

      await getRunningProcesses();

      expect(mockExec).toHaveBeenCalled();
      const cmdArg = String(mockExec.mock.calls[0][0]);
      expect(cmdArg).toContain('tasklist /FO CSV /NH');
    });
  });
});
