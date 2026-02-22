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
 * Resolves a batch of .lnk shortcuts to their target paths using a single
 * PowerShell process. Returns a Map of lnkPath → targetPath (only .exe targets).
 */
async function resolveShortcutsBatch(lnkPaths: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  if (lnkPaths.length === 0) return results;

  // Build a single PowerShell script that resolves all shortcuts at once
  const escapedPaths = lnkPaths.map((p) => p.replace(/'/g, "''"));
  const lines = escapedPaths.map(
    (p) => `try { $s = $wsh.CreateShortcut('${p}'); Write-Output "$($s.TargetPath)" } catch { Write-Output "" }`
  );
  const script = `$wsh = New-Object -ComObject WScript.Shell; ${lines.join('; ')}`;

  try {
    const { stdout } = await execAsync(`powershell -NoProfile -Command "${script}"`, {
      maxBuffer: 10 * 1024 * 1024,
    });
    const outputLines = stdout.split('\n').map((l) => l.trim());

    for (let i = 0; i < lnkPaths.length && i < outputLines.length; i++) {
      const target = outputLines[i];
      if (target && target.toLowerCase().endsWith('.exe')) {
        results.set(lnkPaths[i], target);
      }
    }
  } catch {
    // If the batch fails, return empty — don't crash
  }

  return results;
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

// Cache for detected apps — avoids re-scanning on every call
let cachedApps: AppEntry[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 1 minute
let pendingDetection: Promise<AppEntry[]> | null = null;

export function resetCache(): void {
  cachedApps = null;
  cacheTimestamp = 0;
  pendingDetection = null;
}

/**
 * Detects installed applications by scanning Start Menu shortcuts
 * and Windows Registry App Paths.
 *
 * Returns a deduplicated, alphabetically sorted array of AppEntry objects.
 * Results are cached for 1 minute to avoid redundant scanning.
 */
export async function detectInstalledApps(): Promise<AppEntry[]> {
  // Return cache if fresh
  if (cachedApps && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedApps;
  }

  // If a detection is already in progress, wait for it (dedup concurrent calls)
  if (pendingDetection) {
    return pendingDetection;
  }

  pendingDetection = detectInstalledAppsUncached();
  try {
    const result = await pendingDetection;
    cachedApps = result;
    cacheTimestamp = Date.now();
    return result;
  } finally {
    pendingDetection = null;
  }
}

async function detectInstalledAppsUncached(): Promise<AppEntry[]> {
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

  // Resolve all shortcuts in a single PowerShell process
  const resolved = await resolveShortcutsBatch(allLnks);

  for (const [lnkPath, targetPath] of resolved) {
    appEntries.push({ name: nameFromLnk(lnkPath), path: targetPath });
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
