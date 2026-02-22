const PROTECTED_PROCESSES: Set<string> = new Set([
  // Windows core
  'csrss.exe', 'smss.exe', 'wininit.exe', 'winlogon.exe', 'services.exe',
  'lsass.exe', 'svchost.exe', 'dwm.exe', 'explorer.exe', 'taskhostw.exe',
  'sihost.exe', 'fontdrvhost.exe', 'ctfmon.exe',
  // Audio/Video
  'audiodg.exe', 'audioses.exe',
  // Networking
  'lsm.exe', 'networkservice.exe', 'localservice.exe',
  // Windows UI/Shell
  'applicationframehost.exe', 'systemsettings.exe', 'lockapp.exe',
  'logonui.exe', 'dllhost.exe', 'conhost.exe', 'smartscreen.exe',
  'runtimebroker.exe', 'shellexperiencehost.exe',
  'startmenuexperiencehost.exe', 'textinputhost.exe',
  // Windows Update/Security
  'trustedinstaller.exe', 'tiworker.exe', 'mrt.exe', 'msmpeng.exe',
  'nissrv.exe', 'securityhealthservice.exe', 'sgrmbroker.exe',
  // System Infrastructure
  'wudfhost.exe', 'dashost.exe', 'wmiprvse.exe', 'searchindexer.exe',
  'searchprotocolhost.exe', 'searchfilterhost.exe',
  'gamebarpresencewriter.exe', 'registry.exe', 'spoolsv.exe',
  // Self
  'scene-shiftr.exe',
]);

export function isProcessSafe(processName: string): boolean {
  return !PROTECTED_PROCESSES.has(processName.toLowerCase());
}

export function assertSafeToKill(processName: string): void {
  if (!isProcessSafe(processName)) {
    throw new Error(`Cannot kill protected system process: ${processName}`);
  }
}
