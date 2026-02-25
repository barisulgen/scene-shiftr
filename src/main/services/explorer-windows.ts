import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Closes open Explorer folder windows, optionally keeping windows
 * that match paths in the `keepPaths` array.
 *
 * Uses the Shell.Application COM object to enumerate Explorer windows
 * without touching explorer.exe itself (which is on the safety whitelist).
 */
export async function closeExplorerWindows(keepPaths: string[] = []): Promise<void> {
  // Normalize keep paths for comparison
  const keepNormalized = keepPaths.map((p) => p.replace(/\\/g, '/').toLowerCase());

  // Build PowerShell script that closes Explorer windows not in the keep list
  const keepArrayStr = keepNormalized.length > 0
    ? keepNormalized.map((p) => `'${p.replace(/'/g, "''")}'`).join(',')
    : '';

  const script = keepNormalized.length > 0
    ? `$keep = @(${keepArrayStr}); $shell = New-Object -ComObject Shell.Application; $shell.Windows() | ForEach-Object { $loc = $_.LocationURL -replace 'file:///', '' -replace '/', '\\\\'; $locNorm = $loc.Replace('\\\\', '/').ToLower(); if ($keep -notcontains $locNorm) { $_.Quit() } }`
    : `$shell = New-Object -ComObject Shell.Application; $shell.Windows() | ForEach-Object { $_.Quit() }`;

  try {
    await execAsync(`powershell -NoProfile -Command "${script}"`);
  } catch {
    // Best effort — some windows may resist closing
  }
}
