# Scene Shiftr — Technical Design Document

**Date:** 2026-02-22
**Status:** Approved

---

## Summary

Scene Shiftr is a Windows desktop app that lets users create and switch between custom environments ("workspaces") with one click. Each workspace defines what apps open/close, what system settings change, and what the desktop looks/sounds like. The app lives in the system tray for quick access.

---

## Decisions

| Decision | Choice |
|----------|--------|
| Framework | Electron + React + TypeScript + TailwindCSS + Vite |
| Scope | Full spec V1 (all features from product design doc) |
| UI style | Clean minimal dark (flat, solid colors, no glass effects) |
| App detection | Auto-detect (Start Menu + Registry scan) + manual .exe browse |
| Storage | One JSON file per workspace in `%APPDATA%/scene-shiftr/workspaces/` |
| Audio tools | Bundle nircmd for audio device switching and volume control |
| Snapshot behavior | Capture once on first activation, preserve through switches, discard on deactivation |
| Safety | Hardcoded process whitelist — if the user didn't install it, it can't be killed |
| Workspace form | Single scrollable page (not multi-step wizard) |
| Null semantics | `null` in workspace settings means "don't change this setting" |

---

## Project Structure

```
scene-shiftr/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── main.ts              # Entry point, window creation, tray
│   │   ├── ipc/                 # IPC handlers (bridge between renderer & system)
│   │   │   ├── workspace.ts     # CRUD operations for workspace files
│   │   │   ├── system.ts        # Night light, focus assist, wallpaper
│   │   │   ├── audio.ts         # Audio device, volume, transition sounds
│   │   │   ├── process.ts       # App launch, close, detection
│   │   │   ├── display.ts       # Monitor layout
│   │   │   └── shell.ts         # Open folders, URLs
│   │   ├── services/            # Business logic
│   │   │   ├── workspace-manager.ts    # Workspace activation/deactivation orchestrator
│   │   │   ├── state-snapshot.ts       # Captures & restores system state
│   │   │   ├── safety.ts               # Protected process whitelist
│   │   │   ├── app-detector.ts         # Scans Start Menu + Registry
│   │   │   ├── process-manager.ts      # Launch, close, detect running processes
│   │   │   ├── system-settings.ts      # Night light, focus assist
│   │   │   ├── audio-controller.ts     # nircmd wrapper for audio
│   │   │   ├── display-controller.ts   # Wallpaper, monitor layout
│   │   │   └── sound-player.ts         # Transition sound playback
│   │   ├── tray.ts              # System tray setup and menu
│   │   └── store.ts             # Global settings (electron-store)
│   ├── renderer/                # React frontend
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── layout/          # Sidebar, MainPanel, StatusBar
│   │   │   ├── workspace/       # WorkspaceList, WorkspaceDetail, WorkspaceForm
│   │   │   └── common/          # Button, Toggle, Slider, Modal, etc.
│   │   ├── hooks/               # Custom React hooks for IPC calls
│   │   ├── context/             # React context for app state
│   │   ├── pages/               # Main, Settings, CreateWorkspace
│   │   └── styles/              # TailwindCSS config, global styles
│   ├── shared/                  # Types and constants shared between main & renderer
│   │   ├── types.ts             # Workspace, Settings, SystemState types
│   │   └── constants.ts         # Defaults, built-in sounds list
│   └── preload.ts               # Electron preload script (contextBridge)
├── assets/                      # Built-in transition sounds, app icon
├── tools/                       # Bundled nircmd
├── electron-builder.yml         # Build/packaging config
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── vite.config.ts               # Vite for renderer bundling
```

---

## IPC Architecture

Renderer never touches Node.js APIs directly. All system operations go through `contextBridge` -> IPC handlers -> services.

```
Renderer (React)                    Main Process (Node.js)

hooks/useWorkspace.ts  --invoke-->  ipc/workspace.ts --> services/workspace-manager.ts
hooks/useSystem.ts     --invoke-->  ipc/system.ts    --> services/system-settings.ts
hooks/useAudio.ts      --invoke-->  ipc/audio.ts     --> services/audio-controller.ts
hooks/useProcess.ts    --invoke-->  ipc/process.ts   --> services/process-manager.ts
                                                          |-- safety.ts (whitelist check)
                                                          +-- app-detector.ts
```

Request-response via `ipcRenderer.invoke` / `ipcMain.handle`. Real-time updates (activation progress, close prompts) pushed via `webContents.send`, renderer listens with `ipcRenderer.on`.

---

## Workspace Activation Sequence

1. **Snapshot** — `state-snapshot.ts` captures current system state (audio device, volume, night light, focus assist, wallpaper). Only captured if no existing snapshot exists (first activation from neutral state).
2. **Transition sound** — `sound-player.ts` plays sound (async, non-blocking).
3. **Close apps** — `process-manager.ts` gracefully closes apps in close list.
   - `safety.ts` validates each process is NOT whitelisted.
   - Sends SIGTERM per app.
   - Waits up to `gracefulCloseTimeout` (default 5s).
   - If still running: sends event to renderer, user prompt: "Force close or skip?"
4. **Display** — `display-controller.ts` sets wallpaper + restores monitor layout.
5. **System settings** — `system-settings.ts` applies night light, focus assist.
6. **Audio** — `audio-controller.ts` switches device + sets volume (via nircmd).
7. **Launch apps** — `process-manager.ts` launches apps in open list (parallel). Skips apps already running.
8. **Shell** — `shell.ts` opens folders + URLs.
9. **Music** — `shell.ts` launches music app / Spotify playlist URI.

## Deactivation ("Close Workspace")

1. `process-manager.ts` closes apps that were opened by the workspace (tracked in memory during activation).
2. `state-snapshot.ts` restores previous system state from snapshot.
3. `workspace-manager.ts` clears active workspace state and discards the snapshot.

## Smart Switching (Workspace A -> Workspace B)

1. Diff `A.apps_open` vs `B.apps_open` — apps in A but not in B get closed, apps in both stay running.
2. Process `B.apps_close` list (with safety check).
3. Apply B's system settings. Do NOT update the snapshot — the original pre-activation snapshot is preserved through all switches.
4. Launch `B.apps_open` (skip already running).

---

## Data Schema

### Workspace

```typescript
interface Workspace {
  id: string;                    // UUID
  name: string;
  icon: string;                  // Emoji or icon identifier
  order: number;                 // For drag-to-reorder in the list
  createdAt: string;             // ISO timestamp
  updatedAt: string;

  apps: {
    open: AppEntry[];
    close: AppEntry[];
  };

  folders: string[];             // Folder paths to open in Explorer
  urls: string[];                // URLs to open in default browser

  system: {
    nightLight: boolean | null;      // null = don't change
    focusAssist: boolean | null;
    audioDevice: string | null;      // Device name, null = don't change
    volume: number | null;           // 0-100, null = don't change
  };

  display: {
    wallpaper: string | null;        // Image path, null = don't change
    monitorLayout: MonitorLayout | null;
  };

  audio: {
    transitionSound: string | null;  // "builtin:name" or file path
    musicApp: string | null;         // e.g. "spotify"
    playlistUri: string | null;      // Spotify URI or similar
  };
}

interface AppEntry {
  name: string;
  path: string;                  // Full .exe path
  args?: string;                 // Optional launch arguments
}

interface MonitorLayout {
  capturedAt: string;
  monitors: MonitorConfig[];
}

interface MonitorConfig {
  deviceName: string;
  primary: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  refreshRate: number;
}
```

### System Snapshot

```typescript
interface SystemSnapshot {
  capturedAt: string;
  nightLight: boolean;
  focusAssist: boolean;
  audioDevice: string;
  volume: number;
  wallpaper: string;
}
```

### Global Settings

```typescript
interface GlobalSettings {
  startWithWindows: boolean;
  defaultTransitionSound: string | null;
  confirmBeforeSwitching: boolean;
  gracefulCloseTimeout: number;      // seconds, default 5
  activeWorkspaceId: string | null;
}
```

### Storage Locations

- Workspaces: `%APPDATA%/scene-shiftr/workspaces/{uuid}.json`
- Global settings: `%APPDATA%/scene-shiftr/settings.json`
- State snapshot: `%APPDATA%/scene-shiftr/snapshot.json`

---

## Safety Service

`services/safety.ts` contains a hardcoded whitelist of Windows system-critical processes that must never be killed. Guiding principle: **if the user didn't install it themselves, it shouldn't be killable.**

`process-manager.ts` calls `assertSafeToKill()` before every kill operation. No exceptions, no override flag.

### Protected Process Whitelist

**Windows Core:**
csrss.exe, smss.exe, wininit.exe, winlogon.exe, services.exe, lsass.exe, svchost.exe, dwm.exe, explorer.exe, taskhostw.exe, sihost.exe, fontdrvhost.exe, ctfmon.exe

**Audio/Video:**
audiodg.exe, audioses.exe

**Networking:**
lsm.exe, networkservice.exe, localservice.exe

**Windows UI/Shell:**
applicationframehost.exe, systemsettings.exe, lockapp.exe, logonui.exe, dllhost.exe, conhost.exe, smartscreen.exe, runtimebroker.exe, shellexperiencehost.exe, startmenuexperiencehost.exe, textinputhost.exe

**Windows Update/Security:**
trustedinstaller.exe, tiworker.exe, mrt.exe, msmpeng.exe, nissrv.exe, securityhealthservice.exe, sgrmbroker.exe

**System Infrastructure:**
wudfhost.exe, dashost.exe, wmiprvse.exe, searchindexer.exe, searchprotocolhost.exe, searchfilterhost.exe, gamebarpresencewriter.exe, registry.exe, spoolsv.exe

**Self:**
scene-shiftr.exe

---

## UI Design

### Visual Style

Clean minimal dark theme. Flat, solid colors, no glass/blur effects. High contrast, clear hierarchy. Comparable to Spotify or Linear.

### Main Window Layout

```
+-----------------------------------------------------+
|  Scene Shiftr                              -  []  x  |
+--------------+--------------------------------------+
|              |  * Active: Gaming                    |
|  Workspaces  |  +------------------------------+    |
|              |  |      [ Activate ]             |    |
|  Gaming    <-|  +------------------------------+    |
|  Work        |                                      |
|  Creative    |  v Apps & Programs                   |
|  Night       |    Open: Steam, Discord, Spotify     |
|              |    Close: Slack, Outlook, VS Code     |
|              |                                      |
|              |  v System Settings                   |
|              |    Night light: Off                   |
|              |    Focus assist: On                   |
|              |    Audio: HyperX Cloud II @ 70%       |
|              |                                      |
|              |  > Display                            |
|              |  > Audio & Vibes                      |
|              |                                      |
|  ----------  |              [ Edit ]   [ Delete ]   |
|  [ + New   ] |                                      |
|  Settings    |                                      |
+--------------+--------------------------------------+
|  Status: Ready                                      |
+-----------------------------------------------------+
```

### Component Tree

```
App
+-- Sidebar
|   +-- WorkspaceList (drag-to-reorder via dnd-kit)
|   |   +-- WorkspaceListItem (name, icon, active indicator)
|   +-- NewWorkspaceButton
|   +-- SettingsButton
+-- MainPanel
|   +-- ActiveBanner (shows current active workspace)
|   +-- ActivateButton
|   +-- WorkspaceDetail
|   |   +-- AppsSection (collapsible)
|   |   +-- SystemSection (collapsible)
|   |   +-- DisplaySection (collapsible)
|   |   +-- AudioSection (collapsible)
|   +-- ActionBar (Edit, Delete buttons)
+-- WorkspaceForm (modal or full-page for create/edit)
|   +-- NameIconStep
|   +-- AppSelector (detected apps list + manual browse)
|   +-- FolderSelector
|   +-- UrlInput
|   +-- SystemToggles
|   +-- WallpaperPicker
|   +-- MonitorLayoutCapture
|   +-- TransitionSoundPicker (with preview/play button)
|   +-- MusicConfig
+-- SettingsPage (global settings)
+-- ConfirmDialog (force close prompt, delete confirmation)
+-- StatusBar (bottom bar -- activation progress, errors)
```

### Key UI Behaviors

- Workspace form is a single scrollable page with all sections visible (not multi-step wizard).
- Collapsible sections in detail view default to expanded for sections with data, collapsed for empty ones.
- Activate button shows a brief progress indicator during the switching sequence.
- Status bar shows real-time feedback ("Closing Slack...", "Switching audio...", "Done").
