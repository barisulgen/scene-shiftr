import { contextBridge, ipcRenderer, webFrame } from 'electron';

const api = {
  // Workspace CRUD
  listWorkspaces: () => ipcRenderer.invoke('workspace:list'),
  getWorkspace: (id: string) => ipcRenderer.invoke('workspace:get', id),
  createWorkspace: (data: Record<string, unknown>) =>
    ipcRenderer.invoke('workspace:create', data),
  updateWorkspace: (id: string, data: Record<string, unknown>) =>
    ipcRenderer.invoke('workspace:update', id, data),
  deleteWorkspace: (id: string) => ipcRenderer.invoke('workspace:delete', id),
  reorderWorkspaces: (ids: string[]) => ipcRenderer.invoke('workspace:reorder', ids),

  // Workspace actions
  activateWorkspace: (id: string) => ipcRenderer.invoke('workspace:activate', id),
  deactivateWorkspace: () => ipcRenderer.invoke('workspace:deactivate'),

  // Process
  detectApps: () => ipcRenderer.invoke('process:detect-apps'),
  isRunning: (name: string) => ipcRenderer.invoke('process:is-running', name),

  // System
  getAudioDevices: () => ipcRenderer.invoke('system:get-audio-devices'),
  getCurrentSystemState: () => ipcRenderer.invoke('system:get-current-state'),

  // Audio
  previewSound: (soundId: string) => ipcRenderer.invoke('audio:preview-sound', soundId),

  // Dialogs
  openFileDialog: (filters?: Record<string, unknown>) =>
    ipcRenderer.invoke('dialog:open-file', filters),
  openFolderDialog: () => ipcRenderer.invoke('dialog:open-folder'),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (data: Record<string, unknown>) =>
    ipcRenderer.invoke('settings:update', data),

  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowMaximize: () => ipcRenderer.invoke('window:maximize'),
  windowClose: () => ipcRenderer.invoke('window:close'),

  // Zoom & resize
  setZoomFactor: (factor: number) => webFrame.setZoomFactor(factor),
  resizeWindow: (width: number, height: number) => ipcRenderer.invoke('window:resize', width, height),

  // Events from main process
  onActivationProgress: (cb: (msg: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, msg: string): void => cb(msg);
    ipcRenderer.on('activation:progress', handler);
    return () => ipcRenderer.removeListener('activation:progress', handler);
  },
  onForceClosePrompt: (cb: (appName: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, appName: string): void => cb(appName);
    ipcRenderer.on('activation:force-close-prompt', handler);
    return () => ipcRenderer.removeListener('activation:force-close-prompt', handler);
  },
  respondForceClose: (app: string, action: 'force' | 'skip') =>
    ipcRenderer.invoke('activation:force-close-response', app, action),
  onPlaySound: (cb: (soundPath: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, soundPath: string): void => cb(soundPath);
    ipcRenderer.on('play-sound', handler);
    return () => ipcRenderer.removeListener('play-sound', handler);
  },

  // Activation overlay events
  onOverlayStart: (cb: (data: unknown) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, data: unknown): void => cb(data);
    ipcRenderer.on('activation:overlay-start', handler);
    return () => ipcRenderer.removeListener('activation:overlay-start', handler);
  },
  onOverlayStep: (cb: (data: unknown) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, data: unknown): void => cb(data);
    ipcRenderer.on('activation:overlay-step', handler);
    return () => ipcRenderer.removeListener('activation:overlay-step', handler);
  },
  onOverlayComplete: (cb: (data: unknown) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, data: unknown): void => cb(data);
    ipcRenderer.on('activation:overlay-complete', handler);
    return () => ipcRenderer.removeListener('activation:overlay-complete', handler);
  },
};

contextBridge.exposeInMainWorld('api', api);
