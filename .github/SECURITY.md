# Security Policy

## ⚠️ This App Manipulates Your Operating System

Scene Shiftr modifies Windows system settings including registry values, audio devices, wallpaper, and process management. Security issues in this app can have real consequences on your system.

## Reporting a Vulnerability

If you discover a security vulnerability — especially one that could:

- Kill system-critical processes despite the whitelist
- Corrupt registry values
- Execute arbitrary code
- Escalate privileges
- Cause data loss

**Please open a public issue.**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

I will respond (at least try) within 48 hours and work with you to address it before any public disclosure.

## Safety Guarantees

These are the safety invariants Scene Shiftr maintains. Any violation is treated as a critical security issue:

1. **Process whitelist is immutable** — system-critical processes can never be killed
2. **Registry writes are scoped** — only night light and focus assist keys are ever modified
3. **No network access** — Scene Shiftr is fully offline, no telemetry, no data sent anywhere
4. **State is always restorable** — a snapshot is taken before any system modification

I only support the latest release. Please update before reporting issues.
