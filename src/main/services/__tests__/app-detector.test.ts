import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs.promises
vi.mock('fs', () => ({
  promises: {
    readdir: vi.fn(),
  },
}));

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { detectInstalledApps, resetCache } from '../app-detector';

const mockReaddir = vi.mocked(fs.readdir);
const mockExec = vi.mocked(exec);

// Helper: mock exec to resolve with stdout based on command content
function mockExecImpl(handler: (cmd: string) => { stdout: string; stderr: string }): void {
  mockExec.mockImplementation((cmd: any, ...args: any[]) => {
    const callback = typeof args[0] === 'function' ? args[0] : args[1];
    try {
      const result = handler(String(cmd));
      callback(null, result);
    } catch (err) {
      callback(err, { stdout: '', stderr: '' });
    }
    return {} as any;
  });
}

// Standard registry output fixture
const REGISTRY_OUTPUT = [
  '',
  'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe',
  '    (Default)    REG_SZ    C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '',
  'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\code.exe',
  '    (Default)    REG_SZ    C:\\Program Files\\Microsoft VS Code\\code.exe',
  '',
].join('\r\n');

describe('app-detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCache();

    process.env.APPDATA = 'C:\\Users\\TestUser\\AppData\\Roaming';
    process.env.PROGRAMDATA = 'C:\\ProgramData';
  });

  describe('detectInstalledApps', () => {
    it('returns an array of AppEntry objects', async () => {
      mockReaddir.mockResolvedValue([]);
      mockExecImpl(() => ({ stdout: '', stderr: '' }));

      const result = await detectInstalledApps();

      expect(Array.isArray(result)).toBe(true);
    });

    it('scans Start Menu shortcuts from user and public directories', async () => {
      mockReaddir.mockResolvedValue([]);
      mockExecImpl(() => ({ stdout: '', stderr: '' }));

      await detectInstalledApps();

      expect(mockReaddir).toHaveBeenCalledTimes(2);

      const calls = mockReaddir.mock.calls.map((c) => String(c[0]));
      expect(calls).toContainEqual(
        expect.stringContaining('Microsoft\\Windows\\Start Menu\\Programs')
      );
    });

    it('resolves .lnk files via batch PowerShell and returns entries pointing to .exe files', async () => {
      mockReaddir
        .mockResolvedValueOnce(['Notepad.lnk', 'readme.txt'] as any)
        .mockResolvedValueOnce([] as any);

      mockExecImpl((cmd: string) => {
        // Batch PowerShell call resolving shortcuts
        if (cmd.includes('WScript.Shell') && cmd.includes('Notepad.lnk')) {
          return { stdout: 'C:\\Windows\\notepad.exe\r\n', stderr: '' };
        }
        if (cmd.includes('reg query')) {
          return { stdout: '', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const result = await detectInstalledApps();

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Notepad',
            path: expect.stringMatching(/notepad\.exe/i),
          }),
        ])
      );
    });

    it('reads registry App Paths via reg query', async () => {
      mockReaddir.mockResolvedValue([] as any);

      mockExecImpl((cmd: string) => {
        if (cmd.includes('reg query')) {
          return { stdout: REGISTRY_OUTPUT, stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const result = await detectInstalledApps();

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'chrome',
            path: expect.stringMatching(/chrome\.exe/i),
          }),
          expect.objectContaining({
            name: 'code',
            path: expect.stringMatching(/code\.exe/i),
          }),
        ])
      );
    });

    it('deduplicates entries by executable path (case-insensitive)', async () => {
      mockReaddir
        .mockResolvedValueOnce(['Chrome.lnk'] as any)
        .mockResolvedValueOnce([] as any);

      mockExecImpl((cmd: string) => {
        // Batch resolves Chrome.lnk
        if (cmd.includes('WScript.Shell') && cmd.includes('Chrome.lnk')) {
          return {
            stdout: 'C:\\Program Files\\Google\\Chrome\\Application\\Chrome.exe\r\n',
            stderr: '',
          };
        }
        if (cmd.includes('reg query')) {
          return { stdout: REGISTRY_OUTPUT, stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const result = await detectInstalledApps();

      const chromeEntries = result.filter((e) =>
        e.path.toLowerCase().includes('chrome.exe')
      );
      expect(chromeEntries).toHaveLength(1);
    });

    it('returns results sorted by name', async () => {
      mockReaddir
        .mockResolvedValueOnce(['Zulu.lnk', 'Alpha.lnk'] as any)
        .mockResolvedValueOnce([] as any);

      mockExecImpl((cmd: string) => {
        // Batch call resolves both shortcuts — output is one line per shortcut
        if (cmd.includes('WScript.Shell')) {
          // The batch script processes Zulu.lnk first, then Alpha.lnk (order matches allLnks)
          return { stdout: 'C:\\Apps\\zulu.exe\r\nC:\\Apps\\alpha.exe\r\n', stderr: '' };
        }
        if (cmd.includes('reg query')) {
          return { stdout: '', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const result = await detectInstalledApps();

      expect(result.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < result.length; i++) {
        expect(
          result[i - 1].name.toLowerCase() <= result[i].name.toLowerCase()
        ).toBe(true);
      }
    });

    it('returns empty array when registry query fails', async () => {
      mockReaddir.mockResolvedValue([] as any);

      mockExecImpl((cmd: string) => {
        if (cmd.includes('reg query')) {
          throw new Error('Access denied');
        }
        return { stdout: '', stderr: '' };
      });

      const result = await detectInstalledApps();

      expect(result).toEqual([]);
    });

    it('handles non-existent Start Menu directories gracefully', async () => {
      mockReaddir.mockRejectedValue(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      );

      mockExecImpl((cmd: string) => {
        if (cmd.includes('reg query')) {
          return { stdout: REGISTRY_OUTPUT, stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const result = await detectInstalledApps();

      expect(result.length).toBeGreaterThan(0);
    });

    it('filters out .lnk targets that do not point to .exe files', async () => {
      mockReaddir
        .mockResolvedValueOnce(['Document.lnk', 'App.lnk'] as any)
        .mockResolvedValueOnce([] as any);

      mockExecImpl((cmd: string) => {
        // Batch resolves both: Document.lnk → .docx, App.lnk → .exe
        if (cmd.includes('WScript.Shell')) {
          return { stdout: 'C:\\Docs\\report.docx\r\nC:\\Apps\\myapp.exe\r\n', stderr: '' };
        }
        if (cmd.includes('reg query')) {
          return { stdout: '', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const result = await detectInstalledApps();

      const docEntries = result.filter((e) => e.path.includes('.docx'));
      expect(docEntries).toHaveLength(0);

      const exeEntries = result.filter((e) => e.path.includes('myapp.exe'));
      expect(exeEntries).toHaveLength(1);
    });

    it('handles batch PowerShell failure gracefully', async () => {
      mockReaddir
        .mockResolvedValueOnce(['App.lnk'] as any)
        .mockResolvedValueOnce([] as any);

      mockExecImpl((cmd: string) => {
        if (cmd.includes('WScript.Shell')) {
          throw new Error('PowerShell failed');
        }
        if (cmd.includes('reg query')) {
          return { stdout: REGISTRY_OUTPUT, stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const result = await detectInstalledApps();

      // Should still return registry entries despite shortcut resolution failure
      expect(result.length).toBeGreaterThan(0);
      expect(result.map((e) => e.name)).toContain('chrome');
    });

    it('combines entries from both Start Menu and Registry sources', async () => {
      mockReaddir
        .mockResolvedValueOnce(['Notepad.lnk'] as any)
        .mockResolvedValueOnce([] as any);

      const registryWithCode = [
        '',
        'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\code.exe',
        '    (Default)    REG_SZ    C:\\Program Files\\Microsoft VS Code\\code.exe',
        '',
      ].join('\r\n');

      mockExecImpl((cmd: string) => {
        if (cmd.includes('WScript.Shell')) {
          return { stdout: 'C:\\Windows\\notepad.exe\r\n', stderr: '' };
        }
        if (cmd.includes('reg query')) {
          return { stdout: registryWithCode, stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const result = await detectInstalledApps();

      expect(result).toHaveLength(2);
      expect(result.map((e) => e.name)).toContain('code');
      expect(result.map((e) => e.name)).toContain('Notepad');
    });
  });
});
