import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function getWallpaper(): Promise<string> {
  try {
    const { stdout } = await execAsync(
      'reg query "HKCU\\Control Panel\\Desktop" /v Wallpaper'
    );
    const match = stdout.match(/Wallpaper\s+REG_SZ\s+(.+)/);
    return match ? match[1].trim() : '';
  } catch {
    return '';
  }
}

export async function setWallpaper(imagePath: string): Promise<void> {
  try {
    // Set registry value and refresh desktop
    await execAsync(
      `reg add "HKCU\\Control Panel\\Desktop" /v Wallpaper /t REG_SZ /d "${imagePath}" /f`
    );
    // Use PowerShell with SystemParametersInfo to apply immediately
    await execAsync(
      `powershell -NoProfile -Command "Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class Wallpaper{[DllImport(\\"user32.dll\\",CharSet=CharSet.Auto)]public static extern int SystemParametersInfo(int uAction,int uParam,string lpvParam,int fuWinIni);}'; [Wallpaper]::SystemParametersInfo(0x0014, 0, '${imagePath}', 0x01 -bor 0x02)"`
    );
  } catch {
    // Best effort
  }
}
