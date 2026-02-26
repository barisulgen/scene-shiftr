import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Workspace } from '../../../shared/types';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  mkdir: vi.fn(),
  access: vi.fn(),
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(),
}));

import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import {
  setStorageDir,
  listWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  reorderWorkspaces,
  ensureWorkspaceDir,
} from '../workspace-storage';

const mockedFs = vi.mocked(fs);
const mockedUuid = vi.mocked(uuidv4) as unknown as ReturnType<typeof vi.fn<() => string>>;

function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: 'test-id-1',
    name: 'Test Workspace',
    icon: '🖥️',
    order: 0,
    isDefault: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    apps: { open: [], close: [] },
    folders: [],
    closeFolders: false,
    urls: [],
    system: {
      audioDevice: null,
      volume: null,
    },
    display: {
      wallpaper: null,
    },
    audio: {
      transitionSound: null,
      playlistUri: null,
    },
    ...overrides,
  };
}

describe('workspace-storage', () => {
  const TEST_DIR = '/test/workspaces';

  beforeEach(() => {
    vi.clearAllMocks();
    setStorageDir(TEST_DIR);
  });

  describe('ensureWorkspaceDir', () => {
    it('creates directory if it does not exist', async () => {
      mockedFs.access.mockRejectedValue(new Error('ENOENT'));
      mockedFs.mkdir.mockResolvedValue(undefined);

      await ensureWorkspaceDir();

      expect(mockedFs.access).toHaveBeenCalledWith(TEST_DIR);
      expect(mockedFs.mkdir).toHaveBeenCalledWith(TEST_DIR, { recursive: true });
    });

    it('does not create directory if it already exists', async () => {
      mockedFs.access.mockResolvedValue(undefined);

      await ensureWorkspaceDir();

      expect(mockedFs.access).toHaveBeenCalledWith(TEST_DIR);
      expect(mockedFs.mkdir).not.toHaveBeenCalled();
    });
  });

  describe('listWorkspaces', () => {
    it('reads all .json files from workspace dir and returns them sorted by order', async () => {
      const ws1 = makeWorkspace({ id: 'id-1', name: 'Second', order: 1 });
      const ws2 = makeWorkspace({ id: 'id-2', name: 'First', order: 0 });
      const ws3 = makeWorkspace({ id: 'id-3', name: 'Third', order: 2 });

      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.readdir.mockResolvedValue(['id-1.json', 'id-2.json', 'id-3.json'] as any);
      mockedFs.readFile.mockImplementation((filePath: any) => {
        if (filePath.includes('id-1')) return Promise.resolve(JSON.stringify(ws1));
        if (filePath.includes('id-2')) return Promise.resolve(JSON.stringify(ws2));
        if (filePath.includes('id-3')) return Promise.resolve(JSON.stringify(ws3));
        return Promise.reject(new Error('Unknown file'));
      });

      const result = await listWorkspaces();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('First');
      expect(result[1].name).toBe('Second');
      expect(result[2].name).toBe('Third');
      expect(result[0].order).toBe(0);
      expect(result[1].order).toBe(1);
      expect(result[2].order).toBe(2);
    });

    it('returns empty array when no workspace files exist', async () => {
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.readdir.mockResolvedValue([] as any);

      const result = await listWorkspaces();

      expect(result).toEqual([]);
    });

    it('ignores non-json files in the directory', async () => {
      const ws = makeWorkspace({ id: 'id-1', name: 'Only One', order: 0 });

      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.readdir.mockResolvedValue(['id-1.json', 'readme.txt', '.gitkeep'] as any);
      mockedFs.readFile.mockResolvedValue(JSON.stringify(ws));

      const result = await listWorkspaces();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Only One');
    });

    it('ensures the workspace directory exists before reading', async () => {
      mockedFs.access.mockRejectedValue(new Error('ENOENT'));
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.readdir.mockResolvedValue([] as any);

      await listWorkspaces();

      expect(mockedFs.mkdir).toHaveBeenCalledWith(TEST_DIR, { recursive: true });
    });
  });

  describe('getWorkspace', () => {
    it('reads and parses a workspace file by id', async () => {
      const ws = makeWorkspace({ id: 'abc-123', name: 'My Workspace' });

      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.readFile.mockResolvedValue(JSON.stringify(ws));

      const result = await getWorkspace('abc-123');

      expect(result).toEqual(ws);
      expect(mockedFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('abc-123.json'),
        'utf-8',
      );
    });

    it('throws when workspace file does not exist', async () => {
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.readFile.mockRejectedValue(new Error('ENOENT: no such file'));

      await expect(getWorkspace('nonexistent')).rejects.toThrow();
    });
  });

  describe('createWorkspace', () => {
    it('generates UUID, creates workspace file, and returns workspace with id and timestamps', async () => {
      mockedUuid.mockReturnValue('generated-uuid-1');
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.readdir.mockResolvedValue([] as any);
      mockedFs.writeFile.mockResolvedValue(undefined);

      const now = '2025-06-15T12:00:00.000Z';
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(now);

      const result = await createWorkspace({ name: 'New Workspace', icon: '🎮' });

      expect(result.id).toBe('generated-uuid-1');
      expect(result.name).toBe('New Workspace');
      expect(result.icon).toBe('🎮');
      expect(result.createdAt).toBe(now);
      expect(result.updatedAt).toBe(now);
      expect(result.order).toBe(0);
      expect(result.apps).toEqual({ open: [], close: [] });
      expect(result.folders).toEqual([]);
      expect(result.urls).toEqual([]);

      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('generated-uuid-1.json'),
        expect.any(String),
        'utf-8',
      );

      // Verify the written JSON is valid and matches the returned workspace
      const writtenJson = (mockedFs.writeFile as any).mock.calls[0][1];
      expect(JSON.parse(writtenJson)).toEqual(result);

      vi.restoreAllMocks();
    });

    it('assigns order based on existing workspace count', async () => {
      mockedUuid.mockReturnValue('generated-uuid-2');
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.readdir.mockResolvedValue(['existing-1.json', 'existing-2.json'] as any);
      mockedFs.writeFile.mockResolvedValue(undefined);

      const result = await createWorkspace({ name: 'Third Workspace' });

      expect(result.order).toBe(2);
    });

    it('uses default icon when not provided', async () => {
      mockedUuid.mockReturnValue('generated-uuid-3');
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.readdir.mockResolvedValue([] as any);
      mockedFs.writeFile.mockResolvedValue(undefined);

      const result = await createWorkspace({ name: 'No Icon Workspace' });

      expect(result.icon).toBe('🖥️');
    });
  });

  describe('updateWorkspace', () => {
    it('reads existing workspace, merges data, and writes back with new updatedAt', async () => {
      const existing = makeWorkspace({
        id: 'update-id',
        name: 'Old Name',
        icon: '🖥️',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      });

      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.readFile.mockResolvedValue(JSON.stringify(existing));
      mockedFs.writeFile.mockResolvedValue(undefined);

      const now = '2025-06-15T14:00:00.000Z';
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(now);

      const result = await updateWorkspace('update-id', { name: 'New Name', icon: '🎯' });

      expect(result.name).toBe('New Name');
      expect(result.icon).toBe('🎯');
      expect(result.id).toBe('update-id');
      expect(result.createdAt).toBe('2025-01-01T00:00:00.000Z');
      expect(result.updatedAt).toBe(now);

      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('update-id.json'),
        expect.any(String),
        'utf-8',
      );

      vi.restoreAllMocks();
    });

    it('preserves fields that are not being updated', async () => {
      const existing = makeWorkspace({
        id: 'preserve-id',
        name: 'Keep This',
        folders: ['/path/to/folder'],
        urls: ['https://example.com'],
      });

      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.readFile.mockResolvedValue(JSON.stringify(existing));
      mockedFs.writeFile.mockResolvedValue(undefined);

      const result = await updateWorkspace('preserve-id', { icon: '🎨' });

      expect(result.name).toBe('Keep This');
      expect(result.folders).toEqual(['/path/to/folder']);
      expect(result.urls).toEqual(['https://example.com']);
      expect(result.icon).toBe('🎨');
    });

    it('does not allow id to be changed', async () => {
      const existing = makeWorkspace({ id: 'original-id' });

      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.readFile.mockResolvedValue(JSON.stringify(existing));
      mockedFs.writeFile.mockResolvedValue(undefined);

      const result = await updateWorkspace('original-id', { id: 'hacked-id' } as any);

      expect(result.id).toBe('original-id');
    });

    it('throws when workspace does not exist', async () => {
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.readFile.mockRejectedValue(new Error('ENOENT'));

      await expect(updateWorkspace('nonexistent', { name: 'Nope' })).rejects.toThrow();
    });
  });

  describe('deleteWorkspace', () => {
    it('removes the workspace file by id', async () => {
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.unlink.mockResolvedValue(undefined);

      await deleteWorkspace('delete-me');

      expect(mockedFs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('delete-me.json'),
      );
    });

    it('throws when workspace file does not exist', async () => {
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.unlink.mockRejectedValue(new Error('ENOENT'));

      await expect(deleteWorkspace('nonexistent')).rejects.toThrow();
    });
  });

  describe('reorderWorkspaces', () => {
    it('updates order field on each workspace to match array index', async () => {
      const ws1 = makeWorkspace({ id: 'ws-a', name: 'A', order: 0 });
      const ws2 = makeWorkspace({ id: 'ws-b', name: 'B', order: 1 });
      const ws3 = makeWorkspace({ id: 'ws-c', name: 'C', order: 2 });

      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.readFile.mockImplementation((filePath: any) => {
        if (filePath.includes('ws-a')) return Promise.resolve(JSON.stringify(ws1));
        if (filePath.includes('ws-b')) return Promise.resolve(JSON.stringify(ws2));
        if (filePath.includes('ws-c')) return Promise.resolve(JSON.stringify(ws3));
        return Promise.reject(new Error('Unknown file'));
      });
      mockedFs.writeFile.mockResolvedValue(undefined);

      // Reverse the order: C, B, A
      await reorderWorkspaces(['ws-c', 'ws-b', 'ws-a']);

      expect(mockedFs.writeFile).toHaveBeenCalledTimes(3);

      // Verify each workspace was written with the correct order
      const writeCalls = (mockedFs.writeFile as any).mock.calls;
      const writtenWorkspaces = writeCalls.map((call: any) => JSON.parse(call[1]));

      const wsC = writtenWorkspaces.find((w: Workspace) => w.id === 'ws-c');
      const wsB = writtenWorkspaces.find((w: Workspace) => w.id === 'ws-b');
      const wsA = writtenWorkspaces.find((w: Workspace) => w.id === 'ws-a');

      expect(wsC.order).toBe(0);
      expect(wsB.order).toBe(1);
      expect(wsA.order).toBe(2);
    });

    it('handles single workspace reorder', async () => {
      const ws = makeWorkspace({ id: 'only-one', order: 5 });

      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.readFile.mockResolvedValue(JSON.stringify(ws));
      mockedFs.writeFile.mockResolvedValue(undefined);

      await reorderWorkspaces(['only-one']);

      expect(mockedFs.writeFile).toHaveBeenCalledTimes(1);
      const written = JSON.parse((mockedFs.writeFile as any).mock.calls[0][1]);
      expect(written.order).toBe(0);
    });

    it('handles empty array', async () => {
      mockedFs.access.mockResolvedValue(undefined);

      await reorderWorkspaces([]);

      expect(mockedFs.readFile).not.toHaveBeenCalled();
      expect(mockedFs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('setStorageDir', () => {
    it('changes the storage directory used by all operations', async () => {
      const customDir = '/custom/path/workspaces';
      setStorageDir(customDir);

      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.readdir.mockResolvedValue([] as any);

      await listWorkspaces();

      expect(mockedFs.access).toHaveBeenCalledWith(customDir);
    });
  });
});
