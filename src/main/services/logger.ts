import fs from 'fs/promises';
import path from 'path';

let logBaseDir = '';

export function setLogBaseDir(dir: string): void {
  logBaseDir = dir;
}

// Sub-folders
function getActivationLogDir(): string {
  return path.join(logBaseDir, 'activation');
}

function getDryRunLogDir(): string {
  return path.join(logBaseDir, 'dry-run');
}

function getLogFilePath(subDir: string): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(subDir, `${date}.log`);
}

function timestamp(): string {
  return new Date().toTimeString().slice(0, 8); // HH:MM:SS
}

async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function appendToLog(subDir: string, line: string): Promise<void> {
  await ensureDir(subDir);
  const filePath = getLogFilePath(subDir);
  await fs.appendFile(filePath, line + '\n', 'utf-8');
}

// --- Public API ---

export type LogResult = 'SUCCESS' | 'FAILED' | 'SKIPPED';

export async function logActivationStart(workspaceName: string): Promise<void> {
  const dir = getActivationLogDir();
  await appendToLog(dir, `[${timestamp()}] ACTIVATION START — Workspace: ${workspaceName}`);
}

export async function logActivationComplete(durationMs: number, succeeded: number, total: number, skipped: number): Promise<void> {
  const dir = getActivationLogDir();
  const duration = (durationMs / 1000).toFixed(1);
  await appendToLog(dir, `[${timestamp()}] ACTIVATION COMPLETE — Duration: ${duration}s — ${succeeded}/${total} steps succeeded, ${skipped} skipped`);
  await appendToLog(dir, '---');
}

export async function logDeactivationStart(closingWorkspace: string, defaultWorkspace: string): Promise<void> {
  const dir = getActivationLogDir();
  await appendToLog(dir, `[${timestamp()}] DEACTIVATION START — Closing workspace: ${closingWorkspace} — Falling back to: ${defaultWorkspace}`);
}

export async function logDeactivationComplete(durationMs: number): Promise<void> {
  const dir = getActivationLogDir();
  const duration = (durationMs / 1000).toFixed(1);
  await appendToLog(dir, `[${timestamp()}] DEACTIVATION COMPLETE — Duration: ${duration}s`);
  await appendToLog(dir, '---');
}

export async function logStep(action: string, target: string, result: LogResult, error?: string): Promise<void> {
  const dir = getActivationLogDir();
  let line = `[${timestamp()}] ${action} — ${target} — ${result}`;
  if (error) line += ` — ${error}`;
  await appendToLog(dir, line);
}

// --- Dry run logging ---

export async function logDryRunStep(line: string): Promise<void> {
  await appendToLog(getDryRunLogDir(), line);
}

// --- Log rotation ---

export async function rotateOldLogs(maxFiles: number = 20): Promise<void> {
  for (const subDir of [getActivationLogDir(), getDryRunLogDir()]) {
    try {
      await ensureDir(subDir);
      const files = await fs.readdir(subDir);
      const logFiles = files.filter(f => f.endsWith('.log')).sort();
      if (logFiles.length > maxFiles) {
        const toDelete = logFiles.slice(0, logFiles.length - maxFiles);
        for (const file of toDelete) {
          await fs.unlink(path.join(subDir, file));
        }
      }
    } catch {
      // Best effort
    }
  }
}
