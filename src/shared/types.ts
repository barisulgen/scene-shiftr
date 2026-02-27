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

// Activation overlay types
export type StepStatus = 'pending' | 'in-progress' | 'success' | 'skipped' | 'failed';

export interface ActivationStep {
  id: string;
  label: string;
  status: StepStatus;
  error?: string;
}

export interface OverlayStartPayload {
  workspaceName: string;
  workspaceIcon: string;
  isDeactivation: boolean;
  steps: ActivationStep[];
}

export interface OverlayStepPayload {
  stepId: string;
  status: StepStatus;
  error?: string;
}

export interface OverlayCompletePayload {
  succeeded: number;
  total: number;
  skipped: number;
  failed: number;
}