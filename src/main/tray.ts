import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron';
import path from 'path';
import * as workspaceStorage from './services/workspace-storage';
import * as workspaceManager from './services/workspace-manager';

let tray: Tray | null = null;

function getTrayIconPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', 'tray-icon.png');
  }
  return path.join(app.getAppPath(), 'assets', 'tray-icon.png');
}

export async function createTray(mainWindow: BrowserWindow): Promise<void> {
  const icon = nativeImage.createFromPath(getTrayIconPath());
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
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
