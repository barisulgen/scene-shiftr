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

export function createEmptyWorkspace(id: string, name: string, order: number): Workspace {
  return {
    id,
    name,
    icon: '🖥️',
    order,
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    apps: { open: [], close: [] },
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
      playlistUri: null,
    },
  };
}
