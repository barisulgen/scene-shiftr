import type { Workspace, AppEntry, GlobalSettings, OverlayStartPayload, OverlayStepPayload, OverlayCompletePayload } from '../shared/types';

interface SceneShiftrAPI {
  listWorkspaces: () => Promise<Workspace[]>;
  getWorkspace: (id: string) => Promise<Workspace>;
  createWorkspace: (data: Partial<Workspace>) => Promise<Workspace>;
  updateWorkspace: (id: string, data: Partial<Workspace>) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  reorderWorkspaces: (ids: string[]) => Promise<void>;
  resetWorkspaces: () => Promise<Workspace>;
  activateWorkspace: (id: string) => Promise<void>;
  deactivateWorkspace: () => Promise<void>;
  detectApps: () => Promise<AppEntry[]>;
  isRunning: (name: string) => Promise<boolean>;
  getAudioDevices: () => Promise<{ id: string; name: string }[]>;
  getCurrentSystemState: () => Promise<{
    audioDevice: string;
    volume: number;
    wallpaper: string;
  }>;
  previewSound: (soundId: string) => Promise<void>;
  openFileDialog: (filters?: { name: string; extensions: string[] }[]) => Promise<string | null>;
  openFolderDialog: () => Promise<string | null>;
  openLogsFolder: () => Promise<string>;
  getSettings: () => Promise<GlobalSettings>;
  updateSettings: (data: Partial<GlobalSettings>) => Promise<GlobalSettings>;
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  setZoomFactor: (factor: number) => void;
  resizeWindow: (width: number, height: number) => Promise<void>;
  onActivationProgress: (cb: (msg: string) => void) => () => void;
  onForceClosePrompt: (cb: (appName: string) => void) => () => void;
  respondForceClose: (app: string, action: 'force' | 'skip') => Promise<void>;
  onPlaySound: (cb: (soundPath: string) => void) => () => void;
  onOverlayStart: (cb: (data: OverlayStartPayload) => void) => () => void;
  onOverlayStep: (cb: (data: OverlayStepPayload) => void) => () => void;
  onOverlayComplete: (cb: (data: OverlayCompletePayload) => void) => () => void;
}

declare global {
  interface Window {
    api: SceneShiftrAPI;
  }
}

export {};
