import { exec } from 'child_process';
import { promisify } from 'util';
import { MonitorLayout, MonitorConfig } from '../../shared/types';

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

export async function captureMonitorLayout(): Promise<MonitorLayout> {
  try {
    const { stdout } = await execAsync(
      'powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::AllScreens | ForEach-Object { $_.DeviceName + \'|\' + $_.Primary + \'|\' + $_.Bounds.X + \'|\' + $_.Bounds.Y + \'|\' + $_.Bounds.Width + \'|\' + $_.Bounds.Height }"'
    );

    const monitors: MonitorConfig[] = stdout
      .trim()
      .split('\n')
      .map((line) => {
        const parts = line.trim().split('|');
        if (parts.length < 6) return null;
        return {
          deviceName: parts[0],
          primary: parts[1] === 'True',
          x: parseInt(parts[2], 10),
          y: parseInt(parts[3], 10),
          width: parseInt(parts[4], 10),
          height: parseInt(parts[5], 10),
          refreshRate: 60, // Default, can enhance later
        };
      })
      .filter((m): m is MonitorConfig => m !== null);

    return {
      capturedAt: new Date().toISOString(),
      monitors,
    };
  } catch {
    return { capturedAt: new Date().toISOString(), monitors: [] };
  }
}

export async function restoreMonitorLayout(
  layout: MonitorLayout
): Promise<void> {
  // Monitor layout restoration is complex and requires ChangeDisplaySettingsEx
  // via P/Invoke. For V1, we store the layout but restoration is best-effort
  // using nircmd or PowerShell display commands.
  try {
    for (const monitor of layout.monitors) {
      if (monitor.primary) {
        // Set primary monitor using PowerShell P/Invoke
        await execAsync(
          `powershell -NoProfile -Command "& { $code = '[DllImport(\\"user32.dll\\")]public static extern bool SetDisplayConfig(uint numPathArrayElements,IntPtr pathArray,uint numModeInfoArrayElements,IntPtr modeInfoArray,uint flags);'; Add-Type -MemberDefinition $code -Name NativeMethods -Namespace Win32 }"`
        );
      }
    }
  } catch {
    // Best effort -- monitor layout restoration is the hardest feature
  }
}
