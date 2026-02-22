import fs from 'fs/promises';
import path from 'path';
import type { DryRunLogEntry } from '../../shared/types';

let logDir = '';

export function setLogDir(dir: string): void {
  logDir = dir;
}

function getLogFilePath(): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(logDir, `dry-run-${date}.json`);
}

async function ensureLogDir(): Promise<void> {
  try {
    await fs.access(logDir);
  } catch {
    await fs.mkdir(logDir, { recursive: true });
  }
}

async function readExistingLog(filePath: string): Promise<DryRunLogEntry[]> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function log(action: string, details: Record<string, unknown>): Promise<void> {
  await ensureLogDir();

  const filePath = getLogFilePath();
  const entries = await readExistingLog(filePath);

  const entry: DryRunLogEntry = {
    timestamp: new Date().toISOString(),
    action,
    details,
  };

  entries.push(entry);
  await fs.writeFile(filePath, JSON.stringify(entries, null, 2));
}

export async function logActivation(
  workspaceName: string,
  actions: DryRunLogEntry[]
): Promise<void> {
  await ensureLogDir();

  const filePath = getLogFilePath();
  const entries = await readExistingLog(filePath);

  const sessionEntry: DryRunLogEntry = {
    timestamp: new Date().toISOString(),
    action: 'workspace:activate',
    details: {
      workspace: workspaceName,
      steps: actions,
    },
  };

  entries.push(sessionEntry);
  await fs.writeFile(filePath, JSON.stringify(entries, null, 2));
}

export async function logDeactivation(actions: DryRunLogEntry[]): Promise<void> {
  await ensureLogDir();

  const filePath = getLogFilePath();
  const entries = await readExistingLog(filePath);

  const sessionEntry: DryRunLogEntry = {
    timestamp: new Date().toISOString(),
    action: 'workspace:deactivate',
    details: {
      steps: actions,
    },
  };

  entries.push(sessionEntry);
  await fs.writeFile(filePath, JSON.stringify(entries, null, 2));
}
