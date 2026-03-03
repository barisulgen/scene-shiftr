import { ipcMain, BrowserWindow, dialog } from 'electron';
import * as fs from 'fs/promises';
import type { Workspace } from '../../shared/types';
import * as storage from '../services/workspace-storage';
import * as manager from '../services/workspace-manager';
import * as audioController from '../services/audio-controller';
import * as displayController from '../services/display-controller';
import { refreshTrayMenu } from '../tray-bridge';
import { setActiveWorkspaceId } from '../store';

export function registerWorkspaceHandlers(): void {
  ipcMain.handle('workspace:list', () => storage.listWorkspaces());
  ipcMain.handle('workspace:get', (_e, id: string) => storage.getWorkspace(id));

  ipcMain.handle('workspace:create', async (_e, data) => {
    const result = await storage.createWorkspace(data);
    refreshTrayMenu();
    return result;
  });

  ipcMain.handle('workspace:update', async (_e, id: string, data) => {
    const result = await storage.updateWorkspace(id, data);
    refreshTrayMenu();
    return result;
  });

  ipcMain.handle('workspace:delete', async (_e, id: string) => {
    await storage.deleteWorkspace(id);
    refreshTrayMenu();
  });

  ipcMain.handle('workspace:reorder', async (_e, ids: string[]) => {
    await storage.reorderWorkspaces(ids);
    refreshTrayMenu();
  });

  ipcMain.handle('workspace:activate', async (e, id: string) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    await manager.activateWorkspaceById(id, win?.webContents);
    refreshTrayMenu();
  });

  ipcMain.handle('workspace:deactivate', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    await manager.deactivateWorkspace(win?.webContents ?? null);
    refreshTrayMenu();
  });

  ipcMain.handle('workspace:reset', async () => {
    // 1. Delete all existing workspace files
    await storage.deleteAllWorkspaces();

    // 2. Read current system state
    const [audioDevice, volume, wallpaper] = await Promise.all([
      audioController.getCurrentDevice(),
      audioController.getVolume(),
      displayController.getWallpaper(),
    ]);

    // 3. Create a new default workspace
    const defaultWs = await storage.createDefaultWorkspace({
      audioDevice,
      volume,
      wallpaper,
    });

    // 4. Set it as active
    setActiveWorkspaceId(defaultWs.id);

    refreshTrayMenu();
    return defaultWs;
  });

  ipcMain.handle('workspace:export', async (_e, id: string) => {
    const workspace = await storage.getWorkspace(id);

    // Build export object — exclude internal fields
    const exportData = {
      exportVersion: '1.0',
      name: workspace.name,
      icon: workspace.icon,
      apps: workspace.apps,
      folders: workspace.folders,
      closeFolders: workspace.closeFolders,
      urls: workspace.urls,
      system: workspace.system,
      display: workspace.display,
      audio: workspace.audio,
    };

    const win = BrowserWindow.fromWebContents(_e.sender);
    const result = await dialog.showSaveDialog(win!, {
      defaultPath: `${workspace.name}.json`,
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    });

    if (!result.canceled && result.filePath) {
      await fs.writeFile(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8');
      return true;
    }
    return false;
  });

  ipcMain.handle('workspace:import', async (_e) => {
    const win = BrowserWindow.fromWebContents(_e.sender);
    const result = await dialog.showOpenDialog(win!, {
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile'],
    });

    if (result.canceled || !result.filePaths[0]) return null;

    const raw = await fs.readFile(result.filePaths[0], 'utf-8');
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw);
    } catch {
      return { error: 'Invalid JSON file' };
    }

    // Validate required fields
    if (!data.name || typeof data.name !== 'string') {
      return { error: 'Invalid workspace file — missing name' };
    }

    // Check for duplicate names
    const existing = await storage.listWorkspaces();
    let name = data.name;
    if (existing.some((w) => w.name === name)) {
      name = `${name} (imported)`;
    }

    // Create workspace from import data
    const workspaceData = {
      name,
      icon: (data.icon as string) || '\u{1F5A5}\u{FE0F}',
      apps: (data.apps as Workspace['apps']) || { open: [], close: [] },
      folders: (data.folders as string[]) || [],
      closeFolders: (data.closeFolders as boolean) || false,
      urls: (data.urls as string[]) || [],
      system: (data.system as { audioDevice: string | null; volume: number | null }) || {
        audioDevice: null,
        volume: null,
      },
      display: (data.display as { wallpaper: string | null }) || { wallpaper: null },
      audio: (data.audio as { transitionSound: string | null; playlistUri: string | null }) || {
        transitionSound: null,
        playlistUri: null,
      },
    };

    const ws = await storage.createWorkspace(workspaceData);
    refreshTrayMenu();
    return { workspace: ws };
  });

  ipcMain.handle('workspace:duplicate', async (_e, id: string) => {
    const workspace = await storage.getWorkspace(id);

    const duplicateData = {
      name: `${workspace.name} (copy)`,
      icon: workspace.icon,
      apps: workspace.apps,
      folders: workspace.folders,
      closeFolders: workspace.closeFolders,
      urls: workspace.urls,
      system: workspace.system,
      display: workspace.display,
      audio: workspace.audio,
    };

    const ws = await storage.createWorkspace(duplicateData);
    refreshTrayMenu();
    return ws;
  });
}
