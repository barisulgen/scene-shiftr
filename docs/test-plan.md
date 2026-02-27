# Scene Shiftr — Test Plan

**Instructions:** Work through each section in order. Before you start, note your current system state (volume level, audio device, night light on/off, focus assist on/off, wallpaper). You'll need this to verify restores. Check the box when a test passes. If it fails, write what happened next to it.

---

## SETUP — Create Test Workspaces

Before testing, create these workspaces in Scene Shiftr. Use apps you actually have installed.

**Workspace A — "Test Full"**
- Open: Notepad, Calculator
- Close: one app you'll have open (e.g. a browser)
- Night light: On
- Focus assist: On
- Volume: 30%
- Audio device: (pick one you have)
- Wallpaper: pick any image
- Folder: pick any folder
- URL: https://example.com
- Transition sound: pick one

**Workspace B — "Test Minimal"**
- Open: Notepad only
- Close: nothing
- Night light: Off
- Focus assist: Off
- Volume: 70%
- All other settings: null (don't change)

**Workspace C — "Test Overlap"**
- Open: Notepad, Calculator (same as A)
- Close: nothing
- Night light: Off
- Volume: 50%
- Everything else: null

---

## PHASE 1 — Workspace CRUD

### Create

- [ ] 1.1 — Click "+ New Workspace", fill in name and emoji, save. Workspace appears in sidebar.
- [ ] 1.2 — Create a workspace with ALL fields filled in (apps, folders, URLs, system settings, wallpaper, sound, music). Saves without error.
- [ ] 1.3 — Create a workspace with ONLY a name and nothing else. Saves without error.
- [ ] 1.4 — Create a workspace with special characters in the name (e.g. "Work & Play / 2.0"). Saves and displays correctly.
- [ ] 1.5 — Verify the workspace JSON file was created in `%APPDATA%/scene-shiftr/workspaces/`.

### Read

- [ ] 1.6 — Click each workspace in the sidebar. The detail panel shows correct settings.
- [ ] 1.7 — Close and reopen Scene Shiftr. All workspaces still there with correct data.
- [ ] 1.8 — Sections with data are expanded. Sections with no data show "(not set)" or similar and are collapsed.

### Edit

- [ ] 1.9 — Click Edit on a workspace. All current values are pre-filled in the form.
- [ ] 1.10 — Change the name, add an app, remove an app, change volume. Save. Changes persist.
- [ ] 1.11 — Edit a workspace to remove ALL optional settings (clear wallpaper, clear audio, clear everything except name). Saves correctly, all fields now null.

### Delete

- [ ] 1.12 — Delete a workspace. Confirmation prompt appears.
- [ ] 1.13 — Confirm delete. Workspace removed from sidebar and JSON file deleted from AppData.
- [ ] 1.14 — Cancel delete. Workspace still exists.
- [ ] 1.15 — Delete the currently ACTIVE workspace. App handles this gracefully (deactivates first, then deletes).

### Reorder

- [ ] 1.16 — Drag workspaces to reorder in sidebar. New order persists after restarting the app.

---

## PHASE 2 — Individual System Operations

Test each operation in isolation before testing them together. Manually verify every result — do NOT trust the app's own status.

### Process — Open

- [ ] 2.1 — Activate a workspace that opens Notepad. Notepad launches.
- [ ] 2.2 — Activate a workspace that opens 3+ apps. All launch (roughly in parallel, not one waiting for another).
- [ ] 2.3 — Activate a workspace that opens an app that's ALREADY running. App stays open, no duplicate instance (or if the app supports multiple windows, no unwanted second window).

### Process — Close

- [ ] 2.4 — Open Notepad manually. Activate a workspace with Notepad in the close list. Notepad closes.
- [ ] 2.5 — Open Notepad, type something (unsaved). Activate a workspace with Notepad in close list. Notepad should show its own "Save?" dialog OR Scene Shiftr should prompt "Force close or skip?"
- [ ] 2.6 — Activate a workspace that closes an app that ISN'T currently running. No error, just skips it.
- [ ] 2.7 — Verify you CANNOT close a whitelisted process. Add explorer.exe to a workspace close list (via manual JSON edit if the UI won't let you). Activate. Explorer must NOT close.

### Volume

- [ ] 2.8 — Note current volume. Activate a workspace with volume set to 30%. Check volume slider in taskbar — it shows 30%.
- [ ] 2.9 — Activate a workspace with volume set to 0%. System is muted/silent.
- [ ] 2.10 — Activate a workspace with volume set to 100%. Volume goes to max.
- [ ] 2.11 — Activate a workspace with volume set to null. Volume does NOT change from current level.

### Audio Device

- [ ] 2.12 — If you have 2+ audio devices: activate a workspace that switches to device B. Sound now plays through device B. Verify by playing audio.
- [ ] 2.13 — Activate a workspace with audio device set to a device name that DOESN'T EXIST (edit JSON manually). App should skip gracefully, not crash. Current device stays unchanged.
- [ ] 2.14 — Activate a workspace with audio device set to null. Device does NOT change.

### Night Light

- [ ] 2.15 — Turn night light OFF manually. Activate a workspace with night light ON. Screen turns warm.
- [ ] 2.16 — Turn night light ON manually. Activate a workspace with night light OFF. Screen returns to normal.
- [ ] 2.17 — Activate a workspace with night light set to null. Night light does NOT change.

### Focus Assist

- [ ] 2.18 — Turn focus assist OFF manually. Activate a workspace with focus assist ON. Verify in Action Center / Settings.
- [ ] 2.19 — Turn focus assist ON manually. Activate a workspace with focus assist OFF. Verify it's off.
- [ ] 2.20 — Activate a workspace with focus assist set to null. Focus assist does NOT change.

### Wallpaper

- [ ] 2.21 — Activate a workspace with a wallpaper set. Desktop background changes.
- [ ] 2.22 — Activate a workspace with wallpaper set to a file path that DOESN'T EXIST. App should skip gracefully, not crash. Wallpaper stays unchanged.
- [ ] 2.23 — Activate a workspace with wallpaper set to null. Wallpaper does NOT change.

### Folders

- [ ] 2.24 — Activate a workspace with a folder path. Explorer window opens to that folder.
- [ ] 2.25 — Activate a workspace with a folder path that DOESN'T EXIST. App should skip gracefully, not crash.

### URLs

- [ ] 2.26 — Activate a workspace with a URL. Default browser opens to that URL.
- [ ] 2.27 — Activate a workspace with multiple URLs. All open (in tabs or separate windows depending on browser).

### Transition Sound

- [ ] 2.28 — Activate a workspace with a transition sound. Sound plays.
- [ ] 2.29 — Activate a workspace without a transition sound. No sound, no error.
- [ ] 2.30 — Activate a workspace with a transition sound file path that DOESN'T EXIST. No crash, activation continues.

### Music / Spotify

- [ ] 2.31 — Activate a workspace with Spotify + playlist URI. Spotify opens and starts the playlist.
- [ ] 2.32 — Activate a workspace with Spotify configured but Spotify NOT INSTALLED. App should skip gracefully.

---

## PHASE 3 — Full Activation & Deactivation

### Full Activation

- [ ] 3.1 — Before activating, write down: volume, audio device, night light state, focus assist state, wallpaper. This is your "pre-activation state."
- [ ] 3.2 — Activate Workspace A (the "Test Full" one). Verify ALL of the following happened:
  - [ ] Transition sound played
  - [ ] App in close list was closed
  - [ ] Notepad opened
  - [ ] Calculator opened
  - [ ] Folder opened
  - [ ] URL opened in browser
  - [ ] Night light changed
  - [ ] Focus assist changed
  - [ ] Volume changed
  - [ ] Audio device changed (if configured)
  - [ ] Wallpaper changed
- [ ] 3.3 — Status bar shows progress during activation ("Closing apps...", "Applying settings...", etc.)
- [ ] 3.4 — Active workspace indicator shows in the sidebar.

### Full Deactivation

- [ ] 3.5 — With Workspace A active, click "Close Workspace" (or use tray menu).
- [ ] 3.6 — Apps that were OPENED by the workspace (Notepad, Calculator) are closed.
- [ ] 3.7 — Apps that were CLOSED by the workspace are NOT reopened (this is correct — we only close, never reopen on deactivate).
- [ ] 3.8 — System settings REVERT to your pre-activation state from 3.1:
  - [ ] Volume returned to original level
  - [ ] Audio device returned to original
  - [ ] Night light returned to original state
  - [ ] Focus assist returned to original state
  - [ ] Wallpaper returned to original
- [ ] 3.9 — No active workspace indicator in sidebar.

### Snapshot Integrity

- [ ] 3.10 — Activate workspace A. Manually change volume to something else (e.g. drag slider). Deactivate. Volume should restore to pre-A state, NOT to what you manually set during the workspace.
- [ ] 3.11 — Verify snapshot.json exists in `%APPDATA%/scene-shiftr/` while a workspace is active.
- [ ] 3.12 — Verify snapshot.json is DELETED after deactivation.

---

## PHASE 4 — Smart Switching

- [ ] 4.1 — Activate Workspace A (opens Notepad + Calculator). Then activate Workspace C (also opens Notepad + Calculator). Notepad and Calculator should STAY OPEN (not close and reopen).
- [ ] 4.2 — Activate Workspace A (opens Notepad + Calculator, volume 30%). Switch to Workspace B (opens Notepad only, volume 70%). Calculator should close. Notepad stays. Volume changes to 70%.
- [ ] 4.3 — Switch A → B → C rapidly. No crashes, no orphaned processes, final state matches C's config.
- [ ] 4.4 — After A → B switch, the restore point should still be the ORIGINAL state from before A was activated (not A's settings).
- [ ] 4.5 — After A → B → deactivate, system restores to original pre-A state.

---

## PHASE 5 — System Tray

- [ ] 5.1 — Minimize Scene Shiftr. Icon appears in system tray.
- [ ] 5.2 — Right-click tray icon. Menu shows: all workspace names, "Close current workspace" (if one is active), "Open Scene Shiftr".
- [ ] 5.3 — Click a workspace name in tray menu. That workspace activates.
- [ ] 5.4 — Click "Close current workspace" in tray menu. Workspace deactivates, settings revert.
- [ ] 5.5 — Click "Open Scene Shiftr" in tray menu. Main window opens.
- [ ] 5.6 — Double-click tray icon. Main window opens (or comes to front if already open).
- [ ] 5.7 — Close the main window (X button). App keeps running in tray (doesn't fully quit).

---

## PHASE 6 — Settings

- [ ] 6.1 — Open Settings page. All global settings are visible.
- [ ] 6.2 — Toggle "Start with Windows" on. Restart PC. Scene Shiftr launches minimized to tray.
- [ ] 6.3 — Toggle "Start with Windows" off. Restart PC. Scene Shiftr does NOT launch.
- [ ] 6.4 — Set a default transition sound. Create a new workspace without a transition sound. Activate it. Default sound plays.
- [ ] 6.5 — Toggle "Confirmation before switching" on. Click Activate on a workspace. Confirmation dialog appears. Cancel — nothing happens. Confirm — workspace activates.
- [ ] 6.6 — Change graceful close timeout to 1 second. Activate a workspace that closes an app with unsaved work. Force close prompt appears after ~1 second.

---

## PHASE 7 — Edge Cases & Error Handling

### Bad Data

- [ ] 7.1 — Manually edit a workspace JSON to have invalid JSON. Open Scene Shiftr. App should handle it gracefully (skip the corrupted file or show error), not crash.
- [ ] 7.2 — Manually edit a workspace JSON to have a volume of 999. App should clamp to 100 or reject it, not send 999 to the system.
- [ ] 7.3 — Manually edit a workspace JSON to have a volume of -50. App should clamp to 0 or reject it.
- [ ] 7.4 — Delete all workspace JSON files from AppData while the app is running. App should show empty list, not crash.

### Missing Resources

- [ ] 7.5 — Set a wallpaper path, then delete the image file. Activate. App skips wallpaper gracefully.
- [ ] 7.6 — Set an app to open, then uninstall that app. Activate. App skips the missing exe gracefully.
- [ ] 7.7 — Set a transition sound, then delete the sound file. Activate. App skips sound gracefully.
- [ ] 7.8 — Unplug your headset (if audio device is configured). Activate a workspace that targets the unplugged device. App skips gracefully, audio stays on current device.

### Timing & Interruption

- [ ] 7.9 — Click Activate, then immediately click Activate on a DIFFERENT workspace before the first one finishes. App should either queue the second or reject it — NOT run both simultaneously.
- [ ] 7.10 — Click Activate, then close the Scene Shiftr window mid-activation. Activation should either complete or roll back cleanly. System should NOT be in a half-applied state.
- [ ] 7.11 — Activate a workspace. Then activate the SAME workspace again. App should either skip (already active) or re-apply idempotently.

### Safety

- [ ] 7.12 — Verify the full process whitelist is enforced. Manually edit a workspace JSON to add `csrss.exe` to the close list. Activate. It must NOT be killed. Check Task Manager.
- [ ] 7.13 — Verify the full process whitelist is enforced. Same test with `svchost.exe`. Must NOT be killed.
- [ ] 7.14 — Verify the full process whitelist is enforced. Same test with `dwm.exe`. Must NOT be killed.
- [ ] 7.15 — Verify the full process whitelist is enforced. Same test with `scene-shiftr.exe` (the app itself). Must NOT kill itself.

### Persistence

- [ ] 7.16 — Activate a workspace. Force-quit Scene Shiftr (End Task in Task Manager). Reopen Scene Shiftr. App should recognize a workspace was active (snapshot.json exists) and offer to restore or deactivate.
- [ ] 7.17 — Close Scene Shiftr normally (tray → Quit/Exit). Reopen. Previously active workspace state is handled correctly.

---

## PHASE 8 — UI & Polish

- [ ] 8.1 — Resize the window to very small. UI doesn't break or overlap.
- [ ] 8.2 — Resize the window to very large / maximize. UI scales appropriately.
- [ ] 8.3 — All collapsible sections open and close smoothly.
- [ ] 8.4 — Drag-to-reorder in sidebar works and feels smooth.
- [ ] 8.5 — All buttons have hover states.
- [ ] 8.6 — Delete confirmation is clearly a destructive action (red button or similar).
- [ ] 8.7 — Status bar at bottom shows meaningful messages during activation.
- [ ] 8.8 — No console errors in DevTools during normal usage (Ctrl+Shift+I if DevTools available).

---

## RESULTS SUMMARY

| Phase | Total | Passed | Failed | Notes |
|-------|-------|--------|--------|-------|
| 1 — CRUD | 16 | | | |
| 2 — Individual Ops | 32 | | | |
| 3 — Activation/Deactivation | 12 | | | |
| 4 — Smart Switching | 5 | | | |
| 5 — System Tray | 7 | | | |
| 6 — Settings | 6 | | | |
| 7 — Edge Cases | 17 | | | |
| 8 — UI & Polish | 8 | | | |
| **TOTAL** | **103** | | | |

**If all 103 pass, the app is functionally complete and safe for daily use.**
