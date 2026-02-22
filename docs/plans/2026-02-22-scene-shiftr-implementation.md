# Scene Shiftr Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Windows desktop app that lets users create and switch between custom environments with one click.

**Architecture:** Electron main process handles all Windows system operations (process management, registry, nircmd, wallpaper). React renderer communicates exclusively through IPC via contextBridge. One JSON file per workspace stored in AppData.

**Tech Stack:** Electron, React 18, TypeScript, TailwindCSS, Vite (via electron-vite), Vitest, electron-store, dnd-kit, uuid

**Testing:** Vitest for unit tests. Mock all system calls (child_process, fs, registry). React Testing Library for component tests.

---

## Phase 1: Project Scaffolding

### Task 1: Initialize Electron + Vite + React + TypeScript project

**Files:**
- Create: `package.json`
- Create: `electron.vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tsconfig.web.json`
- Create: `src/main/main.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/index.html`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`

**Step 1: Scaffold with electron-vite**

Run:
```bash
npm create @quick-start/electron@latest scene-shiftr-app -- --template react-ts
```

Then move the generated files into the current project root (we already have docs here).

**Step 2: Install core dependencies**

Run:
```bash
npm install electron-store uuid
npm install -D tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom jsdom @types/uuid
```

**Step 3: Verify the app launches**

Run:
```bash
npm run dev
```

Expected: Electron window opens with default React content.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: scaffold Electron + Vite + React + TypeScript project"
```

---

### Task 2: Configure TailwindCSS v4

**Files:**
- Modify: `src/renderer/assets/main.css`
- Modify: `electron.vite.config.ts`

**Step 1: Add Tailwind import to main CSS**

Replace contents of `src/renderer/assets/main.css`:
```css
@import "tailwindcss";
```

**Step 2: Add Tailwind Vite plugin to renderer config**

In `electron.vite.config.ts`, add the `@tailwindcss/vite` plugin to the renderer config:
```typescript
import tailwindcss from '@tailwindcss/vite'

// In renderer config:
plugins: [react(), tailwindcss()]
```

**Step 3: Test Tailwind works**

Update `App.tsx` to use a Tailwind class like `<div className="bg-zinc-900 text-white min-h-screen">`. Run `npm run dev` and verify dark background renders.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: configure TailwindCSS v4 with Vite plugin"
```

---

### Task 3: Create shared types

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/constants.ts`

**Step 1: Write types**

Create `src/shared/types.ts` with all interfaces from the design doc:
```typescript
export interface Workspace {
  id: string;
  name: string;
  icon: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  apps: {
    open: AppEntry[];
    close: AppEntry[];
  };
  folders: string[];
  urls: string[];
  system: {
    nightLight: boolean | null;
    focusAssist: boolean | null;
    audioDevice: string | null;
    volume: number | null;
  };
  display: {
    wallpaper: string | null;
    monitorLayout: MonitorLayout | null;
  };
  audio: {
    transitionSound: string | null;
    musicApp: string | null;
    playlistUri: string | null;
  };
}

export interface AppEntry {
  name: string;
  path: string;
  args?: string;
}

export interface MonitorLayout {
  capturedAt: string;
  monitors: MonitorConfig[];
}

export interface MonitorConfig {
  deviceName: string;
  primary: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  refreshRate: number;
}

export interface SystemSnapshot {
  capturedAt: string;
  nightLight: boolean;
  focusAssist: boolean;
  audioDevice: string;
  volume: number;
  wallpaper: string;
}

export interface GlobalSettings {
  startWithWindows: boolean;
  defaultTransitionSound: string | null;
  confirmBeforeSwitching: boolean;
  gracefulCloseTimeout: number;
  activeWorkspaceId: string | null;
}

export type IpcChannel =
  | 'workspace:list'
  | 'workspace:get'
  | 'workspace:create'
  | 'workspace:update'
  | 'workspace:delete'
  | 'workspace:activate'
  | 'workspace:deactivate'
  | 'workspace:reorder'
  | 'process:detect-apps'
  | 'process:is-running'
  | 'system:get-audio-devices'
  | 'system:get-current-state'
  | 'display:capture-layout'
  | 'audio:preview-sound'
  | 'dialog:open-file'
  | 'dialog:open-folder'
  | 'settings:get'
  | 'settings:update';
```

**Step 2: Write constants**

Create `src/shared/constants.ts`:
```typescript
export const DEFAULT_SETTINGS: import('./types').GlobalSettings = {
  startWithWindows: false,
  defaultTransitionSound: null,
  confirmBeforeSwitching: false,
  gracefulCloseTimeout: 5,
  activeWorkspaceId: null,
};

export const BUILT_IN_SOUNDS = [
  { id: 'builtin:boot-up', name: 'Boot Up' },
  { id: 'builtin:switch', name: 'Switch' },
  { id: 'builtin:whoosh', name: 'Whoosh' },
  { id: 'builtin:click', name: 'Click' },
  { id: 'builtin:chime', name: 'Chime' },
] as const;

export function createEmptyWorkspace(id: string, name: string, order: number): import('./types').Workspace {
  return {
    id,
    name,
    icon: '🖥️',
    order,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    apps: { open: [], close: [] },
    folders: [],
    urls: [],
    system: {
      nightLight: null,
      focusAssist: null,
      audioDevice: null,
      volume: null,
    },
    display: {
      wallpaper: null,
      monitorLayout: null,
    },
    audio: {
      transitionSound: null,
      musicApp: null,
      playlistUri: null,
    },
  };
}
```

**Step 3: Commit**

```bash
git add src/shared/
git commit -m "feat: add shared types, constants, and workspace factory"
```

---

## Phase 2: Backend Services

### Task 4: Safety service

**Files:**
- Create: `src/main/services/safety.ts`
- Create: `src/main/services/__tests__/safety.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { isProcessSafe, assertSafeToKill } from '../safety';

describe('safety', () => {
  it('blocks Windows core processes', () => {
    expect(isProcessSafe('explorer.exe')).toBe(false);
    expect(isProcessSafe('csrss.exe')).toBe(false);
    expect(isProcessSafe('svchost.exe')).toBe(false);
    expect(isProcessSafe('dwm.exe')).toBe(false);
  });

  it('blocks audio processes', () => {
    expect(isProcessSafe('audiodg.exe')).toBe(false);
    expect(isProcessSafe('audioses.exe')).toBe(false);
  });

  it('blocks security processes', () => {
    expect(isProcessSafe('msmpeng.exe')).toBe(false);
    expect(isProcessSafe('trustedinstaller.exe')).toBe(false);
  });

  it('blocks Scene Shiftr itself', () => {
    expect(isProcessSafe('scene-shiftr.exe')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isProcessSafe('Explorer.EXE')).toBe(false);
    expect(isProcessSafe('CSRSS.EXE')).toBe(false);
  });

  it('allows user-installed apps', () => {
    expect(isProcessSafe('discord.exe')).toBe(true);
    expect(isProcessSafe('slack.exe')).toBe(true);
    expect(isProcessSafe('steam.exe')).toBe(true);
    expect(isProcessSafe('chrome.exe')).toBe(true);
  });

  it('assertSafeToKill throws for protected processes', () => {
    expect(() => assertSafeToKill('explorer.exe')).toThrow();
  });

  it('assertSafeToKill does not throw for user apps', () => {
    expect(() => assertSafeToKill('discord.exe')).not.toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/main/services/__tests__/safety.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement safety service**

```typescript
const PROTECTED_PROCESSES: Set<string> = new Set([
  // Windows core
  'csrss.exe', 'smss.exe', 'wininit.exe', 'winlogon.exe', 'services.exe',
  'lsass.exe', 'svchost.exe', 'dwm.exe', 'explorer.exe', 'taskhostw.exe',
  'sihost.exe', 'fontdrvhost.exe', 'ctfmon.exe',
  // Audio/Video
  'audiodg.exe', 'audioses.exe',
  // Networking
  'lsm.exe', 'networkservice.exe', 'localservice.exe',
  // Windows UI/Shell
  'applicationframehost.exe', 'systemsettings.exe', 'lockapp.exe',
  'logonui.exe', 'dllhost.exe', 'conhost.exe', 'smartscreen.exe',
  'runtimebroker.exe', 'shellexperiencehost.exe',
  'startmenuexperiencehost.exe', 'textinputhost.exe',
  // Windows Update/Security
  'trustedinstaller.exe', 'tiworker.exe', 'mrt.exe', 'msmpeng.exe',
  'nissrv.exe', 'securityhealthservice.exe', 'sgrmbroker.exe',
  // System Infrastructure
  'wudfhost.exe', 'dashost.exe', 'wmiprvse.exe', 'searchindexer.exe',
  'searchprotocolhost.exe', 'searchfilterhost.exe',
  'gamebarpresencewriter.exe', 'registry.exe', 'spoolsv.exe',
  // Self
  'scene-shiftr.exe',
]);

export function isProcessSafe(processName: string): boolean {
  return !PROTECTED_PROCESSES.has(processName.toLowerCase());
}

export function assertSafeToKill(processName: string): void {
  if (!isProcessSafe(processName)) {
    throw new Error(`Cannot kill protected system process: ${processName}`);
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/main/services/__tests__/safety.test.ts`
Expected: All PASS.

**Step 5: Commit**

```bash
git add src/main/services/safety.ts src/main/services/__tests__/safety.test.ts
git commit -m "feat: add safety service with protected process whitelist"
```

---

### Task 5: Workspace storage service

**Files:**
- Create: `src/main/services/workspace-storage.ts`
- Create: `src/main/services/__tests__/workspace-storage.test.ts`

**Step 1: Write failing tests**

Test CRUD operations: list, get, create, update, delete, reorder. Mock `fs` to avoid touching real filesystem. Test that workspaces are stored as individual JSON files in a configurable directory.

Key test cases:
- `listWorkspaces()` reads all `.json` files from workspace dir, returns sorted by `order`
- `getWorkspace(id)` reads `{id}.json` and parses it
- `createWorkspace(data)` generates UUID, writes `{uuid}.json`, returns workspace
- `updateWorkspace(id, data)` overwrites `{id}.json` with updated data + new `updatedAt`
- `deleteWorkspace(id)` removes `{id}.json`
- `reorderWorkspaces(ids)` updates `order` field on each workspace

**Step 2: Run tests — expect FAIL**

**Step 3: Implement workspace-storage.ts**

Use `fs.promises` for async file I/O. Use `path.join(app.getPath('appData'), 'scene-shiftr', 'workspaces')` for storage dir. Create dir on first access if it doesn't exist. Use `uuid` package to generate IDs.

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git add src/main/services/workspace-storage.ts src/main/services/__tests__/workspace-storage.test.ts
git commit -m "feat: add workspace storage service with CRUD operations"
```

---

### Task 6: Global settings store

**Files:**
- Create: `src/main/store.ts`

**Step 1: Implement settings store using electron-store**

```typescript
import Store from 'electron-store';
import { GlobalSettings } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/constants';

const store = new Store<GlobalSettings>({
  name: 'settings',
  defaults: DEFAULT_SETTINGS,
});

export function getSettings(): GlobalSettings {
  return store.store;
}

export function updateSettings(partial: Partial<GlobalSettings>): GlobalSettings {
  for (const [key, value] of Object.entries(partial)) {
    store.set(key, value);
  }
  return store.store;
}

export function getActiveWorkspaceId(): string | null {
  return store.get('activeWorkspaceId');
}

export function setActiveWorkspaceId(id: string | null): void {
  store.set('activeWorkspaceId', id);
}

export default store;
```

**Step 2: Commit**

```bash
git add src/main/store.ts
git commit -m "feat: add global settings store using electron-store"
```

---

### Task 7: Process manager service

**Files:**
- Create: `src/main/services/process-manager.ts`
- Create: `src/main/services/__tests__/process-manager.test.ts`

**Step 1: Write failing tests**

Test cases (mock `child_process.exec` and `child_process.spawn`):
- `launchApp(entry)` spawns detached process with correct path and args
- `launchApps(entries)` launches all in parallel, skips already running
- `closeApp(entry, timeout)` calls taskkill with PID, waits for exit
- `closeApp` checks safety service before killing
- `closeApp` returns `'closed' | 'timeout' | 'skipped'` status
- `isRunning(processName)` uses tasklist to check if process exists
- `getRunningProcesses()` parses tasklist output into array

**Step 2: Run tests — expect FAIL**

**Step 3: Implement process-manager.ts**

- `launchApp`: use `child_process.spawn` with `detached: true`, call `unref()` so app stays open after Scene Shiftr closes
- `closeApp`: use `taskkill /PID {pid}` (graceful), wait up to timeout, return status
- `isRunning`: use `tasklist /FI "IMAGENAME eq {name}"` and check output
- `getRunningProcesses`: use `tasklist /FO CSV /NH` and parse CSV output
- All kill operations go through `assertSafeToKill()` first

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git add src/main/services/process-manager.ts src/main/services/__tests__/process-manager.test.ts
git commit -m "feat: add process manager with launch, close, and detection"
```

---

### Task 8: App detector service

**Files:**
- Create: `src/main/services/app-detector.ts`
- Create: `src/main/services/__tests__/app-detector.test.ts`

**Step 1: Write failing tests**

Test cases (mock `fs` and `child_process` for registry reads):
- `detectInstalledApps()` returns array of `AppEntry`
- Scans Start Menu shortcuts (`.lnk` files) from both user and public Start Menu dirs
- Reads `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths` registry key
- Deduplicates entries by executable path
- Returns sorted by name

**Step 2: Run tests — expect FAIL**

**Step 3: Implement app-detector.ts**

- Scan Start Menu dirs: `%APPDATA%/Microsoft/Windows/Start Menu/Programs` and `%PROGRAMDATA%/Microsoft/Windows/Start Menu/Programs`
- Recursively find `.lnk` files using `fs.promises.readdir` with `recursive: true`
- Resolve `.lnk` targets using `shell.readShortcutLink()` (Electron API)
- Scan registry `App Paths` using `reg query` via `child_process.exec`
- Merge, deduplicate by normalized path, sort by name

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git add src/main/services/app-detector.ts src/main/services/__tests__/app-detector.test.ts
git commit -m "feat: add app detector scanning Start Menu and Registry"
```

---

### Task 9: System settings service

**Files:**
- Create: `src/main/services/system-settings.ts`
- Create: `src/main/services/__tests__/system-settings.test.ts`

**Step 1: Write failing tests**

Test cases (mock `child_process.exec`):
- `getNightLight()` reads registry key and returns boolean
- `setNightLight(on)` writes correct registry value
- `getFocusAssist()` reads Focus Assist state
- `setFocusAssist(on)` writes correct registry/PowerShell command
- `applySystemSettings(settings)` only applies non-null fields

**Step 2: Run tests — expect FAIL**

**Step 3: Implement system-settings.ts**

Night light: Read/write `HKCU\Software\Microsoft\Windows\CurrentVersion\CloudStore\Store\DefaultAccount\Current\default$windows.data.bluelightreduction.bluelightreductionstate` — the binary blob in this registry key controls night light. Use `reg query` / `reg add` via exec.

Focus assist: Use PowerShell to read/write `HKCU\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings` — `NOC_GLOBAL_SETTING_ALLOW_NOTIFICATION_SOUND` and related keys. Alternatively use the `Set-Focus` approach via PowerShell.

Both: wrap in try/catch, log errors but don't throw (system settings are best-effort).

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git add src/main/services/system-settings.ts src/main/services/__tests__/system-settings.test.ts
git commit -m "feat: add system settings service for night light and focus assist"
```

---

### Task 10: Audio controller service

**Files:**
- Create: `src/main/services/audio-controller.ts`
- Create: `src/main/services/__tests__/audio-controller.test.ts`

**Step 1: Write failing tests**

Test cases (mock `child_process.exec`):
- `getAudioDevices()` returns list of audio output device names
- `setAudioDevice(name)` calls nircmd with correct device name
- `getVolume()` returns current volume 0-100
- `setVolume(level)` calls nircmd with correct volume value
- Handles nircmd not found error gracefully

**Step 2: Run tests — expect FAIL**

**Step 3: Implement audio-controller.ts**

- Path to nircmd: `path.join(app.getAppPath(), 'tools', 'nircmd.exe')` (bundled)
- `getAudioDevices()`: use PowerShell `Get-AudioDevice -List` (from AudioDeviceCmdlets) or parse `nircmd.exe showsounddevices` output
- `setAudioDevice(name)`: `nircmd.exe setdefaultsounddevice "{name}"`
- `getVolume()`: `nircmd.exe showvolume` or use PowerShell
- `setVolume(level)`: `nircmd.exe setsysvolume {value}` where value = level * 655.35 (nircmd uses 0-65535 range)

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git add src/main/services/audio-controller.ts src/main/services/__tests__/audio-controller.test.ts
git commit -m "feat: add audio controller service wrapping nircmd"
```

---

### Task 11: Display controller service

**Files:**
- Create: `src/main/services/display-controller.ts`
- Create: `src/main/services/__tests__/display-controller.test.ts`

**Step 1: Write failing tests**

Test cases:
- `setWallpaper(imagePath)` calls correct system command
- `getWallpaper()` returns current wallpaper path
- `captureMonitorLayout()` returns `MonitorLayout` with current monitors
- `restoreMonitorLayout(layout)` applies saved monitor configuration

**Step 2: Run tests — expect FAIL**

**Step 3: Implement display-controller.ts**

- Wallpaper: Use `SystemParametersInfoW` via PowerShell:
  ```
  Add-Type -TypeDefinition '...' ; [Wallpaper]::Set("path")
  ```
  Or use `reg add "HKCU\Control Panel\Desktop" /v Wallpaper /d "path"` + `RUNDLL32.EXE user32.dll,UpdatePerUserSystemParameters`

- Get wallpaper: Read `HKCU\Control Panel\Desktop\Wallpaper` registry value

- Monitor layout capture: Use PowerShell `Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorBasicDisplayParams` combined with `[System.Windows.Forms.Screen]::AllScreens`

- Monitor layout restore: Use PowerShell with `SetDisplayConfig` or `ChangeDisplaySettingsEx` via P/Invoke. This is the most complex system integration.

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git add src/main/services/display-controller.ts src/main/services/__tests__/display-controller.test.ts
git commit -m "feat: add display controller for wallpaper and monitor layout"
```

---

### Task 12: Sound player service

**Files:**
- Create: `src/main/services/sound-player.ts`

**Step 1: Implement sound-player.ts**

```typescript
import { BrowserWindow } from 'electron';
import path from 'path';

export function playSound(soundId: string, mainWindow: BrowserWindow): void {
  // For built-in sounds: resolve to assets/sounds/{name}.mp3
  // For custom sounds: use the provided file path
  const soundPath = soundId.startsWith('builtin:')
    ? path.join(__dirname, '../../assets/sounds', soundId.replace('builtin:', '') + '.mp3')
    : soundId;

  // Send to renderer to play via HTML5 Audio API (simpler than node-based audio)
  mainWindow.webContents.send('play-sound', soundPath);
}
```

Note: Playing audio is simpler from the renderer process using the HTML5 Audio API. The main process just resolves the path and sends it over.

**Step 2: Create placeholder sound files**

Create empty `assets/sounds/` directory. Add placeholder `.mp3` files later (or generate simple tones).

**Step 3: Commit**

```bash
git add src/main/services/sound-player.ts assets/sounds/
git commit -m "feat: add sound player service for transition sounds"
```

---

### Task 13: State snapshot service

**Files:**
- Create: `src/main/services/state-snapshot.ts`
- Create: `src/main/services/__tests__/state-snapshot.test.ts`

**Step 1: Write failing tests**

Test cases (mock fs, system-settings, audio-controller, display-controller):
- `captureSnapshot()` reads current system state and saves to snapshot.json
- `captureSnapshot()` does NOT overwrite if snapshot.json already exists
- `restoreSnapshot()` reads snapshot.json and applies all settings
- `restoreSnapshot()` deletes snapshot.json after successful restore
- `hasSnapshot()` returns true/false based on file existence
- `discardSnapshot()` deletes snapshot.json without restoring

**Step 2: Run tests — expect FAIL**

**Step 3: Implement state-snapshot.ts**

```typescript
import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import { SystemSnapshot } from '../../shared/types';
import * as systemSettings from './system-settings';
import * as audioController from './audio-controller';
import * as displayController from './display-controller';

const SNAPSHOT_PATH = path.join(app.getPath('appData'), 'scene-shiftr', 'snapshot.json');

export async function hasSnapshot(): Promise<boolean> {
  try {
    await fs.access(SNAPSHOT_PATH);
    return true;
  } catch {
    return false;
  }
}

export async function captureSnapshot(): Promise<void> {
  if (await hasSnapshot()) return; // Preserve original baseline

  const snapshot: SystemSnapshot = {
    capturedAt: new Date().toISOString(),
    nightLight: await systemSettings.getNightLight(),
    focusAssist: await systemSettings.getFocusAssist(),
    audioDevice: await audioController.getCurrentDevice(),
    volume: await audioController.getVolume(),
    wallpaper: await displayController.getWallpaper(),
  };

  await fs.writeFile(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));
}

export async function restoreSnapshot(): Promise<void> {
  const data = await fs.readFile(SNAPSHOT_PATH, 'utf-8');
  const snapshot: SystemSnapshot = JSON.parse(data);

  await systemSettings.setNightLight(snapshot.nightLight);
  await systemSettings.setFocusAssist(snapshot.focusAssist);
  await audioController.setAudioDevice(snapshot.audioDevice);
  await audioController.setVolume(snapshot.volume);
  await displayController.setWallpaper(snapshot.wallpaper);

  await fs.unlink(SNAPSHOT_PATH);
}

export async function discardSnapshot(): Promise<void> {
  try {
    await fs.unlink(SNAPSHOT_PATH);
  } catch { /* ignore if doesn't exist */ }
}
```

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git add src/main/services/state-snapshot.ts src/main/services/__tests__/state-snapshot.test.ts
git commit -m "feat: add state snapshot service for system state backup/restore"
```

---

### Task 14: Workspace manager (orchestrator)

**Files:**
- Create: `src/main/services/workspace-manager.ts`
- Create: `src/main/services/__tests__/workspace-manager.test.ts`

**Step 1: Write failing tests**

Test cases (mock all dependent services):
- `activateWorkspace(workspace)` runs the full activation sequence in order
- `activateWorkspace` captures snapshot only on first activation
- `activateWorkspace` closes apps from close list via process-manager
- `activateWorkspace` applies system settings (skips null fields)
- `activateWorkspace` launches apps from open list
- `activateWorkspace` opens folders and URLs
- `activateWorkspace` tracks which apps it opened (for later deactivation)
- `deactivateWorkspace()` closes only apps opened by the workspace
- `deactivateWorkspace()` restores snapshot
- `switchWorkspace(from, to)` keeps apps common to both workspaces
- `switchWorkspace` does NOT overwrite the original snapshot

**Step 2: Run tests — expect FAIL**

**Step 3: Implement workspace-manager.ts**

This is the orchestrator. It coordinates all services in the correct sequence defined in the design doc. Key state tracked in memory:
- `activeWorkspaceId: string | null`
- `openedApps: Set<string>` — paths of apps opened by the current workspace (for deactivation)

The activation sequence follows steps 1-9 from the design doc exactly.

**Step 4: Run tests — expect PASS**

**Step 5: Commit**

```bash
git add src/main/services/workspace-manager.ts src/main/services/__tests__/workspace-manager.test.ts
git commit -m "feat: add workspace manager orchestrating activation sequence"
```

---

## Phase 3: IPC Layer

### Task 15: Preload script and contextBridge

**Files:**
- Modify: `src/preload/index.ts`

**Step 1: Implement preload script**

Expose a typed `api` object via `contextBridge.exposeInMainWorld`:

```typescript
import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // Workspace CRUD
  listWorkspaces: () => ipcRenderer.invoke('workspace:list'),
  getWorkspace: (id: string) => ipcRenderer.invoke('workspace:get', id),
  createWorkspace: (data: any) => ipcRenderer.invoke('workspace:create', data),
  updateWorkspace: (id: string, data: any) => ipcRenderer.invoke('workspace:update', id, data),
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

  // Display
  captureMonitorLayout: () => ipcRenderer.invoke('display:capture-layout'),

  // Audio
  previewSound: (soundId: string) => ipcRenderer.invoke('audio:preview-sound', soundId),

  // Dialogs
  openFileDialog: (filters?: any) => ipcRenderer.invoke('dialog:open-file', filters),
  openFolderDialog: () => ipcRenderer.invoke('dialog:open-folder'),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (data: any) => ipcRenderer.invoke('settings:update', data),

  // Events from main process
  onActivationProgress: (cb: (msg: string) => void) =>
    ipcRenderer.on('activation:progress', (_e, msg) => cb(msg)),
  onForceClosePrompt: (cb: (app: any) => void) =>
    ipcRenderer.on('activation:force-close-prompt', (_e, app) => cb(app)),
  respondForceClose: (app: string, action: 'force' | 'skip') =>
    ipcRenderer.invoke('activation:force-close-response', app, action),
  onPlaySound: (cb: (path: string) => void) =>
    ipcRenderer.on('play-sound', (_e, path) => cb(path)),
};

contextBridge.exposeInMainWorld('api', api);
```

**Step 2: Add TypeScript declaration for window.api**

Create `src/renderer/env.d.ts` (or add to existing) declaring `window.api` with proper types.

**Step 3: Commit**

```bash
git add src/preload/index.ts src/renderer/env.d.ts
git commit -m "feat: add preload script with typed contextBridge API"
```

---

### Task 16: IPC handlers (main process)

**Files:**
- Create: `src/main/ipc/workspace.ts`
- Create: `src/main/ipc/process.ts`
- Create: `src/main/ipc/system.ts`
- Create: `src/main/ipc/audio.ts`
- Create: `src/main/ipc/display.ts`
- Create: `src/main/ipc/shell.ts`
- Create: `src/main/ipc/settings.ts`
- Create: `src/main/ipc/index.ts`

**Step 1: Implement IPC handlers**

Each file registers `ipcMain.handle` listeners that delegate to services.

`ipc/index.ts` exports a `registerAllHandlers()` function called from `main.ts`.

Example for `ipc/workspace.ts`:
```typescript
import { ipcMain } from 'electron';
import * as storage from '../services/workspace-storage';
import * as manager from '../services/workspace-manager';

export function registerWorkspaceHandlers(): void {
  ipcMain.handle('workspace:list', () => storage.listWorkspaces());
  ipcMain.handle('workspace:get', (_e, id) => storage.getWorkspace(id));
  ipcMain.handle('workspace:create', (_e, data) => storage.createWorkspace(data));
  ipcMain.handle('workspace:update', (_e, id, data) => storage.updateWorkspace(id, data));
  ipcMain.handle('workspace:delete', (_e, id) => storage.deleteWorkspace(id));
  ipcMain.handle('workspace:reorder', (_e, ids) => storage.reorderWorkspaces(ids));
  ipcMain.handle('workspace:activate', (_e, id) => manager.activateWorkspaceById(id));
  ipcMain.handle('workspace:deactivate', () => manager.deactivateWorkspace());
}
```

Follow the same pattern for all other IPC handler files.

**Step 2: Commit**

```bash
git add src/main/ipc/
git commit -m "feat: add IPC handlers bridging renderer to all services"
```

---

### Task 17: Wire up main.ts

**Files:**
- Modify: `src/main/main.ts`

**Step 1: Update main.ts**

- Import and call `registerAllHandlers()` in `app.whenReady()`
- Create `BrowserWindow` with proper settings (dark background, min size)
- Set up `contextIsolation: true`, `nodeIntegration: false`, preload path
- Handle `window-all-closed` (don't quit — stay in tray)
- Handle `activate` (show window)

**Step 2: Test the app launches**

Run: `npm run dev`
Expected: Window opens, no console errors, tray not yet set up.

**Step 3: Commit**

```bash
git add src/main/main.ts
git commit -m "feat: wire up main process with IPC handlers and window config"
```

---

## Phase 4: Frontend — Layout & Navigation

### Task 18: App shell and layout components

**Files:**
- Modify: `src/renderer/App.tsx`
- Create: `src/renderer/components/layout/Sidebar.tsx`
- Create: `src/renderer/components/layout/MainPanel.tsx`
- Create: `src/renderer/components/layout/StatusBar.tsx`

**Step 1: Build the App shell**

`App.tsx`: Two-column layout. Sidebar on the left (fixed width ~240px), MainPanel filling the rest. StatusBar fixed at bottom.

```tsx
export default function App() {
  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainPanel />
      </div>
      <StatusBar />
    </div>
  );
}
```

**Step 2: Build Sidebar**

Dark background (`bg-zinc-900`), contains workspace list area and bottom buttons (+ New, Settings). For now, use placeholder content.

**Step 3: Build MainPanel**

Contains the workspace detail view. For now, show "Select a workspace" placeholder.

**Step 4: Build StatusBar**

Thin bar at bottom (`h-8 bg-zinc-900 border-t border-zinc-800`), shows status text. Default: "Ready".

**Step 5: Verify layout renders**

Run: `npm run dev`
Expected: Dark two-column layout with sidebar, main panel, and status bar.

**Step 6: Commit**

```bash
git add src/renderer/
git commit -m "feat: add app shell with Sidebar, MainPanel, and StatusBar"
```

---

### Task 19: App context and state management

**Files:**
- Create: `src/renderer/context/AppContext.tsx`
- Create: `src/renderer/hooks/useWorkspaces.ts`
- Create: `src/renderer/hooks/useSettings.ts`

**Step 1: Create AppContext**

React context providing:
- `workspaces: Workspace[]`
- `selectedWorkspaceId: string | null`
- `activeWorkspaceId: string | null` (which workspace is currently activated)
- `status: string` (status bar message)
- Actions: `selectWorkspace`, `refreshWorkspaces`, `setStatus`

**Step 2: Create useWorkspaces hook**

Wraps `window.api` calls for workspace CRUD. Fetches workspaces on mount, exposes create/update/delete/reorder functions that refresh the list after mutation.

**Step 3: Create useSettings hook**

Wraps `window.api.getSettings()` and `window.api.updateSettings()`.

**Step 4: Wire context into App.tsx**

Wrap `<App>` children in `<AppProvider>`.

**Step 5: Commit**

```bash
git add src/renderer/context/ src/renderer/hooks/
git commit -m "feat: add React context and hooks for workspace and settings state"
```

---

### Task 20: Workspace list component

**Files:**
- Create: `src/renderer/components/workspace/WorkspaceList.tsx`
- Create: `src/renderer/components/workspace/WorkspaceListItem.tsx`

**Step 1: Install dnd-kit**

Run: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

**Step 2: Build WorkspaceListItem**

Renders workspace icon + name. Highlights if selected. Shows active indicator (colored dot or bar) if this workspace is the currently active one. Click to select.

**Step 3: Build WorkspaceList**

Renders list of `WorkspaceListItem` wrapped in dnd-kit `SortableContext`. On drag end, calls `reorderWorkspaces` with new order. "+ New" button at the bottom.

**Step 4: Integrate into Sidebar**

Replace placeholder content in `Sidebar.tsx` with `<WorkspaceList />`.

**Step 5: Verify drag-to-reorder works**

Run: `npm run dev`. Create dummy workspace data in context. Verify items render and can be dragged.

**Step 6: Commit**

```bash
git add src/renderer/components/workspace/WorkspaceList.tsx src/renderer/components/workspace/WorkspaceListItem.tsx src/renderer/components/layout/Sidebar.tsx
git commit -m "feat: add workspace list with drag-to-reorder"
```

---

### Task 21: Workspace detail component

**Files:**
- Create: `src/renderer/components/workspace/WorkspaceDetail.tsx`
- Create: `src/renderer/components/common/CollapsibleSection.tsx`

**Step 1: Build CollapsibleSection**

Reusable component with a header (title + chevron icon) that toggles content visibility. Props: `title: string`, `defaultOpen: boolean`, `children`. Smooth height transition.

**Step 2: Build WorkspaceDetail**

Displays the selected workspace's configuration using collapsible sections:
- **Apps & Programs**: lists open/close apps
- **System Settings**: shows night light, focus assist, audio device, volume
- **Display**: shows wallpaper path, monitor layout status
- **Audio & Vibes**: shows transition sound, music config

Each section defaults to expanded if it has data, collapsed if all values are null/empty.

Top of the panel: workspace name + icon, big "Activate" button (or "Active" badge if already active).
Bottom: "Edit" and "Delete" buttons.

**Step 3: Integrate into MainPanel**

Show `<WorkspaceDetail>` when a workspace is selected, "Select a workspace" message otherwise.

**Step 4: Commit**

```bash
git add src/renderer/components/workspace/WorkspaceDetail.tsx src/renderer/components/common/CollapsibleSection.tsx src/renderer/components/layout/MainPanel.tsx
git commit -m "feat: add workspace detail view with collapsible sections"
```

---

### Task 22: Workspace create/edit form

**Files:**
- Create: `src/renderer/components/workspace/WorkspaceForm.tsx`
- Create: `src/renderer/components/workspace/AppSelector.tsx`
- Create: `src/renderer/components/workspace/TransitionSoundPicker.tsx`

**Step 1: Build WorkspaceForm**

Single scrollable page with all workspace fields. Sections:

1. **Name & Icon** — text input + emoji picker (simple text input for emoji, can enhance later)
2. **Apps to Open** — `<AppSelector>` component
3. **Apps to Close** — `<AppSelector>` component
4. **Folders** — list of folder paths with "Browse" button (calls `window.api.openFolderDialog()`) and "Remove" button per entry
5. **URLs** — text input with "Add" button, list of added URLs with "Remove"
6. **System Settings** — toggle switches for night light and focus assist (three-state: on/off/don't change). Dropdown for audio device (populated from `window.api.getAudioDevices()`). Slider for volume (0-100, with "Don't change" checkbox)
7. **Wallpaper** — file browse button (image filters), preview thumbnail
8. **Monitor Layout** — "Capture Current Layout" button that calls `window.api.captureMonitorLayout()`. Shows captured layout info or "Not set"
9. **Transition Sound** — `<TransitionSoundPicker>` with built-in list + browse for custom. Preview/play button
10. **Music** — toggle for auto-launch. Text input for Spotify playlist URI

Bottom: "Save" and "Cancel" buttons.

**Step 2: Build AppSelector**

Combo component:
- Searchable list of detected apps (from `window.api.detectApps()`) with checkboxes
- "Browse for .exe" button for manual addition
- Selected apps shown as removable chips/tags below

**Step 3: Build TransitionSoundPicker**

Dropdown of built-in sounds + "Browse for custom..." option. "Preview" button plays the selected sound via `window.api.previewSound()`.

**Step 4: Wire form into the app**

- "+ New" button in sidebar opens the form (empty state)
- "Edit" button in WorkspaceDetail opens the form (pre-populated)
- On save: call `createWorkspace` or `updateWorkspace`, refresh list, select the workspace

**Step 5: Commit**

```bash
git add src/renderer/components/workspace/WorkspaceForm.tsx src/renderer/components/workspace/AppSelector.tsx src/renderer/components/workspace/TransitionSoundPicker.tsx
git commit -m "feat: add workspace create/edit form with app selector and sound picker"
```

---

### Task 23: Settings page

**Files:**
- Create: `src/renderer/pages/SettingsPage.tsx`

**Step 1: Build SettingsPage**

Simple form with:
- **Start with Windows** — toggle switch
- **Default transition sound** — `<TransitionSoundPicker>`
- **Confirmation before switching** — toggle switch
- **Graceful close timeout** — number input (seconds)

"Save" button calls `window.api.updateSettings()`.

Navigation: "Settings" button in sidebar switches MainPanel to show SettingsPage instead of WorkspaceDetail.

**Step 2: Commit**

```bash
git add src/renderer/pages/SettingsPage.tsx
git commit -m "feat: add global settings page"
```

---

### Task 24: Activation flow UI

**Files:**
- Modify: `src/renderer/components/workspace/WorkspaceDetail.tsx`
- Create: `src/renderer/components/common/ForceCloseDialog.tsx`
- Modify: `src/renderer/components/layout/StatusBar.tsx`

**Step 1: Wire up Activate button**

Clicking "Activate" calls `window.api.activateWorkspace(id)`. While activating, button shows spinner/loading state.

**Step 2: Listen for activation progress**

On mount, register `window.api.onActivationProgress((msg) => setStatus(msg))`. StatusBar displays these messages in real-time ("Closing Slack...", "Switching audio device...", "Launching Steam...", "Done").

**Step 3: Build ForceCloseDialog**

Modal dialog triggered by `window.api.onForceClosePrompt()`. Shows: "App X didn't close within 5 seconds. Force close or skip?" Two buttons: "Force Close" and "Skip". Calls `window.api.respondForceClose(app, action)`.

**Step 4: Wire up Deactivate**

Show "Deactivate" or "Close Workspace" option when a workspace is active.

**Step 5: Commit**

```bash
git add src/renderer/components/workspace/WorkspaceDetail.tsx src/renderer/components/common/ForceCloseDialog.tsx src/renderer/components/layout/StatusBar.tsx
git commit -m "feat: add activation flow with progress feedback and force close dialog"
```

---

### Task 25: Sound playback in renderer

**Files:**
- Modify: `src/renderer/App.tsx`

**Step 1: Add sound playback listener**

In `App.tsx`, listen for `play-sound` events from main process:

```tsx
useEffect(() => {
  window.api.onPlaySound((soundPath: string) => {
    const audio = new Audio(`file://${soundPath}`);
    audio.play().catch(console.error);
  });
}, []);
```

**Step 2: Commit**

```bash
git add src/renderer/App.tsx
git commit -m "feat: add transition sound playback in renderer"
```

---

## Phase 5: System Tray

### Task 26: System tray integration

**Files:**
- Create: `src/main/tray.ts`
- Modify: `src/main/main.ts`

**Step 1: Implement tray.ts**

```typescript
import { Tray, Menu, nativeImage, BrowserWindow } from 'electron';
import * as workspaceStorage from './services/workspace-storage';
import * as workspaceManager from './services/workspace-manager';
import { getActiveWorkspaceId } from './store';

let tray: Tray | null = null;

export async function createTray(mainWindow: BrowserWindow): Promise<void> {
  const icon = nativeImage.createFromPath(/* app icon path */);
  tray = new Tray(icon);
  tray.setToolTip('Scene Shiftr');
  await updateTrayMenu(mainWindow);
}

export async function updateTrayMenu(mainWindow: BrowserWindow): Promise<void> {
  const workspaces = await workspaceStorage.listWorkspaces();
  const activeId = getActiveWorkspaceId();

  const workspaceItems = workspaces.map((ws) => ({
    label: `${ws.icon} ${ws.name}`,
    type: 'radio' as const,
    checked: ws.id === activeId,
    click: () => workspaceManager.activateWorkspaceById(ws.id),
  }));

  const menu = Menu.buildFromTemplate([
    ...workspaceItems,
    { type: 'separator' },
    {
      label: 'Close Workspace',
      enabled: activeId !== null,
      click: () => workspaceManager.deactivateWorkspace(),
    },
    { type: 'separator' },
    {
      label: 'Open Scene Shiftr',
      click: () => mainWindow.show(),
    },
    {
      label: 'Quit',
      click: () => { tray?.destroy(); mainWindow.destroy(); },
    },
  ]);

  tray?.setContextMenu(menu);
}
```

**Step 2: Wire into main.ts**

- Call `createTray(mainWindow)` after window creation
- On window close, hide to tray instead of quitting: `mainWindow.on('close', (e) => { e.preventDefault(); mainWindow.hide(); })`
- Rebuild tray menu after workspace CRUD operations and activation/deactivation

**Step 3: Test tray functionality**

Run: `npm run dev`. Verify tray icon appears, right-click shows workspace list, clicking a workspace triggers activation.

**Step 4: Commit**

```bash
git add src/main/tray.ts src/main/main.ts
git commit -m "feat: add system tray with workspace quick-switch menu"
```

---

## Phase 6: Startup & Packaging

### Task 27: Start with Windows setting

**Files:**
- Modify: `src/main/ipc/settings.ts`

**Step 1: Implement startup toggle**

When `startWithWindows` setting changes, call:
```typescript
app.setLoginItemSettings({
  openAtLogin: enabled,
  args: ['--minimized'],
});
```

In `main.ts`, check for `--minimized` arg on startup. If present, don't show the window (start in tray only).

**Step 2: Commit**

```bash
git add src/main/ipc/settings.ts src/main/main.ts
git commit -m "feat: add start-with-Windows setting via login items"
```

---

### Task 28: Build and packaging config

**Files:**
- Create: `electron-builder.yml`

**Step 1: Configure electron-builder**

```yaml
appId: com.sceneshiftr.app
productName: Scene Shiftr
directories:
  output: dist
  buildResources: build
files:
  - '!**/.vscode/*'
  - '!docs/*'
  - '!tests/*'
win:
  target:
    - nsis
  icon: build/icon.ico
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
extraResources:
  - from: tools/
    to: tools/
  - from: assets/sounds/
    to: assets/sounds/
```

**Step 2: Add build scripts to package.json**

```json
{
  "scripts": {
    "build": "electron-vite build",
    "package": "electron-vite build && electron-builder --win",
    "package:dir": "electron-vite build && electron-builder --win --dir"
  }
}
```

**Step 3: Test build**

Run: `npm run package:dir`
Expected: Unpacked app in `dist/win-unpacked/`. Launch the exe and verify it works.

**Step 4: Commit**

```bash
git add electron-builder.yml package.json
git commit -m "feat: add electron-builder config for Windows packaging"
```

---

## Phase 7: Integration Testing & Polish

### Task 29: End-to-end manual test pass

**No files — manual testing only.**

Test each scenario from the product design doc:

1. **Create a "Gaming" workspace** — add apps to open (any 2-3 apps you have), apps to close, set audio device, volume, wallpaper, transition sound
2. **Activate it** — verify all actions execute in order, status bar shows progress
3. **Create a "Work" workspace** — different set of apps and settings
4. **Switch Gaming → Work** — verify smart switching (common apps stay, Gaming-only apps close, Work apps open)
5. **Close workspace** — verify settings revert to original snapshot, workspace-opened apps close
6. **System tray** — verify right-click menu lists workspaces, clicking activates, "Close Workspace" works
7. **Drag reorder** — verify workspace list order persists
8. **Delete workspace** — verify removed from list and file deleted
9. **Settings** — verify all global settings save and apply

**Fix any bugs found during testing.**

### Task 30: Error handling pass

**Files:**
- Modify: various service files

Review each service for error handling:
- Invalid .exe paths → log warning, skip, continue activation
- Audio device not found → log warning, skip
- Wallpaper file missing → log warning, skip
- nircmd not found → log error, disable audio features gracefully
- Workspace JSON corrupted → log error, skip that workspace in list
- Filesystem permission errors → show user-friendly error in status bar

Principle: activation should never fully fail. Skip broken steps, report them, continue.

**Commit after fixes.**

---

## Task Dependency Graph

```
Task 1 (scaffold) → Task 2 (tailwind) → Task 3 (types)
                                              ↓
                    ┌─────────────────────────────────────────────┐
                    ↓           ↓          ↓          ↓          ↓
                Task 4      Task 5     Task 6     Task 9    Task 10
               (safety)   (storage)   (store)   (system)   (audio)
                    ↓           ↓                    ↓          ↓
                Task 7 ←────────┘              Task 11    Task 12
              (process)                       (display)   (sound)
                    ↓                              ↓
                Task 8                        Task 13
              (app-det)                      (snapshot)
                    ↓                              ↓
                    └──────────→ Task 14 ←─────────┘
                            (workspace-mgr)
                                   ↓
                    ┌──────────────┴──────────────┐
                    ↓                              ↓
                Task 15                        Task 16
              (preload)                     (ipc handlers)
                    ↓                              ↓
                    └──────────→ Task 17 ←─────────┘
                             (wire main.ts)
                                   ↓
                    ┌──────────────┴──────────────┐
                    ↓                              ↓
                Task 18                        Task 19
              (app shell)                    (context)
                    ↓                              ↓
                    └──────────→ Task 20 ←─────────┘
                           (workspace list)
                                   ↓
                              Task 21
                          (workspace detail)
                                   ↓
                    ┌──────────────┴──────────────┐
                    ↓                              ↓
                Task 22                        Task 23
              (ws form)                      (settings)
                    ↓
                Task 24
             (activation UI)
                    ↓
                Task 25
              (sound play)
                    ↓
                Task 26
               (sys tray)
                    ↓
                Task 27
              (startup)
                    ↓
                Task 28
             (packaging)
                    ↓
                Task 29
            (integration test)
                    ↓
                Task 30
            (error handling)
```
