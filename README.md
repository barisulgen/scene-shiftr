# Scene Shiftr

Scene Shiftr is a Windows desktop app that lets you create and switch between custom workspaces. Each workspace defines what apps open, what closes, what system settings change, and what your desktop looks like. Going from work mode to gaming mode takes 3 seconds instead of 5 minutes.

![Windows 10/11](https://img.shields.io/badge/Windows-10%2F11-0078D6?logo=windows)
![Electron](https://img.shields.io/badge/Electron-React%20%2B%20TypeScript-47848F?logo=electron)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

---

## What It Does

Right now, switching contexts on your PC is a manual ritual. Going from work to gaming means: close Slack, close Outlook, close VS Code, open Steam, open Discord, open Spotify, switch audio to your headset, turn off night light, change Do Not Disturb. Every. Single. Time.

Scene Shiftr turns that entire ritual into one click.

### What a Workspace Can Control

- **Apps** — open and close specific programs
- **System settings** — night light, focus assist, audio device, volume level
- **Display** — wallpaper, multi-monitor layout
- **Folders & URLs** — open specific folders and websites
- **Audio & vibes** — transition sounds, auto-launch Spotify playlists
- **Dry Run Mode** -- Log all actions to JSON instead of executing them (for testing)

### Example

> You right-click the tray icon, click "Gaming." A boot-up sound plays. Slack, Outlook, and VS Code close. Steam, Discord, and Spotify open. Audio switches to your headset at 70%. Night light turns off. Focus assist turns on. Your gaming playlist starts. Took 3 seconds.

## Tech Stack

- **Electron** + **React 18** + **TypeScript**
- **Vite** (via electron-vite) for build tooling
- **TailwindCSS v4** for styling
- **Vitest** for testing (172 tests)
- **nircmd** for audio device switching and volume control

## Getting Started



```bash
# Install dependencies
git clone https://github.com/YOUR_USERNAME/scene-shiftr.git
cd scene-shiftr
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
---

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

### Dry Run Mode

Enable in Settings to log all workspace actions as timestamped JSON to `%APPDATA%/scene-shiftr/logs/` instead of executing them. Useful for testing workspace configurations without making system changes.

## Data Storage

- Workspaces: `%APPDATA%/scene-shiftr/workspaces/{uuid}.json`
- Settings: `%APPDATA%/scene-shiftr/settings.json`
- State snapshot: `%APPDATA%/scene-shiftr/snapshot.json`
- Dry run logs: `%APPDATA%/scene-shiftr/logs/dry-run-YYYY-MM-DD.json`

## Safety

Scene Shiftr directly manipulates your OS — it changes audio devices, registry values, wallpapers, and kills processes. I take this seriously:

- **Process whitelist** — system-critical Windows processes (explorer.exe, csrss.exe, svchost.exe, dwm.exe, etc.) can never be killed, regardless of workspace configuration
- **State snapshots** — your system state is captured before the first workspace activation and restored on deactivation
- **Graceful close** — apps are asked to close nicely before any force-close prompt
- **Null = don't touch** — any setting left as `null` in a workspace config is left completely untouched

---

## Contributing

I welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to get started, our development process, and how to submit pull requests.

Quick links:
- [Report a bug](../../issues/new?template=bug_report.md)
- [Request a feature](../../issues/new?template=feature_request.md)
- [Contributing guide](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)

---

## Roadmap

- [✅] Dry run mode (preview what a workspace will do before activating)
- [ ] System state debug panel (compare what the app thinks vs actual system state)
- [ ] Auto-switch based on time of day or connected devices
- [ ] Workspace export/import
- [ ] Community workspace templates
- [ ] Per-workspace window positions
- [ ] Workspace usage stats

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [nircmd](https://www.nirsoft.net/utils/nircmd.html) by NirSoft for audio device control
- Built with [Electron](https://www.electronjs.org/), [React](https://react.dev/), and [Vite](https://vitejs.dev/)
