# Scene Shiftr — Feature Roadmap

## v0.1.0 — Alpha (Current)

What shipped:

- [x] Workspace CRUD (create, edit, delete, reorder)
- [x] App launching and closing on activation
- [x] Audio device switching
- [x] Volume control
- [x] Wallpaper switching
- [x] Folder and URL opening
- [x] Transition sounds
- [x] Spotify playlist auto-launch
- [x] System tray integration
- [x] Smart switching (skip already-running apps between workspaces)
- [x] Safety whitelist (system-critical processes protected)
- [x] Dry run mode

---

What didn't make it:

- [ ] Night light control (removed — no safe Windows API exists)
- [ ] Focus assist toggle (not working)
- [ ] State snapshot and restore on deactivation
- [ ] Monitor layout switching

---

## v0.2.0 — Stability & Safety

Priority: make what exists bulletproof before adding new features.

- [x] State snapshot and restore — ~~capture system state before first activation, restore on deactivation~~ There should always be an active workspace. When the user 'deactivates' a workspace, they're actually activating a special default workspace. This eliminates the need for snapshot capture/restore logic entirely.
- [x] Per-step error handling — skip failed steps and continue activation instead of crashing
- [x] Validate workspace JSON on load — handle corrupted or manually edited files
- [x] Validate resources on activation — check that exe paths, wallpaper files, sound files exist before applying
- [x] Audio device verification — confirm device actually switched after the command
- [x] Activation queue — prevent double-activation if user clicks rapidly
- [x] Graceful handling of mid-activation close — don't leave system in half-applied state
- [x] Logging — Dry run mode logs to %APPDATA%/scene-shiftr/logs/. But normal (non-dry-run) activations don't log anything to disk — only console.error for failures. General activation logging should be added.
- [x] Fix infinite loop bug in app detector

---

What didn't make it:

- [ ] Bundle AudioDeviceCmdlets DLL — remove first-launch internet dependency
- [ ] Focus assist toggle — research safe approach (not registry byte manipulation)

---

## v0.3.0 — UI/UX Redesign

**Visual Overhaul**

- [ ] Full UI redesign (Linear/Spotify/Raycast inspired, logo color palette)
- [x] Custom app icon and tray icon

**Main Window**

- [x] Main view — active and inactive states with clear visual distinction
- ~~[ ] Smooth activation animations and progress feedback (per-step progress bar, not just a spinner)~~
- [x] Scene activate/deactivate progress tracking/loading overlay
- [x] Activation error states — show which steps succeeded/failed/skipped inline, not just in logs

**Forms & Settings**

- [x] Create/edit workspace form redesign
- [x] Collapsible sections with smart defaults (expanded if data, collapsed if empty)
- [x] Transition sound preview/play button in the form
- [x] App picker — browse/search installed apps instead of manually entering exe paths
- [x] Settings page redesign

**System Tray**

- [x] System tray popup redesign — quick-switch between workspaces without opening the main window

**Accessibility**

- [ ] Visible focus indicators on all controls
- [ ] Sufficient color contrast ratios (WCAG AA minimum)

---

What didn't make it:

- [ ] Dark/light mode switch support
- [ ] Full keyboard navigation — tab through all interactive elements, Enter to activate

---

## v0.4.0 — Quality of Life

Priority: reduce friction and make daily use smoother.

**Workspace Management**

- [ ] Workspace export/import (single JSON file)
- [ ] Schema version field in workspace JSON for future migrations
- [ ] Workspace duplication — clone an existing workspace as a starting point
- [ ] Workspace icons/colors — visual differentiation in the sidebar beyond just names

**Activation Improvements**

- [ ] Close all Explorer windows before opening workspace folders (via Shell.Application COM)
- [ ] App launch arguments support (e.g. open Chrome with a specific profile or URL)
- [ ] App launch delay — configurable per-app delay for apps that need time to initialize before the next one starts
- [ ] Custom graceful close timeout per workspace
- [ ] "Confirm before switching" setting

**Diagnostics**

- [ ] System state debug panel — shows actual system state vs what the app thinks
- [ ] Activation history — searchable log of past activations with timestamps and outcomes

**Window Behavior**

- [ ] Remember window size and position across sessions

---

## v0.5.0 — Automation & Triggers

Priority: the app starts working for you instead of you working the app.

- [ ] Hotkey support — global keyboard shortcuts to activate any workspace
- [ ] Auto-switch on device connect — controller plugged in → Gaming, headset plugged in → Music (via Windows device event listener)
- [ ] Auto-switch on time schedule — set workspaces to activate at specific times of day
- [ ] Auto-switch on app launch — detect when a specific app is opened and suggest/activate the matching workspace
- [ ] Startup workspace — optionally activate a specific workspace on system boot

---

## v0.6.0 — Power Features

Priority: advanced capabilities for users who want full control.

**Display & Layout**

- [ ] Monitor layout switching — capture and restore multi-monitor arrangements
- [ ] Per-workspace window positions — remember where each app window sits on screen
- [ ] Night light control — revisit only if Microsoft exposes a public API

**Data & Insights**

- [ ] Workspace usage stats — time spent in each workspace, activation frequency, most-used apps
- [ ] Usage dashboard — simple visualizations of workspace patterns over time

**Templates**

- [ ] Workspace templates — built-in starter workspaces (Gaming, Work, Creative, Night)
- [ ] "Create from current state" — snapshot current system state (running apps, audio device, wallpaper) into a new workspace automatically

---

## v0.7.0 — Polish & Hardening

Priority: final pass before going public. Everything should feel rock-solid.

- [ ] Bundle AudioDeviceCmdlets DLL — remove first-launch internet dependency (carried from v0.2.0)
- [ ] Comprehensive error messages — every failure state has a user-friendly explanation and suggested fix
- [ ] Undo last activation — one-click rollback to previous workspace if something went wrong
- [ ] Notification system — toast notifications for activation success/failure, especially when triggered via hotkey or auto-switch
- [ ] Performance audit — measure and optimize activation speed, startup time, memory usage
- [ ] Stress testing — rapid workspace switching, corrupt data handling, edge cases

---

## v1.0.0 — Public Release

- [ ] All v0.3–v0.7 features stable and tested
- [ ] Pass full 103-test validation plan (expand as needed for new features)
- [ ] Landing page / website
- [ ] Demo video in README
- [ ] Installer code-signed (no "Windows protected your PC" warning)
- [ ] Auto-updater (check for new versions on launch, download in background)
- [ ] Onboarding — first-launch tutorial or wizard that creates the Default workspace and walks through creating a first custom workspace
- [ ] Changelog accessible from within the app (link to release notes or embedded)
- [ ] Crash reporting — opt-in anonymous error reporting to catch issues in the wild

---

## Future / Community-Driven

These are ideas for post-1.0, driven by community demand:

- [ ] Community workspace templates — browse and download popular configs from a shared repository
- [ ] Multiple profiles / user accounts
- [ ] Portable mode (run from USB, no install)
- [ ] Mac support
- [ ] Plugin system — let users write custom activation steps (run a script, call an API, toggle a smart light)
- [ ] Workspace chaining — activate multiple workspaces in sequence (e.g. "Work" base + "Meeting" overlay)
- [ ] Cloud sync — sync workspaces across multiple PCs
- [ ] CLI interface — activate workspaces from the command line or scripts
- [ ] Focus assist toggle — revisit if Windows ever exposes a proper API
