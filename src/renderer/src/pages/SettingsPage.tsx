import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useSettings } from '../hooks/useSettings';
import TransitionSoundPicker from '../components/workspace/TransitionSoundPicker';

export default function SettingsPage(): JSX.Element {
  const { setCurrentView, refreshWorkspaces } = useApp();
  const { settings, updateSettings } = useSettings();

  const [startWithWindows, setStartWithWindows] = useState(false);
  const [defaultTransitionSound, setDefaultTransitionSound] = useState<string | null>(null);
  const [confirmBeforeSwitching, setConfirmBeforeSwitching] = useState(false);
  const [gracefulCloseTimeout, setGracefulCloseTimeout] = useState(5);
  const [dryRun, setDryRun] = useState(false);
  const [appScale, setAppScale] = useState(100);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync local state when settings load
  useEffect(() => {
    if (settings) {
      setStartWithWindows(settings.startWithWindows);
      setDefaultTransitionSound(settings.defaultTransitionSound);
      setConfirmBeforeSwitching(settings.confirmBeforeSwitching);
      setGracefulCloseTimeout(settings.gracefulCloseTimeout);
      setDryRun(settings.dryRun);
      setAppScale(settings.appScale ?? 100);
    }
  }, [settings]);

  // Auto-save helpers
  const autoSaveToggle = (field: string, value: boolean): void => {
    updateSettings({ [field]: value });
  };

  const handleResetWorkspaces = async (): Promise<void> => {
    setShowResetConfirm(false);
    try {
      await window.api.resetWorkspaces();
      await refreshWorkspaces();
      setCurrentView('main');
    } catch (err) {
      console.error('Failed to reset workspaces:', err);
    }
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Manage global application preferences and behaviors.
          </p>
          <div className="mt-4" style={{ borderBottom: '1px solid var(--border)' }} />
        </div>

        <div className="max-w-2xl space-y-6">
          {/* GENERAL section label */}
          <span
            className="block uppercase tracking-widest font-medium"
            style={{ fontSize: '10px', color: 'var(--text-muted)' }}
          >
            General
          </span>

          {/* Card 1 — Start with Windows */}
          <div
            className="rounded-xl p-5 flex items-center gap-4"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            {/* Icon box */}
            <div
              className="shrink-0 flex items-center justify-center rounded-lg"
              style={{
                width: 32,
                height: 32,
                backgroundColor: 'var(--accent-soft)',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="var(--accent)"
                className="w-4 h-4"
              >
                <path
                  fillRule="evenodd"
                  d="M10 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 1ZM5.05 3.05a.75.75 0 0 1 1.06 0l1.062 1.06A.75.75 0 1 1 6.11 5.173L5.05 4.11a.75.75 0 0 1 0-1.06ZM14.95 3.05a.75.75 0 0 1 0 1.06l-1.06 1.062a.75.75 0 0 1-1.062-1.061l1.061-1.06a.75.75 0 0 1 1.06 0ZM3 8a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 3 8ZM14 8a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 14 8ZM7.172 13.828a.75.75 0 0 1 0 1.061l-1.06 1.06a.75.75 0 0 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0ZM10 11a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 11Z"
                  clipRule="evenodd"
                />
                <path d="M5.05 3.05a7 7 0 1 1 9.9 9.9 7 7 0 0 1-9.9-9.9ZM10 5a.75.75 0 0 1 .75.75v2.5h2.5a.75.75 0 0 1 0 1.5h-3.25a.75.75 0 0 1-.75-.75v-3.25A.75.75 0 0 1 10 5Z" />
              </svg>
            </div>
            {/* Text */}
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Start with Windows
              </span>
              <span className="block text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Launch Scene Shiftr automatically when you sign in
              </span>
            </div>
            {/* Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !startWithWindows;
                setStartWithWindows(next);
                autoSaveToggle('startWithWindows', next);
              }}
              className="relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 cursor-pointer"
              style={{
                backgroundColor: startWithWindows ? 'var(--accent)' : 'var(--bg-elevated)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.85';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                  startWithWindows ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Card 2 — Confirmation before switching */}
          <div
            className="rounded-xl p-5 flex items-center gap-4"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            {/* Icon box */}
            <div
              className="shrink-0 flex items-center justify-center rounded-lg"
              style={{
                width: 32,
                height: 32,
                backgroundColor: 'var(--accent-soft)',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="var(--accent)"
                className="w-4 h-4"
              >
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            {/* Text */}
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Confirmation before switching
              </span>
              <span className="block text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Ask for confirmation before activating a workspace
              </span>
            </div>
            {/* Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !confirmBeforeSwitching;
                setConfirmBeforeSwitching(next);
                autoSaveToggle('confirmBeforeSwitching', next);
              }}
              className="relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 cursor-pointer"
              style={{
                backgroundColor: confirmBeforeSwitching ? 'var(--accent)' : 'var(--bg-elevated)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.85';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                  confirmBeforeSwitching ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Card 3 — App Scale */}
          <div
            className="rounded-xl p-5"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--accent-soft)' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" style={{ color: 'var(--accent)' }}>
                    <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                    <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <span className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    App Scale
                  </span>
                  <span className="block text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Scale the entire app interface
                  </span>
                </div>
              </div>
              <span
                className="text-sm font-semibold rounded-full px-3 py-0.5"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--accent)' }}
              >
                {appScale - 20}%
              </span>
            </div>
            <div className="mt-4">
              <input
                type="range"
                min={100}
                max={150}
                step={10}
                value={appScale}
                onChange={(e) => setAppScale(Number(e.target.value))}
                onMouseUp={(e) => {
                  const val = Number((e.target as HTMLInputElement).value);
                  const factor = val / 100;
                  window.api.setZoomFactor(factor);
                  window.api.resizeWindow(960 * factor, 700 * factor);
                  updateSettings({ appScale: val });
                }}
                className="w-full settings-slider"
                style={{
                  '--slider-pct': `${((appScale - 100) / 50) * 100}%`,
                } as React.CSSProperties}
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>80%</span>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>130%</span>
              </div>
            </div>
          </div>

          {/* Card — Check for updates */}
          <div
            className="rounded-xl p-5 flex items-center gap-4 cursor-pointer transition-colors duration-150"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
            onClick={() => window.open('https://github.com/barisulgen/scene-shiftr/releases', '_blank')}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            {/* Icon box */}
            <div
              className="shrink-0 flex items-center justify-center rounded-lg"
              style={{
                width: 32,
                height: 32,
                backgroundColor: 'var(--accent-soft)',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="var(--accent)"
                className="w-4 h-4"
              >
                <path
                  fillRule="evenodd"
                  d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H4.598a.75.75 0 0 0-.75.75v3.634a.75.75 0 0 0 1.5 0v-2.033l.312.311a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm-10.9-3.023a.75.75 0 0 0 1.449.39 5.5 5.5 0 0 1 9.201-2.466l.312.311H13.94a.75.75 0 0 0 0 1.5h3.634a.75.75 0 0 0 .75-.75V3.752a.75.75 0 0 0-1.5 0v2.033l-.312-.311A7 7 0 0 0 4.8 8.612Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            {/* Text */}
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Check for updates
              </span>
              <span className="block text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                View the latest releases on GitHub
              </span>
            </div>
            {/* External link icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 shrink-0"
              style={{ color: 'var(--text-muted)' }}
            >
              <path
                fillRule="evenodd"
                d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Zm7.25-.75a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0V6.31l-5.47 5.47a.75.75 0 1 1-1.06-1.06l5.47-5.47H12.25a.75.75 0 0 1-.75-.75Z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          {/* BEHAVIOR & AUDIO section label */}
          <span
            className="block uppercase tracking-widest font-medium pt-2"
            style={{ fontSize: '10px', color: 'var(--text-muted)' }}
          >
            Behavior &amp; Audio
          </span>

          {/* Card — Graceful close timeout */}
          <div
            className="rounded-xl p-5"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center gap-4">
              {/* Icon box */}
              <div
                className="shrink-0 flex items-center justify-center rounded-lg"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: 'var(--accent-soft)',
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="var(--accent)"
                  className="w-4 h-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              {/* Text */}
              <div className="flex-1 min-w-0">
                <span className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Graceful close timeout
                </span>
                <span className="block text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Seconds to wait before prompting to force-close an app
                </span>
              </div>
              {/* Pill badge */}
              <span
                className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: 'var(--accent-soft)',
                  color: 'var(--accent)',
                }}
              >
                {gracefulCloseTimeout}s
              </span>
            </div>
            {/* Slider */}
            <div className="mt-4">
              <input
                type="range"
                min={1}
                max={15}
                value={gracefulCloseTimeout}
                onChange={(e) => setGracefulCloseTimeout(Number(e.target.value))}
                onMouseUp={(e) => {
                  const val = Number((e.target as HTMLInputElement).value);
                  updateSettings({ gracefulCloseTimeout: val });
                }}
                className="w-full settings-slider"
                style={
                  {
                    '--slider-pct': `${((gracefulCloseTimeout - 1) / 14) * 100}%`,
                  } as React.CSSProperties
                }
              />
              <div className="flex justify-between mt-1">
                <span
                  className="uppercase tracking-widest"
                  style={{ fontSize: '10px', color: 'var(--text-muted)' }}
                >
                  1s (fast)
                </span>
                <span
                  className="uppercase tracking-widest"
                  style={{ fontSize: '10px', color: 'var(--text-muted)' }}
                >
                  15s (safe)
                </span>
              </div>
            </div>
          </div>

          {/* Card — Default transition sound */}
          <div
            className="rounded-xl p-5"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center gap-4 mb-4">
              {/* Icon box */}
              <div
                className="shrink-0 flex items-center justify-center rounded-lg"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: 'var(--accent-soft)',
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="var(--accent)"
                  className="w-4 h-4"
                >
                  <path d="M10.5 3.75a.75.75 0 0 0-1.264-.546L5.203 7H2.667a.75.75 0 0 0-.7.48A6.985 6.985 0 0 0 1.5 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h2.535l4.033 3.796A.75.75 0 0 0 10.5 16.25V3.75ZM13.929 5.055a.75.75 0 0 0-.832 1.248A4.49 4.49 0 0 1 15 10a4.49 4.49 0 0 1-1.904 3.696.75.75 0 0 0 .832 1.248A5.99 5.99 0 0 0 16.5 10a5.99 5.99 0 0 0-2.571-4.945Z" />
                </svg>
              </div>
              {/* Text */}
              <div className="flex-1 min-w-0">
                <span className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Default transition sound
                </span>
                <span className="block text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Sound played during workspace transitions (can be overridden per workspace)
                </span>
              </div>
            </div>
            <TransitionSoundPicker
              value={defaultTransitionSound}
              onChange={(val) => {
                setDefaultTransitionSound(val);
                updateSettings({ defaultTransitionSound: val });
              }}
            />
          </div>

          {/* DEVELOPER section label */}
          <span
            className="block uppercase tracking-widest font-medium pt-2"
            style={{ fontSize: '10px', color: 'var(--text-muted)' }}
          >
            Developer
          </span>

          {/* Card — Dry Run Mode */}
          <div
            className="rounded-xl p-5"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center gap-4">
              {/* Icon box */}
              <div
                className="shrink-0 flex items-center justify-center rounded-lg"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: 'var(--accent-soft)',
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="var(--accent)"
                  className="w-4 h-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              {/* Text */}
              <div className="flex-1 min-w-0">
                <span className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Dry Run Mode
                </span>
                <span className="block text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Log all actions to daily log files instead of executing them.
                  Logs saved to %APPDATA%/scene-shiftr/logs/dry-run/
                </span>
              </div>
              {/* Toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !dryRun;
                  setDryRun(next);
                  autoSaveToggle('dryRun', next);
                }}
                className="relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 cursor-pointer"
                style={{
                  backgroundColor: dryRun ? 'var(--accent)' : 'var(--bg-elevated)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.85';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                    dryRun ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {dryRun && (
              <div
                className="rounded-lg px-4 py-3 mt-4"
                style={{
                  backgroundColor: 'var(--accent-soft)',
                  border: '1px solid var(--accent)',
                }}
              >
                <p className="text-xs" style={{ color: 'var(--accent)' }}>
                  Dry run is active. Workspace activations will be logged but no system changes will be made.
                </p>
              </div>
            )}
            {/* Open logs folder link */}
            <button
              type="button"
              onClick={() => window.api.openLogsFolder()}
              className="mt-3 text-xs font-medium cursor-pointer transition-opacity duration-150"
              style={{ color: 'var(--text-muted)', background: 'none', border: 'none', padding: 0 }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              Open logs folder &rarr;
            </button>
          </div>

          {/* DANGER ZONE section label */}
          <span
            className="block uppercase tracking-widest font-medium pt-4"
            style={{ fontSize: '10px', color: 'var(--text-muted)' }}
          >
            Danger Zone
          </span>

          {/* Card — Reset all workspaces */}
          <div
            className="rounded-xl p-5"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center gap-4">
              {/* Icon box */}
              <div
                className="shrink-0 flex items-center justify-center rounded-lg"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: 'var(--accent-soft)',
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="var(--accent)"
                  className="w-4 h-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.519.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              {/* Text */}
              <div className="flex-1 min-w-0">
                <span className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Reset all workspaces
                </span>
                <span className="block text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Delete all workspaces and create a fresh default workspace from your current system state. This cannot be undone.
                </span>
              </div>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all duration-150"
                style={{
                  color: 'var(--accent)',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--accent)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-soft)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Reset all workspaces
              </button>
            </div>
          </div>

          {/* Bottom spacer */}
          <div className="h-4" />
        </div>
      </div>

      {/* Reset confirmation dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
            onClick={() => setShowResetConfirm(false)}
          />

          {/* Dialog */}
          <div
            className="relative rounded-xl p-6 w-[400px] shadow-2xl"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
            }}
          >
            {/* Warning icon */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--accent-soft)' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5"
                style={{ color: 'var(--accent)' }}
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            <h2
              className="text-base font-semibold mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              Reset all workspaces
            </h2>
            <p
              className="text-sm mb-6"
              style={{ color: 'var(--text-secondary)' }}
            >
              This will delete all your workspaces and create a new default workspace from your current system state. This cannot be undone.
            </p>

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors duration-150"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-light)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleResetWorkspaces}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer transition-all duration-150"
                style={{ backgroundColor: 'var(--accent)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.97)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
