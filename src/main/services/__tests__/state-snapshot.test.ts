import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    access: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
    unlink: vi.fn(),
  },
}));

// Mock dependencies
vi.mock('../system-settings', () => ({
  getNightLight: vi.fn(),
  setNightLight: vi.fn(),
  getFocusAssist: vi.fn(),
  setFocusAssist: vi.fn(),
}));

vi.mock('../audio-controller', () => ({
  getCurrentDevice: vi.fn(),
  setAudioDevice: vi.fn(),
  getVolume: vi.fn(),
  setVolume: vi.fn(),
}));

vi.mock('../display-controller', () => ({
  getWallpaper: vi.fn(),
  setWallpaper: vi.fn(),
}));

import fs from 'fs/promises';
import * as systemSettings from '../system-settings';
import * as audioController from '../audio-controller';
import * as displayController from '../display-controller';
import {
  setSnapshotDir,
  hasSnapshot,
  captureSnapshot,
  restoreSnapshot,
  discardSnapshot,
} from '../state-snapshot';

const mockFs = vi.mocked(fs);
const mockSystemSettings = vi.mocked(systemSettings);
const mockAudioController = vi.mocked(audioController);
const mockDisplayController = vi.mocked(displayController);

const SAMPLE_SNAPSHOT = {
  capturedAt: '2025-01-01T00:00:00.000Z',
  nightLight: false,
  focusAssist: false,
  audioDevice: 'Speakers (Realtek)',
  volume: 75,
  wallpaper: 'C:\\Users\\Test\\Pictures\\wallpaper.jpg',
};

describe('state-snapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSnapshotDir('C:\\test\\snapshot-dir');
  });

  describe('hasSnapshot', () => {
    it('returns true when snapshot.json exists', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await hasSnapshot();

      expect(result).toBe(true);
      expect(mockFs.access).toHaveBeenCalledWith(
        expect.stringContaining('snapshot.json')
      );
    });

    it('returns false when snapshot.json does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      const result = await hasSnapshot();

      expect(result).toBe(false);
    });
  });

  describe('captureSnapshot', () => {
    it('reads current system state and saves to snapshot.json', async () => {
      // No existing snapshot
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.writeFile.mockResolvedValue(undefined);

      // Mock current system state
      mockSystemSettings.getNightLight.mockResolvedValue(false);
      mockSystemSettings.getFocusAssist.mockResolvedValue(false);
      mockAudioController.getCurrentDevice.mockResolvedValue('Speakers (Realtek)');
      mockAudioController.getVolume.mockResolvedValue(75);
      mockDisplayController.getWallpaper.mockResolvedValue('C:\\Users\\Test\\Pictures\\wallpaper.jpg');

      await captureSnapshot();

      expect(mockSystemSettings.getNightLight).toHaveBeenCalled();
      expect(mockSystemSettings.getFocusAssist).toHaveBeenCalled();
      expect(mockAudioController.getCurrentDevice).toHaveBeenCalled();
      expect(mockAudioController.getVolume).toHaveBeenCalled();
      expect(mockDisplayController.getWallpaper).toHaveBeenCalled();

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('snapshot.json'),
        expect.any(String)
      );

      // Verify the written data contains expected fields
      const writtenData = JSON.parse(mockFs.writeFile.mock.calls[0][1] as string);
      expect(writtenData.nightLight).toBe(false);
      expect(writtenData.focusAssist).toBe(false);
      expect(writtenData.audioDevice).toBe('Speakers (Realtek)');
      expect(writtenData.volume).toBe(75);
      expect(writtenData.wallpaper).toBe('C:\\Users\\Test\\Pictures\\wallpaper.jpg');
      expect(writtenData.capturedAt).toBeDefined();
    });

    it('does NOT overwrite if snapshot.json already exists', async () => {
      // Snapshot already exists
      mockFs.access.mockResolvedValue(undefined);

      await captureSnapshot();

      expect(mockFs.writeFile).not.toHaveBeenCalled();
      expect(mockSystemSettings.getNightLight).not.toHaveBeenCalled();
    });
  });

  describe('restoreSnapshot', () => {
    it('reads snapshot.json and applies all settings', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(SAMPLE_SNAPSHOT));
      mockFs.unlink.mockResolvedValue(undefined);
      mockSystemSettings.setNightLight.mockResolvedValue(undefined);
      mockSystemSettings.setFocusAssist.mockResolvedValue(undefined);
      mockAudioController.setAudioDevice.mockResolvedValue(undefined);
      mockAudioController.setVolume.mockResolvedValue(undefined);
      mockDisplayController.setWallpaper.mockResolvedValue(undefined);

      await restoreSnapshot();

      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('snapshot.json'),
        'utf-8'
      );
      expect(mockSystemSettings.setNightLight).toHaveBeenCalledWith(false);
      expect(mockSystemSettings.setFocusAssist).toHaveBeenCalledWith(false);
      expect(mockAudioController.setAudioDevice).toHaveBeenCalledWith('Speakers (Realtek)');
      expect(mockAudioController.setVolume).toHaveBeenCalledWith(75);
      expect(mockDisplayController.setWallpaper).toHaveBeenCalledWith(
        'C:\\Users\\Test\\Pictures\\wallpaper.jpg'
      );
    });

    it('deletes snapshot.json after successful restore', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(SAMPLE_SNAPSHOT));
      mockFs.unlink.mockResolvedValue(undefined);
      mockSystemSettings.setNightLight.mockResolvedValue(undefined);
      mockSystemSettings.setFocusAssist.mockResolvedValue(undefined);
      mockAudioController.setAudioDevice.mockResolvedValue(undefined);
      mockAudioController.setVolume.mockResolvedValue(undefined);
      mockDisplayController.setWallpaper.mockResolvedValue(undefined);

      await restoreSnapshot();

      expect(mockFs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('snapshot.json')
      );
    });
  });

  describe('discardSnapshot', () => {
    it('deletes snapshot.json without restoring', async () => {
      mockFs.unlink.mockResolvedValue(undefined);

      await discardSnapshot();

      expect(mockFs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('snapshot.json')
      );
      // Should NOT read or apply settings
      expect(mockFs.readFile).not.toHaveBeenCalled();
      expect(mockSystemSettings.setNightLight).not.toHaveBeenCalled();
      expect(mockSystemSettings.setFocusAssist).not.toHaveBeenCalled();
      expect(mockAudioController.setAudioDevice).not.toHaveBeenCalled();
      expect(mockAudioController.setVolume).not.toHaveBeenCalled();
      expect(mockDisplayController.setWallpaper).not.toHaveBeenCalled();
    });

    it('does not throw when snapshot.json does not exist', async () => {
      mockFs.unlink.mockRejectedValue(new Error('ENOENT'));

      await expect(discardSnapshot()).resolves.toBeUndefined();
    });
  });
});
