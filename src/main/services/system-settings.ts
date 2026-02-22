import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Night light: Toggle via registry binary blob at:
// HKCU\Software\Microsoft\Windows\CurrentVersion\CloudStore\Store\DefaultAccount\Current\
//   default$windows.data.bluelightreduction.bluelightreductionstate\
//   windows.data.bluelightreduction.bluelightreductionstate
//
// Byte at offset 18 controls state: 0x15 = enabled, 0x13 = disabled
// The settings key (separate from state key) indicates if night light is configured.

export async function getNightLight(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      'powershell -NoProfile -Command "' +
        "$path = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\CloudStore\\Store\\DefaultAccount\\Current\\default$windows.data.bluelightreduction.settings\\windows.data.bluelightreduction.settings'; " +
        "Get-ItemPropertyValue -Path $path -Name Data -ErrorAction SilentlyContinue | ForEach-Object { if ($_ -ne $null) { 'enabled' } else { 'disabled' } }" +
        '"'
    );
    return stdout.trim().toLowerCase().includes('enabled');
  } catch {
    return false;
  }
}

export async function setNightLight(enabled: boolean): Promise<void> {
  try {
    const byteValue = enabled ? '0x15' : '0x13';
    await execAsync(
      'powershell -NoProfile -Command "' +
        "$path = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\CloudStore\\Store\\DefaultAccount\\Current\\default$windows.data.bluelightreduction.bluelightreductionstate\\windows.data.bluelightreduction.bluelightreductionstate'; " +
        '$data = (Get-ItemProperty -Path $path -Name Data -ErrorAction SilentlyContinue).Data; ' +
        `if ($data) { $data[18] = ${byteValue}; Set-ItemProperty -Path $path -Name Data -Value ([byte[]]$data) -Type Binary }` +
        '"'
    );
  } catch {
    // Best effort - don't throw
  }
}

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
  nightLight: boolean | null;
  focusAssist: boolean | null;
}): Promise<void> {
  if (settings.nightLight !== null) {
    await setNightLight(settings.nightLight);
  }
  if (settings.focusAssist !== null) {
    await setFocusAssist(settings.focusAssist);
  }
}
