import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { AppEntry } from '../../shared/types';
import { assertSafeToKill } from './safety';

const execAsync = promisify(exec);

export async function launchApp(entry: AppEntry): Promise<void> {
  const args = entry.args ? entry.args.split(' ') : [];
  const child = spawn(entry.path, args, {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

export async function launchApps(entries: AppEntry[]): Promise<void> {
  const runningChecks = await Promise.all(
    entries.map(async (entry) => {
      const processName = entry.path.split('\\').pop() || '';
      const running = await isRunning(processName);
      return { entry, running };
    })
  );

  await Promise.all(
    runningChecks
      .filter(({ running }) => !running)
      .map(({ entry }) => launchApp(entry))
  );
}

export type CloseResult = 'closed' | 'timeout' | 'skipped';

export async function closeApp(processName: string, timeoutMs: number = 5000): Promise<CloseResult> {
  try {
    assertSafeToKill(processName);
  } catch {
    return 'skipped';
  }

  try {
    // Use taskkill without /F first (graceful)
    await execAsync(`taskkill /IM "${processName}"`);
  } catch {
    // Process might not exist or already closed
    return 'closed';
  }

  // Wait for process to actually terminate
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!(await isRunning(processName))) {
      return 'closed';
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return 'timeout';
}

export async function isRunning(processName: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`tasklist /FI "IMAGENAME eq ${processName}" /NH`);
    return !stdout.includes('INFO:') && stdout.toLowerCase().includes(processName.toLowerCase());
  } catch {
    return false;
  }
}

export async function getRunningProcesses(): Promise<string[]> {
  try {
    const { stdout } = await execAsync('tasklist /FO CSV /NH');
    const lines = stdout.trim().split('\n');
    return lines
      .map((line) => {
        const match = line.match(/^"([^"]+)"/);
        return match ? match[1] : '';
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}
