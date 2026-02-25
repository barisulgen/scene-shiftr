import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// nircmd path — will be set at startup via setNircmdPath()
let nircmdPath = 'nircmd.exe';

export function setNircmdPath(p: string): void {
  nircmdPath = p;
}

export async function getAudioDevices(): Promise<string[]> {
  try {
    // Query active output/render endpoints via CoreAudioApi — same devices
    // shown in the Windows taskbar sound picker
    const script = `
      Add-Type -TypeDefinition @'
      using System;
      using System.Runtime.InteropServices;
      [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
      interface IMMDevice { int Activate(ref Guid id, int ctx, IntPtr p, [MarshalAs(UnmanagedType.IUnknown)] out object iface); int OpenPropertyStore(int access, [MarshalAs(UnmanagedType.IUnknown)] out object props); int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id); int GetState(out int state); }
      [Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
      interface IMMDeviceCollection { int GetCount(out int count); int Item(int index, out IMMDevice device); }
      [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
      interface IMMDeviceEnumerator { int EnumAudioEndpoints(int dataFlow, int stateMask, out IMMDeviceCollection devices); int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice device); }
      [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumerator {}
      public class AudioEndpoints {
        public static string[] GetPlaybackDevices() {
          var enumerator = (IMMDeviceEnumerator)new MMDeviceEnumerator();
          IMMDeviceCollection col; enumerator.EnumAudioEndpoints(0, 1, out col);
          int count; col.GetCount(out count);
          var names = new string[count];
          var propKey = new Guid("a45c254e-df1c-4efd-8020-67d146a850e0");
          for (int i = 0; i < count; i++) {
            IMMDevice dev; col.Item(i, out dev);
            object propStoreObj; dev.OpenPropertyStore(0, out propStoreObj);
            var ps = (IPropertyStore)propStoreObj;
            var pk = new PROPERTYKEY { fmtid = propKey, pid = 14 };
            PROPVARIANT pv; ps.GetValue(ref pk, out pv);
            names[i] = Marshal.PtrToStringUni(pv.pwszVal) ?? "";
          }
          return names;
        }
      }
      [Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
      interface IPropertyStore { int GetCount(out int count); int GetAt(int index, out PROPERTYKEY key); int GetValue(ref PROPERTYKEY key, out PROPVARIANT value); }
      [StructLayout(LayoutKind.Sequential)] struct PROPERTYKEY { public Guid fmtid; public int pid; }
      [StructLayout(LayoutKind.Sequential)] struct PROPVARIANT { public ushort vt; ushort r1; ushort r2; ushort r3; public IntPtr pwszVal; IntPtr p2; }
'@
      [AudioEndpoints]::GetPlaybackDevices() | ForEach-Object { $_ }
    `.trim().replace(/\n/g, ' ');

    const { stdout } = await execAsync(
      `powershell -NoProfile -Command "${script}"`,
      { maxBuffer: 1024 * 1024 }
    );
    const devices = stdout.trim().split('\n').map((s) => s.trim()).filter(Boolean);
    if (devices.length > 0) return devices;
    throw new Error('No devices from CoreAudio');
  } catch {
    // Fallback: use nircmd to list render devices
    try {
      const { stdout: nircmdOut } = await execAsync(
        `"${nircmdPath}" showsounddevices render`
      );
      return nircmdOut.trim().split('\n').map((s) => s.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }
}

export async function getCurrentDevice(): Promise<string> {
  try {
    // Use PowerShell to get active audio device
    const { stdout } = await execAsync(
      'powershell -NoProfile -Command "(Get-CimInstance -Namespace root/cimv2 -ClassName Win32_SoundDevice | Where-Object { $_.Status -eq \'OK\' } | Select-Object -First 1).Name"'
    );
    return stdout.trim();
  } catch {
    return '';
  }
}

export async function setAudioDevice(name: string): Promise<void> {
  try {
    await execAsync(`"${nircmdPath}" setdefaultsounddevice "${name}"`);
  } catch {
    // Best effort
  }
}

export async function getVolume(): Promise<number> {
  try {
    const { stdout } = await execAsync(
      'powershell -NoProfile -Command "[Math]::Round((Get-AudioDevice -PlaybackVolume).Volume)"'
    );
    const vol = parseInt(stdout.trim(), 10);
    return isNaN(vol) ? 50 : vol;
  } catch {
    return 50;
  }
}

export async function setVolume(level: number): Promise<void> {
  try {
    // nircmd uses 0-65535 range
    const nircmdLevel = Math.round(level * 655.35);
    await execAsync(`"${nircmdPath}" setsysvolume ${nircmdLevel}`);
  } catch {
    // Best effort
  }
}
