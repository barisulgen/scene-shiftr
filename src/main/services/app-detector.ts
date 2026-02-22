import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { AppEntry } from '../../shared/types';

const execAsync = promisify(exec);

/**
 * Scans Start Menu shortcut directories for .lnk files.
 * Returns an array of absolute paths to .lnk files found.
 */
async function scanStartMenuShortcuts(directory: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(directory, { recursive: true });
    return (entries as string[])
      .filter((entry) => entry.toLowerCase().endsWith('.lnk'))
      .map((entry) => path.join(directory, entry));
  } catch {
    return [];
  }
}

/**
 * Resolves a .lnk shortcut to its target path using PowerShell.
 * Returns null if the shortcut cannot be resolved or does not point to an .exe.
 */
async function resolveShortcut(lnkPath: string): Promise<string | null> {
  try {
    const escapedPath = lnkPath.replace(/'/g, "''");
    const cmd = `powershell -NoProfile -Command "(New-Object -ComObject WScript.Shell).CreateShortcut('${escapedPath}').TargetPath"`;
    const { stdout } = await execAsync(cmd);
    const targetPath = stdout.trim();
    if (targetPath && targetPath.toLowerCase().endsWith('.exe')) {
      return targetPath;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Derives a human-readable app name from a .lnk filename.
 * Strips the .lnk extension.
 */
function nameFromLnk(lnkPath: string): string {
  const basename = path.basename(lnkPath, '.lnk');
  return basename;
}

/**
 * Scans the Windows registry App Paths for installed applications.
 * Parses the output of `reg query` to extract executable names and paths.
 */
async function scanRegistryAppPaths(): Promise<AppEntry[]> {
  try {
    const cmd = 'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths" /s';
    const { stdout } = await execAsync(cmd);
    const entries: AppEntry[] = [];

    const lines = stdout.split('\n');
    let currentExeName: string | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Match registry key lines like:
      // HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe
      const keyMatch = trimmed.match(/\\App Paths\\(.+\.exe)$/i);
      if (keyMatch) {
        currentExeName = keyMatch[1];
        continue;
      }

      // Match default value lines like:
      //     (Default)    REG_SZ    C:\Program Files\Google\Chrome\Application\chrome.exe
      if (currentExeName && trimmed.startsWith('(Default)') && trimmed.includes('REG_SZ')) {
        const valueMatch = trimmed.match(/REG_SZ\s+(.+)/);
        if (valueMatch) {
          const exePath = valueMatch[1].trim();
          if (exePath.toLowerCase().endsWith('.exe')) {
            const name = currentExeName.replace(/\.exe$/i, '');
            entries.push({ name, path: exePath });
          }
        }
        currentExeName = null;
      }
    }

    return entries;
  } catch {
    return [];
  }
}

/**
 * Detects installed applications by scanning Start Menu shortcuts
 * and Windows Registry App Paths.
 *
 * Returns a deduplicated, alphabetically sorted array of AppEntry objects.
 */
export async function detectInstalledApps(): Promise<AppEntry[]> {
  const appEntries: AppEntry[] = [];

  // Source 1: Start Menu shortcuts
  const userStartMenu = path.join(
    process.env.APPDATA || '',
    'Microsoft',
    'Windows',
    'Start Menu',
    'Programs'
  );
  const publicStartMenu = path.join(
    process.env.PROGRAMDATA || '',
    'Microsoft',
    'Windows',
    'Start Menu',
    'Programs'
  );

  const [userLnks, publicLnks] = await Promise.all([
    scanStartMenuShortcuts(userStartMenu),
    scanStartMenuShortcuts(publicStartMenu),
  ]);

  const allLnks = [...userLnks, ...publicLnks];

  // Resolve shortcuts in parallel
  const shortcutResults = await Promise.all(
    allLnks.map(async (lnkPath) => {
      const target = await resolveShortcut(lnkPath);
      if (target) {
        return { name: nameFromLnk(lnkPath), path: target } as AppEntry;
      }
      return null;
    })
  );

  for (const entry of shortcutResults) {
    if (entry) {
      appEntries.push(entry);
    }
  }

  // Source 2: Registry App Paths
  const registryEntries = await scanRegistryAppPaths();
  appEntries.push(...registryEntries);

  // Deduplicate by normalized path (case-insensitive)
  const seen = new Map<string, AppEntry>();
  for (const entry of appEntries) {
    const normalizedPath = path.resolve(entry.path).toLowerCase();
    if (!seen.has(normalizedPath)) {
      seen.set(normalizedPath, entry);
    }
  }

  // Sort alphabetically by name (case-insensitive)
  const deduplicated = Array.from(seen.values());
  deduplicated.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  return deduplicated;
}
