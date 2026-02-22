import { describe, it, expect } from 'vitest';
import { isProcessSafe, assertSafeToKill } from '../safety';

describe('safety', () => {
  it('blocks Windows core processes', () => {
    expect(isProcessSafe('explorer.exe')).toBe(false);
    expect(isProcessSafe('csrss.exe')).toBe(false);
    expect(isProcessSafe('svchost.exe')).toBe(false);
    expect(isProcessSafe('dwm.exe')).toBe(false);
  });

  it('blocks audio processes', () => {
    expect(isProcessSafe('audiodg.exe')).toBe(false);
    expect(isProcessSafe('audioses.exe')).toBe(false);
  });

  it('blocks networking processes', () => {
    expect(isProcessSafe('lsm.exe')).toBe(false);
    expect(isProcessSafe('networkservice.exe')).toBe(false);
    expect(isProcessSafe('localservice.exe')).toBe(false);
  });

  it('blocks Windows UI/Shell processes', () => {
    expect(isProcessSafe('applicationframehost.exe')).toBe(false);
    expect(isProcessSafe('systemsettings.exe')).toBe(false);
    expect(isProcessSafe('lockapp.exe')).toBe(false);
    expect(isProcessSafe('logonui.exe')).toBe(false);
    expect(isProcessSafe('dllhost.exe')).toBe(false);
    expect(isProcessSafe('conhost.exe')).toBe(false);
    expect(isProcessSafe('smartscreen.exe')).toBe(false);
    expect(isProcessSafe('runtimebroker.exe')).toBe(false);
    expect(isProcessSafe('shellexperiencehost.exe')).toBe(false);
    expect(isProcessSafe('startmenuexperiencehost.exe')).toBe(false);
    expect(isProcessSafe('textinputhost.exe')).toBe(false);
  });

  it('blocks security processes', () => {
    expect(isProcessSafe('msmpeng.exe')).toBe(false);
    expect(isProcessSafe('trustedinstaller.exe')).toBe(false);
    expect(isProcessSafe('tiworker.exe')).toBe(false);
    expect(isProcessSafe('mrt.exe')).toBe(false);
    expect(isProcessSafe('nissrv.exe')).toBe(false);
    expect(isProcessSafe('securityhealthservice.exe')).toBe(false);
    expect(isProcessSafe('sgrmbroker.exe')).toBe(false);
  });

  it('blocks system infrastructure processes', () => {
    expect(isProcessSafe('wudfhost.exe')).toBe(false);
    expect(isProcessSafe('dashost.exe')).toBe(false);
    expect(isProcessSafe('wmiprvse.exe')).toBe(false);
    expect(isProcessSafe('searchindexer.exe')).toBe(false);
    expect(isProcessSafe('searchprotocolhost.exe')).toBe(false);
    expect(isProcessSafe('searchfilterhost.exe')).toBe(false);
    expect(isProcessSafe('gamebarpresencewriter.exe')).toBe(false);
    expect(isProcessSafe('registry.exe')).toBe(false);
    expect(isProcessSafe('spoolsv.exe')).toBe(false);
  });

  it('blocks Scene Shiftr itself', () => {
    expect(isProcessSafe('scene-shiftr.exe')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isProcessSafe('Explorer.EXE')).toBe(false);
    expect(isProcessSafe('CSRSS.EXE')).toBe(false);
    expect(isProcessSafe('Audiodg.Exe')).toBe(false);
  });

  it('allows user-installed apps', () => {
    expect(isProcessSafe('discord.exe')).toBe(true);
    expect(isProcessSafe('slack.exe')).toBe(true);
    expect(isProcessSafe('steam.exe')).toBe(true);
    expect(isProcessSafe('chrome.exe')).toBe(true);
    expect(isProcessSafe('code.exe')).toBe(true);
    expect(isProcessSafe('spotify.exe')).toBe(true);
  });

  it('assertSafeToKill throws for protected processes', () => {
    expect(() => assertSafeToKill('explorer.exe')).toThrow('Cannot kill protected system process: explorer.exe');
  });

  it('assertSafeToKill does not throw for user apps', () => {
    expect(() => assertSafeToKill('discord.exe')).not.toThrow();
  });
});
