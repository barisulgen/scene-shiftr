export interface Workspace {
  id: string;
  name: string;
  icon: string;
  order: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  apps: {
    open: AppEntry[];
    close: AppEntry[];
  };
  folders: string[];
  closeFolders: boolean;
  urls: string[];
  system: {
    focusAssist: boolean | null;
    audioDevice: string | null;
    volume: number | null;
  };
  display: {
    wallpaper: string | null;
  };
  audio: {
    transitionSound: string | null;
    playlistUri: string | null;
  };
}

export interface AppEntry {
  name: string;
  path: string;
  args?: string;
}

export interface GlobalSettings {
  startWithWindows: boolean;
  defaultTransitionSound: string | null;
  confirmBeforeSwitching: boolean;
  gracefulCloseTimeout: number;
  activeWorkspaceId: string | null;
  dryRun: boolean;
  appScale: number;
}