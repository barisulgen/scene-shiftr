# Scene Shiftr — Product Design Document

## What Is Scene Shiftr?

Scene Shiftr is a Windows desktop app that lets you create and switch between custom environments with one click. Each workspace defines what apps open, what closes, what system settings change, what audio does, and what your desktop looks like. One click and your entire PC transforms from gaming mode to work mode to creative mode.

Think of it as scene switching for your computer.

---

## Core Concept

Right now, switching contexts on your PC is a manual 2-5 minute ritual. Going from work to gaming means: close Slack, close Outlook, close VS Code, open Steam, open Discord, open Spotify, switch audio to headset, turn off night light, change Do Not Disturb settings. Every single time.

Scene Shiftr turns that entire ritual into one click or one keyboard shortcut.

---

## What a Workspace Contains

Each workspace is a saved configuration with the following controls:

### Apps & Programs
- **Open:** list of apps/programs to launch when the workspace activates. Defined by executable path or app name
- **Close:** list of apps/programs to force-close when switching to this workspace. Optional — user chooses what to close, nothing is forced by default
- **Open folders:** specific folders to open in Explorer
- **Open URLs:** specific websites to open in default browser

### System Settings
- **Night light:** on or off
- **Focus assist / Do Not Disturb:** on or off
- **Audio output device:** switch to a specific device (headset, speakers, monitor audio, etc.)
- **Volume level:** set system volume to a specific percentage

### Display
- **Wallpaper:** set a specific wallpaper image per workspace
- **Multi-monitor layout:** save and restore monitor arrangement presets (which monitor is primary, positions, resolutions)

### Audio & Vibes
- **Transition sound:** play a short sound effect when the workspace activates. Ship with a few built-in sounds, allow custom audio files
- **Auto-launch music:** open Spotify (or other music app) and optionally start a specific playlist via URI

---

## App Interface

### Main Window

**Workspace List (Left Panel)**
- List of all created workspaces
- Each shows: workspace name, icon/emoji
- Click to select and view details
- Drag to reorder
- "+" button to create new workspace

**Workspace Detail (Right Panel)**
- Shows all settings for the selected workspace
- Organized in sections: Apps, System, Display, Audio
- Each section is expandable/collapsible
- Edit button to modify the workspace
- Big "Activate" button at the top

**Active Workspace Indicator**
- Somewhere prominent, shows which workspace is currently active
- Could be a colored bar, highlighted item in the list, or badge

### Create/Edit Workspace Flow

1. **Name & icon** — name the workspace, pick an emoji or icon
2. **Apps to open** — add by browsing for .exe files, or pick from a list of detected installed programs
3. **Apps to close** — same selection method
4. **Folders to open** — browse and select folder paths
5. **URLs to open** — text input, add multiple
6. **System settings** — toggles for night light, focus assist. Dropdown for audio output device. Slider for volume level
7. **Wallpaper** — browse for image file or skip
8. **Multi-monitor layout** — "Capture current layout" button that saves current monitor arrangement. Restore it when workspace activates
9. **Transition sound** — pick from built-in sounds or browse for custom audio file. Preview button to listen
10. **Music** — toggle auto-launch music on/off. Optional Spotify playlist URI field
11. **Save**

### System Tray

- Scene Shiftr lives in the system tray when minimized
- Right-click tray icon shows: list of all workspaces (click to activate), "Close current workspace", "Open Scene Shiftr"
- Tray icon could change color or shape based on active workspace
- App starts minimized to tray on Windows startup (optional setting)

---

## Workspace Switching Behavior

### Activating a Workspace
When you activate a workspace (via click or tray):

1. Transition sound plays (if set)
2. Apps in the "close" list are gracefully closed (SIGTERM, not force kill — give apps a chance to save). If an app doesn't close within 5 seconds, prompt user: force close or skip
3. Wallpaper changes (if set)
4. Monitor layout restores (if set)
5. System settings apply (night light, focus assist, audio device, volume)
6. Apps in the "open" list launch
7. Folders open
8. URLs open in default browser
9. Music app launches / playlist starts (if set)

Entire sequence should feel near-instant for system settings, with apps launching in parallel.

### Close Workspace / Deactivate
- "Close workspace" option in tray menu
- Closes all apps that were opened by the workspace
- Reverts system settings to their state before the workspace was activated (Scene Shiftr snapshots the previous state before switching)
- Does NOT reopen apps that were closed during activation — that would be chaotic. Just reverts settings and closes workspace-opened apps
- After closing, you're in a "no workspace" neutral state

### Switching Between Workspaces
- If Gaming workspace is active and you activate Work workspace:
  - Gaming's opened apps get closed (unless they're also in Work's open list)
  - Work's close list gets processed
  - Work's settings apply
  - Work's apps open
- Apps that exist in both workspaces stay open — no unnecessary close/reopen

---

## Settings

### Global Settings
- **Start with Windows:** launch Scene Shiftr minimized to tray on boot
- **Default transition sound:** set a default sound for workspaces that don't have one
- **Confirmation before switching:** toggle a "Are you sure?" prompt before workspace activation. Default off — one click should mean one click
- **Graceful close timeout:** how long to wait before prompting to force close an app (default 5 seconds)

---

## Scenarios

### After work, time to game
You right-click the tray icon, click "Gaming." A satisfying boot-up sound plays. Slack, Outlook, and VS Code close. Steam, Discord, and Spotify open. Audio switches to your headset at 70% volume. Night light turns off. Focus assist turns on. Wallpaper switches to your gaming setup background. Your Spotify gaming playlist starts. Took 3 seconds.

### Morning, time to work
You right-click the tray, click "Work." Steam and Discord close. VS Code, Chrome, Slack, and your project folder open. Audio switches to speakers at 40%. Night light turns on. Wallpaper changes to something minimal. You're in work mode.

### Creative session
Right-click tray icon, click "Creative." Photoshop, Premiere, and your assets folder open. Spotify launches your lo-fi playlist. Focus assist on. Second monitor becomes primary. Everything else stays as-is because you didn't add anything to the close list for this workspace.

### Late night browsing
Quick workspace with just: night light on, volume at 20%, Chrome opens. Nothing fancy. Not every workspace needs to be a full scene change.

### Friend wants to play
You're in Work mode. Friend messages you on your phone. You right-click the tray, hit "Gaming." Everything switches in seconds. You're in Discord before they finish typing "you on?"

### Done for the day
Right-click tray, "Close workspace." All work apps close, settings revert. Clean desktop. Computer feels neutral again.

---

## Technical Considerations

### Platform
- Windows 10/11 only
- **Electron** + React + TypeScript for a polished modern UI with full design freedom
- Node.js backend handles all Windows API calls and system-level operations
- React + TailwindCSS frontend — animations, dark mode, glassmorphism, whatever the design calls for
- Proven stack used by Discord, Figma, Spotify, Slack, VS Code, Notion

### Key Windows APIs (accessed via Node.js)
- **Process management:** child_process and tasklist/taskkill for launching and closing apps
- **Night light:** Registry manipulation via regedit or node-winreg
- **Focus assist:** Registry or PowerShell commands via child_process
- **Audio device switching:** node-audio-switcher or nircmd via child_process
- **Volume control:** nircmd or loudness via child_process
- **Wallpaper:** wallpaper npm package or SystemParametersInfo via ffi-napi
- **Monitor layout:** PowerShell display commands or nircmd via child_process
- **System tray:** Electron's built-in Tray API
- **Startup:** Electron's app.setLoginItemSettings() or registry

### Data Storage
- Workspaces saved as JSON files in AppData folder
- No backend, no accounts, fully local
- Each workspace is one JSON file — easy to backup, share, or version

### Workspace JSON Structure (Simplified)
```json
{
  "id": "uuid",
  "name": "Gaming",
  "icon": "🎮",
  "apps_open": [
    { "name": "Steam", "path": "C:\\Program Files\\Steam\\steam.exe", "args": "" },
    { "name": "Discord", "path": "C:\\Users\\...\\Discord.exe", "args": "" }
  ],
  "apps_close": [
    { "name": "Slack", "path": "C:\\...\\slack.exe" },
    { "name": "Outlook", "path": "C:\\...\\outlook.exe" }
  ],
  "folders_open": [],
  "urls_open": ["https://twitch.tv"],
  "system": {
    "night_light": false,
    "focus_assist": true,
    "audio_device": "HyperX Cloud II",
    "volume": 70
  },
  "display": {
    "wallpaper": "C:\\Users\\...\\gaming-wallpaper.jpg",
    "monitor_layout": null
  },
  "audio": {
    "transition_sound": "builtin:boot-up",
    "music_app": "spotify",
    "playlist_uri": "spotify:playlist:37i9dQZF1DX8Uebhn9wzrS"
  }
}
```

---

## What Scene Shiftr Is NOT

- Not a virtual desktop manager — it doesn't create separate Windows desktops, it changes your actual environment
- Not a launcher — it's not replacing your Start menu or taskbar. It orchestrates what's already on your PC
- Not a gaming overlay — no in-app FPS counter, no performance monitoring
- Not cross-platform — Windows only, uses deep Windows-specific APIs

---

## Future Ideas (Not V1)

- Auto-switch workspaces based on time of day or connected devices (e.g., when gaming controller connects, switch to Gaming)
- Workspace sharing — export/import workspace configs so friends can use your setup
- Community workspace templates — browse and download popular workspace configs
- Per-workspace window positions (remember where each app window sits on screen)
- Workspace usage stats (how much time in each workspace)
- Mac support
