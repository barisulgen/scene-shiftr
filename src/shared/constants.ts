import type { GlobalSettings, Workspace } from './types';

export const DEFAULT_SETTINGS: GlobalSettings = {
  startWithWindows: false,
  defaultTransitionSound: null,
  confirmBeforeSwitching: true,
  gracefulCloseTimeout: 5,
  activeWorkspaceId: null,
  dryRun: false,
  appScale: 120,
};

export const BUILT_IN_SOUNDS = [
  { id: 'builtin:boot-up', name: 'Boot Up' },
  { id: 'builtin:switch', name: 'Switch' },
  { id: 'builtin:whoosh', name: 'Whoosh' },
  { id: 'builtin:click', name: 'Click' },
  { id: 'builtin:chime', name: 'Chime' },
] as const;

export const WORKSPACE_COLORS = [
  '#E8636B', '#E89B5B', '#E8D45B', '#5BE88A',
  '#5B8EE8', '#8B5BA0', '#E85BAE', '#5BD4E8',
] as const;

export function randomWorkspaceColor(): string {
  return WORKSPACE_COLORS[Math.floor(Math.random() * WORKSPACE_COLORS.length)];
}

export function createEmptyWorkspace(id: string, name: string, order: number): Workspace {
  return {
    id,
    name,
    icon: '🖥️',
    color: '#E8636B',
    order,
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
      screensaver: null,
    },
    audio: {
      transitionSound: null,
      playlistUri: null,
    },
  };
}
