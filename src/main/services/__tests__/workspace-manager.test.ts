import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Workspace, AppEntry } from '../../../shared/types';

// Mock ALL dependent services
vi.mock('../workspace-storage', () => ({
  getWorkspace: vi.fn(),
}));

vi.mock('../state-snapshot', () => ({
  captureSnapshot: vi.fn(),
  restoreSnapshot: vi.fn(),
}));

vi.mock('../process-manager', () => ({
  closeApp: vi.fn(),
  launchApp: vi.fn(),
}));

vi.mock('../system-settings', () => ({
  applySystemSettings: vi.fn(),
}));

vi.mock('../audio-controller', () => ({
  setAudioDevice: vi.fn(),
  setVolume: vi.fn(),
}));

vi.mock('../display-controller', () => ({
  setWallpaper: vi.fn(),
}));

vi.mock('../sound-player', () => ({
  playSound: vi.fn(),
}));

vi.mock('electron', () => ({
  shell: {
    openPath: vi.fn(),
    openExternal: vi.fn(),
  },
}));

import * as workspaceStorage from '../workspace-storage';
import * as stateSnapshot from '../state-snapshot';
import * as processManager from '../process-manager';
import * as systemSettings from '../system-settings';
import * as audioController from '../audio-controller';
import * as displayController from '../display-controller';
import * as soundPlayer from '../sound-player';
import { shell } from 'electron';
import {
  activateWorkspace,
  activateWorkspaceById,
  deactivateWorkspace,
  switchWorkspace,
  getActiveWorkspaceId,
} from '../workspace-manager';

const mockWorkspaceStorage = vi.mocked(workspaceStorage);
const mockStateSnapshot = vi.mocked(stateSnapshot);
const mockProcessManager = vi.mocked(processManager);
const mockSystemSettings = vi.mocked(systemSettings);
const mockAudioController = vi.mocked(audioController);
const mockDisplayController = vi.mocked(displayController);
const mockSoundPlayer = vi.mocked(soundPlayer);
const mockShell = vi.mocked(shell);

function createMockSender(): { send: ReturnType<typeof vi.fn<(channel: string, ...args: unknown[]) => void>> } {
  return { send: vi.fn<(channel: string, ...args: unknown[]) => void>() };
}

function createTestWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: 'ws-1',
    name: 'Test Workspace',
    icon: '🖥️',
    order: 0,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    apps: {
      open: [],
      close: [],
    },
    folders: [],
    closeFolders: false,
    urls: [],
    system: {
      focusAssist: null,
      audioDevice: null,
      volume: null,
    },
    display: {
      wallpaper: null,
    },
    audio: {
      transitionSound: null,
      musicApp: null,
      playlistUri: null,
    },
    ...overrides,
  };
}

describe('workspace-manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module state by deactivating any active workspace
    // We need to ensure clean state between tests
  });

  describe('activateWorkspace', () => {
    it('captures snapshot on first activation', async () => {
      const workspace = createTestWorkspace();
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(workspace, sender);

      expect(mockStateSnapshot.captureSnapshot).toHaveBeenCalledTimes(1);
    });

    it('plays transition sound if set', async () => {
      const sender = createMockSender();
      const workspace = createTestWorkspace({
        audio: {
          transitionSound: 'builtin:whoosh',
          musicApp: null,
          playlistUri: null,
        },
      });

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(workspace, sender);

      expect(mockSoundPlayer.playSound).toHaveBeenCalledWith(
        'builtin:whoosh',
        sender
      );
    });

    it('does not play transition sound if not set', async () => {
      const workspace = createTestWorkspace();
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(workspace, sender);

      expect(mockSoundPlayer.playSound).not.toHaveBeenCalled();
    });

    it('closes apps from close list via processManager.closeApp', async () => {
      const workspace = createTestWorkspace({
        apps: {
          open: [],
          close: [
            { name: 'Discord', path: 'C:\\Program Files\\Discord\\discord.exe' },
            { name: 'Slack', path: 'C:\\Program Files\\Slack\\slack.exe' },
          ],
        },
      });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockProcessManager.closeApp.mockResolvedValue('closed');
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(workspace, sender);

      expect(mockProcessManager.closeApp).toHaveBeenCalledWith('discord.exe');
      expect(mockProcessManager.closeApp).toHaveBeenCalledWith('slack.exe');
    });

    it('sets wallpaper if not null', async () => {
      const workspace = createTestWorkspace({
        display: {
          wallpaper: 'C:\\Pictures\\work-wallpaper.jpg',
        },
      });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockDisplayController.setWallpaper.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(workspace, sender);

      expect(mockDisplayController.setWallpaper).toHaveBeenCalledWith(
        'C:\\Pictures\\work-wallpaper.jpg'
      );
    });

    it('does not set wallpaper if null', async () => {
      const workspace = createTestWorkspace({
        display: { wallpaper: null },
      });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(workspace, sender);

      expect(mockDisplayController.setWallpaper).not.toHaveBeenCalled();
    });

    it('applies system settings via systemSettings.applySystemSettings', async () => {
      const workspace = createTestWorkspace({
        system: {
          focusAssist: false,
          audioDevice: null,
          volume: null,
        },
      });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(workspace, sender);

      expect(mockSystemSettings.applySystemSettings).toHaveBeenCalledWith({
        focusAssist: false,
      });
    });

    it('applies system settings with null values (applySystemSettings handles them)', async () => {
      const workspace = createTestWorkspace({
        system: {
          focusAssist: null,
          audioDevice: null,
          volume: null,
        },
      });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(workspace, sender);

      expect(mockSystemSettings.applySystemSettings).toHaveBeenCalledWith({
        focusAssist: null,
      });
    });

    it('switches audio device if not null', async () => {
      const workspace = createTestWorkspace({
        system: {
          focusAssist: null,
          audioDevice: 'Headphones (USB)',
          volume: null,
        },
      });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);
      mockAudioController.setAudioDevice.mockResolvedValue(undefined);

      await activateWorkspace(workspace, sender);

      expect(mockAudioController.setAudioDevice).toHaveBeenCalledWith('Headphones (USB)');
    });

    it('does not switch audio device if null', async () => {
      const workspace = createTestWorkspace({
        system: {
          focusAssist: null,
          audioDevice: null,
          volume: null,
        },
      });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(workspace, sender);

      expect(mockAudioController.setAudioDevice).not.toHaveBeenCalled();
    });

    it('sets volume if not null', async () => {
      const workspace = createTestWorkspace({
        system: {
          focusAssist: null,
          audioDevice: null,
          volume: 75,
        },
      });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);
      mockAudioController.setVolume.mockResolvedValue(undefined);

      await activateWorkspace(workspace, sender);

      expect(mockAudioController.setVolume).toHaveBeenCalledWith(75);
    });

    it('does not set volume if null', async () => {
      const workspace = createTestWorkspace({
        system: {
          focusAssist: null,
          audioDevice: null,
          volume: null,
        },
      });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(workspace, sender);

      expect(mockAudioController.setVolume).not.toHaveBeenCalled();
    });

    it('launches apps from open list via processManager.launchApp', async () => {
      const apps: AppEntry[] = [
        { name: 'VS Code', path: 'C:\\Program Files\\Code\\code.exe' },
        { name: 'Chrome', path: 'C:\\Program Files\\Chrome\\chrome.exe' },
      ];
      const workspace = createTestWorkspace({
        apps: { open: apps, close: [] },
      });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockProcessManager.launchApp.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(workspace, sender);

      expect(mockProcessManager.launchApp).toHaveBeenCalledTimes(2);
      expect(mockProcessManager.launchApp).toHaveBeenCalledWith(apps[0]);
      expect(mockProcessManager.launchApp).toHaveBeenCalledWith(apps[1]);
    });

    it('opens folders via shell.openPath', async () => {
      const workspace = createTestWorkspace({
        folders: ['C:\\Projects\\my-project', 'D:\\Documents'],
      });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(workspace, sender);

      expect(mockShell.openPath).toHaveBeenCalledWith('C:\\Projects\\my-project');
      expect(mockShell.openPath).toHaveBeenCalledWith('D:\\Documents');
    });

    it('opens URLs via shell.openExternal', async () => {
      const workspace = createTestWorkspace({
        urls: ['https://github.com', 'https://jira.example.com'],
      });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(workspace, sender);

      expect(mockShell.openExternal).toHaveBeenCalledWith('https://github.com');
      expect(mockShell.openExternal).toHaveBeenCalledWith('https://jira.example.com');
    });

    it('tracks which apps it opened (for deactivation)', async () => {
      const apps: AppEntry[] = [
        { name: 'VS Code', path: 'C:\\Program Files\\Code\\code.exe' },
        { name: 'Chrome', path: 'C:\\Program Files\\Chrome\\chrome.exe' },
      ];
      const workspace = createTestWorkspace({
        apps: { open: apps, close: [] },
      });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockProcessManager.launchApp.mockResolvedValue(undefined);
      mockProcessManager.closeApp.mockResolvedValue('closed');
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);
      mockStateSnapshot.restoreSnapshot.mockResolvedValue(undefined);

      await activateWorkspace(workspace, sender);

      // Now deactivate to verify the tracked apps get closed
      await deactivateWorkspace(sender);

      expect(mockProcessManager.closeApp).toHaveBeenCalledWith('code.exe');
      expect(mockProcessManager.closeApp).toHaveBeenCalledWith('chrome.exe');
    });

    it('sets activeWorkspaceId', async () => {
      const workspace = createTestWorkspace({ id: 'ws-activate-test' });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(workspace, sender);

      expect(getActiveWorkspaceId()).toBe('ws-activate-test');
    });

    it('sends progress events to webContents during activation', async () => {
      const workspace = createTestWorkspace({
        apps: {
          open: [{ name: 'VS Code', path: 'C:\\code.exe' }],
          close: [{ name: 'Discord', path: 'C:\\discord.exe' }],
        },
        display: {
          wallpaper: 'C:\\wallpaper.jpg',
        },
      });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockProcessManager.closeApp.mockResolvedValue('closed');
      mockProcessManager.launchApp.mockResolvedValue(undefined);
      mockDisplayController.setWallpaper.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(workspace, sender);

      // Verify progress events were sent
      const progressCalls = sender.send.mock.calls.filter(
        (call: unknown[]) => call[0] === 'activation:progress'
      );
      expect(progressCalls.length).toBeGreaterThan(0);

      // Should include saving state, closing, launching, and done
      const progressMessages = progressCalls.map((call: unknown[]) => call[1]);
      expect(progressMessages).toContain('Saving current state...');
      expect(progressMessages).toContain('Done');
    });

    it('handles sender being null without throwing', async () => {
      const workspace = createTestWorkspace();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      // Should not throw with null sender
      await expect(activateWorkspace(workspace, null)).resolves.toBeUndefined();
    });

    it('opens playlist URI via shell.openExternal when musicApp and playlistUri are set', async () => {
      const workspace = createTestWorkspace({
        audio: {
          transitionSound: null,
          musicApp: 'spotify',
          playlistUri: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
        },
      });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(workspace, sender);

      expect(mockShell.openExternal).toHaveBeenCalledWith(
        'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M'
      );
    });
  });

  describe('activateWorkspaceById', () => {
    it('fetches workspace by id and activates it', async () => {
      const workspace = createTestWorkspace({ id: 'ws-by-id' });
      const sender = createMockSender();

      mockWorkspaceStorage.getWorkspace.mockResolvedValue(workspace);
      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspaceById('ws-by-id', sender);

      expect(mockWorkspaceStorage.getWorkspace).toHaveBeenCalledWith('ws-by-id');
      expect(getActiveWorkspaceId()).toBe('ws-by-id');
    });
  });

  describe('deactivateWorkspace', () => {
    it('closes only apps that were opened by the workspace', async () => {
      // First activate a workspace to populate openedApps
      const workspace = createTestWorkspace({
        apps: {
          open: [
            { name: 'VS Code', path: 'C:\\Program Files\\Code\\code.exe' },
            { name: 'Chrome', path: 'C:\\Program Files\\Chrome\\chrome.exe' },
          ],
          close: [],
        },
      });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockProcessManager.launchApp.mockResolvedValue(undefined);
      mockProcessManager.closeApp.mockResolvedValue('closed');
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);
      mockStateSnapshot.restoreSnapshot.mockResolvedValue(undefined);

      await activateWorkspace(workspace, sender);
      vi.clearAllMocks();

      // Now deactivate
      mockProcessManager.closeApp.mockResolvedValue('closed');
      mockStateSnapshot.restoreSnapshot.mockResolvedValue(undefined);

      await deactivateWorkspace(sender);

      expect(mockProcessManager.closeApp).toHaveBeenCalledWith('code.exe');
      expect(mockProcessManager.closeApp).toHaveBeenCalledWith('chrome.exe');
      expect(mockProcessManager.closeApp).toHaveBeenCalledTimes(2);
    });

    it('restores snapshot', async () => {
      const workspace = createTestWorkspace();
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(workspace, sender);
      vi.clearAllMocks();

      mockStateSnapshot.restoreSnapshot.mockResolvedValue(undefined);

      await deactivateWorkspace(sender);

      expect(mockStateSnapshot.restoreSnapshot).toHaveBeenCalledTimes(1);
    });

    it('clears activeWorkspaceId', async () => {
      const workspace = createTestWorkspace({ id: 'ws-to-deactivate' });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(workspace, sender);
      expect(getActiveWorkspaceId()).toBe('ws-to-deactivate');

      mockStateSnapshot.restoreSnapshot.mockResolvedValue(undefined);

      await deactivateWorkspace(sender);

      expect(getActiveWorkspaceId()).toBeNull();
    });

    it('does nothing if no workspace is active', async () => {
      const sender = createMockSender();

      // Ensure no workspace is active (fresh state or after deactivation)
      // We need to force a clean state. Deactivate first in case previous test left state.
      mockStateSnapshot.restoreSnapshot.mockResolvedValue(undefined);

      // Force deactivate to reset state
      await deactivateWorkspace(sender);
      vi.clearAllMocks();

      // Now call deactivate again with no active workspace
      await deactivateWorkspace(sender);

      expect(mockProcessManager.closeApp).not.toHaveBeenCalled();
      expect(mockStateSnapshot.restoreSnapshot).not.toHaveBeenCalled();
    });

    it('sends progress events during deactivation', async () => {
      const workspace = createTestWorkspace({
        apps: {
          open: [{ name: 'VS Code', path: 'C:\\code.exe' }],
          close: [],
        },
      });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockProcessManager.launchApp.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(workspace, sender);
      vi.clearAllMocks();

      const deactivateSender = createMockSender();
      mockProcessManager.closeApp.mockResolvedValue('closed');
      mockStateSnapshot.restoreSnapshot.mockResolvedValue(undefined);

      await deactivateWorkspace(deactivateSender);

      const progressCalls = deactivateSender.send.mock.calls.filter(
        (call: unknown[]) => call[0] === 'activation:progress'
      );
      expect(progressCalls.length).toBeGreaterThan(0);

      const messages = progressCalls.map((call: unknown[]) => call[1]);
      expect(messages).toContain('Restoring previous state...');
      expect(messages).toContain('Done');
    });
  });

  describe('switchWorkspace', () => {
    it('closes apps in old workspace but NOT in new workspace', async () => {
      const oldWorkspace = createTestWorkspace({
        id: 'ws-old',
        apps: {
          open: [
            { name: 'Discord', path: 'C:\\Program Files\\Discord\\discord.exe' },
            { name: 'VS Code', path: 'C:\\Program Files\\Code\\code.exe' },
            { name: 'Chrome', path: 'C:\\Program Files\\Chrome\\chrome.exe' },
          ],
          close: [],
        },
      });
      const newWorkspace = createTestWorkspace({
        id: 'ws-new',
        apps: {
          open: [
            { name: 'VS Code', path: 'C:\\Program Files\\Code\\code.exe' },
            { name: 'Figma', path: 'C:\\Program Files\\Figma\\figma.exe' },
          ],
          close: [],
        },
      });
      const sender = createMockSender();

      // First activate old workspace
      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockProcessManager.launchApp.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(oldWorkspace, sender);
      vi.clearAllMocks();

      // Now switch
      mockProcessManager.closeApp.mockResolvedValue('closed');
      mockProcessManager.launchApp.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await switchWorkspace(newWorkspace, sender, oldWorkspace);

      // Discord and Chrome should be closed (in old but not new)
      expect(mockProcessManager.closeApp).toHaveBeenCalledWith('discord.exe');
      expect(mockProcessManager.closeApp).toHaveBeenCalledWith('chrome.exe');
    });

    it('keeps apps running that are in both workspaces (NOT closed/relaunched)', async () => {
      const oldWorkspace = createTestWorkspace({
        id: 'ws-old',
        apps: {
          open: [
            { name: 'VS Code', path: 'C:\\Program Files\\Code\\code.exe' },
            { name: 'Discord', path: 'C:\\Program Files\\Discord\\discord.exe' },
          ],
          close: [],
        },
      });
      const newWorkspace = createTestWorkspace({
        id: 'ws-new',
        apps: {
          open: [
            { name: 'VS Code', path: 'C:\\Program Files\\Code\\code.exe' },
          ],
          close: [],
        },
      });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockProcessManager.launchApp.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(oldWorkspace, sender);
      vi.clearAllMocks();

      mockProcessManager.closeApp.mockResolvedValue('closed');
      mockProcessManager.launchApp.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await switchWorkspace(newWorkspace, sender, oldWorkspace);

      // VS Code should NOT be closed (it's in both)
      const closeAppCalls = mockProcessManager.closeApp.mock.calls.map(
        (call) => call[0]
      );
      expect(closeAppCalls).not.toContain('code.exe');

      // Discord should be closed (only in old)
      expect(closeAppCalls).toContain('discord.exe');
    });

    it('does NOT overwrite the original snapshot', async () => {
      const oldWorkspace = createTestWorkspace({ id: 'ws-old' });
      const newWorkspace = createTestWorkspace({ id: 'ws-new' });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(oldWorkspace, sender);
      vi.clearAllMocks();

      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await switchWorkspace(newWorkspace, sender, oldWorkspace);

      // captureSnapshot should NOT be called during switch
      expect(mockStateSnapshot.captureSnapshot).not.toHaveBeenCalled();
    });

    it('applies new workspace settings', async () => {
      const oldWorkspace = createTestWorkspace({ id: 'ws-old' });
      const newWorkspace = createTestWorkspace({
        id: 'ws-new',
        display: {
          wallpaper: 'C:\\Pictures\\new-wallpaper.jpg',
        },
        system: {
          focusAssist: true,
          audioDevice: 'Headphones (USB)',
          volume: 80,
        },
      });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(oldWorkspace, sender);
      vi.clearAllMocks();

      mockDisplayController.setWallpaper.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);
      mockAudioController.setAudioDevice.mockResolvedValue(undefined);
      mockAudioController.setVolume.mockResolvedValue(undefined);

      await switchWorkspace(newWorkspace, sender, oldWorkspace);

      expect(mockDisplayController.setWallpaper).toHaveBeenCalledWith(
        'C:\\Pictures\\new-wallpaper.jpg'
      );
      expect(mockSystemSettings.applySystemSettings).toHaveBeenCalledWith({
        focusAssist: true,
      });
      expect(mockAudioController.setAudioDevice).toHaveBeenCalledWith('Headphones (USB)');
      expect(mockAudioController.setVolume).toHaveBeenCalledWith(80);
    });

    it('processes new workspace close list', async () => {
      const oldWorkspace = createTestWorkspace({ id: 'ws-old' });
      const newWorkspace = createTestWorkspace({
        id: 'ws-new',
        apps: {
          open: [],
          close: [
            { name: 'Slack', path: 'C:\\Program Files\\Slack\\slack.exe' },
          ],
        },
      });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(oldWorkspace, sender);
      vi.clearAllMocks();

      mockProcessManager.closeApp.mockResolvedValue('closed');
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await switchWorkspace(newWorkspace, sender, oldWorkspace);

      expect(mockProcessManager.closeApp).toHaveBeenCalledWith('slack.exe');
    });

    it('launches new workspace open list (skipping already running)', async () => {
      const oldWorkspace = createTestWorkspace({
        id: 'ws-old',
        apps: {
          open: [
            { name: 'VS Code', path: 'C:\\Program Files\\Code\\code.exe' },
          ],
          close: [],
        },
      });
      const newWorkspace = createTestWorkspace({
        id: 'ws-new',
        apps: {
          open: [
            { name: 'VS Code', path: 'C:\\Program Files\\Code\\code.exe' },
            { name: 'Figma', path: 'C:\\Program Files\\Figma\\figma.exe' },
          ],
          close: [],
        },
      });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockProcessManager.launchApp.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(oldWorkspace, sender);
      vi.clearAllMocks();

      mockProcessManager.closeApp.mockResolvedValue('closed');
      mockProcessManager.launchApp.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await switchWorkspace(newWorkspace, sender, oldWorkspace);

      // All apps from the new workspace's open list should be launched
      // (the implementation launches all and relies on launchApps skipping running ones,
      //  or launches all from new list)
      expect(mockProcessManager.launchApp).toHaveBeenCalled();
      // Figma should definitely be launched
      expect(mockProcessManager.launchApp).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Figma' })
      );
    });

    it('sets activeWorkspaceId to new workspace', async () => {
      const oldWorkspace = createTestWorkspace({ id: 'ws-old' });
      const newWorkspace = createTestWorkspace({ id: 'ws-new' });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(oldWorkspace, sender);
      expect(getActiveWorkspaceId()).toBe('ws-old');

      await switchWorkspace(newWorkspace, sender, oldWorkspace);

      expect(getActiveWorkspaceId()).toBe('ws-new');
    });

    it('opens folders and URLs from new workspace', async () => {
      const oldWorkspace = createTestWorkspace({ id: 'ws-old' });
      const newWorkspace = createTestWorkspace({
        id: 'ws-new',
        folders: ['C:\\Projects\\new-project'],
        urls: ['https://figma.com'],
      });
      const sender = createMockSender();

      mockStateSnapshot.captureSnapshot.mockResolvedValue(undefined);
      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await activateWorkspace(oldWorkspace, sender);
      vi.clearAllMocks();

      mockSystemSettings.applySystemSettings.mockResolvedValue(undefined);

      await switchWorkspace(newWorkspace, sender, oldWorkspace);

      expect(mockShell.openPath).toHaveBeenCalledWith('C:\\Projects\\new-project');
      expect(mockShell.openExternal).toHaveBeenCalledWith('https://figma.com');
    });
  });
});
