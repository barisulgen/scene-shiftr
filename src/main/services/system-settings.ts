import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Night light control removed — Windows has no public API for this. All known
// methods use fragile registry byte manipulation that can corrupt system
// settings and crash the Windows Settings app.

export async function getFocusAssist(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings" /v NOC_GLOBAL_SETTING_TOASTS_ENABLED'
    );
    // If the value is 0x0, toast notifications are disabled => focus assist is on
    return stdout.includes('0x0');
  } catch {
    return false;
  }
}

export async function setFocusAssist(enabled: boolean): Promise<void> {
  try {
    const value = enabled ? '0' : '1';
    await execAsync(
      `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings" /v NOC_GLOBAL_SETTING_TOASTS_ENABLED /t REG_DWORD /d ${value} /f`
    );
  } catch {
    // Best effort - don't throw
  }
}

export async function applySystemSettings(settings: {
  focusAssist: boolean | null;
}): Promise<void> {
  if (settings.focusAssist !== null) {
    await setFocusAssist(settings.focusAssist);
  }
}
