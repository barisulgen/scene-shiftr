# Scene Shiftr

A Windows desktop app that lets you create and switch between custom environments with one click. Each workspace defines what apps open, what closes, what system settings change, and what your desktop looks like.

## What It Does

- **Apps** -- Open and close programs automatically when switching workspaces
- **System Settings** -- Toggle night light, focus assist, switch audio devices, set volume
- **Display** -- Change wallpaper, capture and restore monitor layouts
- **Folders & URLs** -- Open specific folders and websites
- **Audio** -- Play transition sounds, auto-launch Spotify playlists
- **Dry Run Mode** -- Log all actions to JSON instead of executing them (for testing)

Switch from "Gaming" to "Work" and Scene Shiftr closes Steam, opens Slack, switches your headset to speakers, changes the wallpaper, and sets focus assist -- all in one click.

## Tech Stack

- **Electron** + **React 18** + **TypeScript**
- **Vite** (via electron-vite) for build tooling
- **TailwindCSS v4** for styling
- **Vitest** for testing (172 tests)
- **nircmd** for audio device switching and volume control

## Getting Started

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Package as Windows installer
npm run package
```

## Project Structure

```
src/
  main/           # Electron main process
    services/     # Backend services (process mgmt, audio, display, etc.)
    ipc/          # IPC handlers bridging renderer to services
    tray.ts       # System tray with workspace quick-switch
    store.ts      # Global settings (electron-store)
  renderer/       # React frontend
    components/   # UI components (sidebar, workspace list/detail/form)
    context/      # React context for app state
    hooks/        # Custom hooks for workspace and settings operations
    pages/        # Settings page
  shared/         # Types and constants shared between main & renderer
  preload/        # Electron preload script (contextBridge)
tools/            # Bundled nircmd.exe
assets/sounds/    # Transition sound files
```

## Key Features

### Smart Switching

When switching from Workspace A to Workspace B, apps that exist in both stay running. Only apps unique to A get closed, and only apps unique to B get launched.

### State Snapshot

The system captures your "neutral" state (audio device, volume, night light, wallpaper, etc.) on the first workspace activation. Switching between workspaces preserves this original snapshot. "Close Workspace" restores everything back to how it was.

### Safety Service

A hardcoded whitelist of 46 Windows system processes (explorer.exe, csrss.exe, svchost.exe, audiodg.exe, etc.) that can never be killed. If the user didn't install it, Scene Shiftr won't touch it.

### Dry Run Mode

Enable in Settings to log all workspace actions as timestamped JSON to `%APPDATA%/scene-shiftr/logs/` instead of executing them. Useful for testing workspace configurations without making system changes.

## Data Storage

- Workspaces: `%APPDATA%/scene-shiftr/workspaces/{uuid}.json`
- Settings: `%APPDATA%/scene-shiftr/settings.json`
- State snapshot: `%APPDATA%/scene-shiftr/snapshot.json`
- Dry run logs: `%APPDATA%/scene-shiftr/logs/dry-run-YYYY-MM-DD.json`

## License

MIT
