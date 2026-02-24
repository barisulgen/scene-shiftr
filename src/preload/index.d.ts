import type { Workspace, AppEntry, GlobalSettings, MonitorLayout } from '../shared/types';

interface SceneShiftrAPI {
  listWorkspaces: () => Promise<Workspace[]>;
  getWorkspace: (id: string) => Promise<Workspace>;
  createWorkspace: (data: Partial<Workspace>) => Promise<Workspace>;
  updateWorkspace: (id: string, data: Partial<Workspace>) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  reorderWorkspaces: (ids: string[]) => Promise<void>;
  activateWorkspace: (id: string) => Promise<void>;
  deactivateWorkspace: () => Promise<void>;
  detectApps: () => Promise<AppEntry[]>;
  isRunning: (name: string) => Promise<boolean>;
  getAudioDevices: () => Promise<string[]>;
  getCurrentSystemState: () => Promise<{
    nightLight: boolean;
    focusAssist: boolean;
    audioDevice: string;
    volume: number;
    wallpaper: string;
  }>;
  captureMonitorLayout: () => Promise<MonitorLayout>;
  previewSound: (soundId: string) => Promise<void>;
  openFileDialog: (filters?: { name: string; extensions: string[] }[]) => Promise<string | null>;
  openFolderDialog: () => Promise<string | null>;
  getSettings: () => Promise<GlobalSettings>;
  updateSettings: (data: Partial<GlobalSettings>) => Promise<GlobalSettings>;
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  setZoomFactor: (factor: number) => void;
  onActivationProgress: (cb: (msg: string) => void) => () => void;
  onForceClosePrompt: (cb: (appName: string) => void) => () => void;
  respondForceClose: (app: string, action: 'force' | 'skip') => Promise<void>;
  onPlaySound: (cb: (soundPath: string) => void) => () => void;
}

declare global {
  interface Window {
    api: SceneShiftrAPI;
  }
}

export {};
