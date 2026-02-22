import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron';
import * as workspaceStorage from './services/workspace-storage';
import * as workspaceManager from './services/workspace-manager';

let tray: Tray | null = null;

export async function createTray(mainWindow: BrowserWindow): Promise<void> {
  // Create a small 16x16 tray icon from a data URL
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABhSURBVDiN7dMxDoAgEETRP2hjYeH9j+AFLCzEwsJoYUK0YoOJ7mYnM5tMsUP+FvBqFkjSMdmUdErSJtkfAEhaqG6SmWLGhjUbHLpRXGI9Bq/LKO4Bp68CPz77nyLFAHcW2BcFfheU8QAAAABJRU5ErkJggg=='
  );

  tray = new Tray(icon);
  tray.setToolTip('Scene Shiftr');
  tray.on('click', () => mainWindow.show());
  await updateTrayMenu(mainWindow);
}

export async function updateTrayMenu(mainWindow: BrowserWindow): Promise<void> {
  if (!tray) return;

  const workspaces = await workspaceStorage.listWorkspaces();
  const activeId = workspaceManager.getActiveWorkspaceId();

  const workspaceItems = workspaces.map((ws) => ({
    label: `${ws.icon} ${ws.name}`,
    type: 'radio' as const,
    checked: ws.id === activeId,
    click: async () => {
      await workspaceManager.activateWorkspaceById(ws.id, mainWindow.webContents);
      await updateTrayMenu(mainWindow);
    },
  }));

  const menu = Menu.buildFromTemplate([
    ...workspaceItems,
    { type: 'separator' },
    {
      label: 'Close Workspace',
      enabled: activeId !== null,
      click: async () => {
        await workspaceManager.deactivateWorkspace(mainWindow.webContents);
        await updateTrayMenu(mainWindow);
      },
    },
    { type: 'separator' },
    {
      label: 'Open Scene Shiftr',
      click: () => mainWindow.show(),
    },
    {
      label: 'Quit',
      click: () => {
        tray?.destroy();
        app.exit(0);
      },
    },
  ]);

  tray.setContextMenu(menu);
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
