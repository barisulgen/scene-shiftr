# Contributing to Scene Shiftr

Thanks for your interest in contributing to Scene Shiftr! This guide will help you get started.

## Getting Started

### 1. Fork and clone

```bash
git clone https://github.com/YOUR_USERNAME/scene-shiftr.git
cd scene-shiftr
npm install
```

### 2. Set up nircmd (already there but may become outdated)

Download [nircmd](https://www.nirsoft.net/utils/nircmd.html), extract it, and place `nircmd.exe` in the `tools/` directory.

### 3. Run in development mode

```bash
npm run dev
```

## Development Guidelines

### Architecture

Before contributing, understand the core architecture:

- **Renderer (React)** handles all UI. It never touches Node.js or Windows APIs directly.
- **Main process (Electron)** handles all system operations through services.
- **IPC layer** bridges the two. Every system operation flows: `React hook → IPC handler → service`.
- **Safety service** has a hardcoded process whitelist. Never bypass it.

### Code Style

- TypeScript strict mode
- React functional components with hooks
- TailwindCSS for styling
- No direct `require()` or Node.js API usage in the renderer

### Testing System-Level Changes

Scene Shiftr manipulates your OS. If your contribution touches any of these, test carefully:

- **Process management** — never kill a whitelisted process. Match by full .exe path, not just name.
- **Registry writes** — log the key, current value, and new value before every write. Read back after to confirm.
- **Audio switching** — verify the device actually changed after nircmd calls. nircmd fails silently.
- **Wallpaper/display** — validate file paths exist before applying.

**Recommended:** Test system-level changes in a Windows VM before running on your main machine. Create a Windows restore point before testing on real hardware.

### Commit Messages

Use clear, descriptive commit messages:

```
fix: prevent killing whitelisted processes during workspace switch
feat: add dry run mode for workspace activation
docs: update README with new architecture diagram
refactor: extract audio validation into separate function
```

Prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

## How to Contribute

### Reporting Bugs

Use the [bug report template](../../issues/new?template=bug_report.md). Include:

- What you did
- What you expected
- What actually happened
- Your Windows version
- Any error messages or logs from `%APPDATA%/scene-shiftr/logs/`

**For system-level bugs** (audio stuck, night light won't revert, process killed incorrectly): describe your exact hardware setup (audio devices, monitors, etc.)

### Suggesting Features

Use the [feature request template](../../issues/new?template=feature_request.md). Explain the use case — why would someone need this?

### Pull Requests

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Test thoroughly (especially system-level changes)
4. Submit a PR using the pull request template
5. Describe what you changed and why

### What I'm Looking For

Check the [roadmap in README.md](README.md#roadmap) for planned features. Other welcome contributions:

- Bug fixes (especially around edge cases in system operations)
- Error handling improvements
- New transition sounds
- Documentation improvements
- Performance improvements
- Accessibility improvements

## ⚠️ Safety Rules

These are non-negotiable for any contribution:

1. **Never remove or bypass the process whitelist** in `safety.ts`
2. **Never force-kill without user confirmation**
3. **Always validate paths and device names** before system operations
4. **Always snapshot state** before modifying system settings
5. **Null means don't touch** — never change a setting the user didn't configure

PRs that violate these will be rejected.
