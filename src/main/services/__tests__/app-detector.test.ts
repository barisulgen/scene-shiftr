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
import { detectInstalledApps } from '../app-detector';

const mockReaddir = vi.mocked(fs.readdir);
const mockExec = vi.mocked(exec);

// Helper: mock exec to resolve with stdout
function mockExecImpl(handler: (cmd: string) => { stdout: string; stderr: string }): void {
  mockExec.mockImplementation((cmd: any, callback: any) => {
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

    // Set up environment variables for testing
    process.env.APPDATA = 'C:\\Users\\TestUser\\AppData\\Roaming';
    process.env.PROGRAMDATA = 'C:\\ProgramData';
  });

  describe('detectInstalledApps', () => {
    it('returns an array of AppEntry objects', async () => {
      // No shortcuts, no registry entries
      mockReaddir.mockResolvedValue([]);
      mockExecImpl(() => ({ stdout: '', stderr: '' }));

      const result = await detectInstalledApps();

      expect(Array.isArray(result)).toBe(true);
    });

    it('scans Start Menu shortcuts (.lnk files) from user and public directories', async () => {
      // readdir is called for user Start Menu and public Start Menu
      mockReaddir.mockResolvedValue([]);
      mockExecImpl(() => ({ stdout: '', stderr: '' }));

      await detectInstalledApps();

      // Should have been called at least twice (user + public Start Menu directories)
      expect(mockReaddir).toHaveBeenCalledTimes(2);

      const calls = mockReaddir.mock.calls.map((c) => String(c[0]));
      expect(calls).toContainEqual(
        expect.stringContaining('Microsoft\\Windows\\Start Menu\\Programs')
      );
    });

    it('resolves .lnk files via PowerShell and returns entries pointing to .exe files', async () => {
      // User Start Menu has two .lnk files
      mockReaddir
        .mockResolvedValueOnce(['Notepad.lnk', 'readme.txt'] as any)
        .mockResolvedValueOnce([] as any);

      mockExecImpl((cmd: string) => {
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
      // Shortcut resolves to chrome.exe, registry also has chrome.exe
      mockReaddir
        .mockResolvedValueOnce(['Chrome.lnk'] as any)
        .mockResolvedValueOnce([] as any);

      mockExecImpl((cmd: string) => {
        if (cmd.includes('WScript.Shell') && cmd.includes('Chrome.lnk')) {
          // Return same path but with different casing
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

      // Count how many entries have a chrome.exe path
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
        if (cmd.includes('WScript.Shell') && cmd.includes('Zulu.lnk')) {
          return { stdout: 'C:\\Apps\\zulu.exe\r\n', stderr: '' };
        }
        if (cmd.includes('WScript.Shell') && cmd.includes('Alpha.lnk')) {
          return { stdout: 'C:\\Apps\\alpha.exe\r\n', stderr: '' };
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
      // readdir throws ENOENT for both directories
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

      // Should still return registry entries despite directory errors
      expect(result.length).toBeGreaterThan(0);
    });

    it('filters out .lnk targets that do not point to .exe files', async () => {
      mockReaddir
        .mockResolvedValueOnce(['Document.lnk', 'App.lnk'] as any)
        .mockResolvedValueOnce([] as any);

      mockExecImpl((cmd: string) => {
        if (cmd.includes('WScript.Shell') && cmd.includes('Document.lnk')) {
          // Points to a .docx, not an .exe
          return { stdout: 'C:\\Docs\\report.docx\r\n', stderr: '' };
        }
        if (cmd.includes('WScript.Shell') && cmd.includes('App.lnk')) {
          return { stdout: 'C:\\Apps\\myapp.exe\r\n', stderr: '' };
        }
        if (cmd.includes('reg query')) {
          return { stdout: '', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const result = await detectInstalledApps();

      // Should not include the .docx entry
      const docEntries = result.filter((e) => e.path.includes('.docx'));
      expect(docEntries).toHaveLength(0);

      // Should include the .exe entry
      const exeEntries = result.filter((e) => e.path.includes('myapp.exe'));
      expect(exeEntries).toHaveLength(1);
    });

    it('handles PowerShell shortcut resolution failure gracefully', async () => {
      mockReaddir
        .mockResolvedValueOnce(['Broken.lnk', 'Working.lnk'] as any)
        .mockResolvedValueOnce([] as any);

      mockExecImpl((cmd: string) => {
        if (cmd.includes('WScript.Shell') && cmd.includes('Broken.lnk')) {
          throw new Error('Failed to resolve shortcut');
        }
        if (cmd.includes('WScript.Shell') && cmd.includes('Working.lnk')) {
          return { stdout: 'C:\\Apps\\working.exe\r\n', stderr: '' };
        }
        if (cmd.includes('reg query')) {
          return { stdout: '', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const result = await detectInstalledApps();

      // Should still return the working entry
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Working' }),
        ])
      );

      // Should not include the broken entry
      const brokenEntries = result.filter((e) => e.name === 'Broken');
      expect(brokenEntries).toHaveLength(0);
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
        if (cmd.includes('WScript.Shell') && cmd.includes('Notepad.lnk')) {
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
