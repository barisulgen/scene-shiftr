import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useSettings } from '../hooks/useSettings';
import TransitionSoundPicker from '../components/workspace/TransitionSoundPicker';

export default function SettingsPage(): JSX.Element {
  const { setCurrentView } = useApp();
  const { settings, updateSettings } = useSettings();

  const [startWithWindows, setStartWithWindows] = useState(false);
  const [defaultTransitionSound, setDefaultTransitionSound] = useState<string | null>(null);
  const [confirmBeforeSwitching, setConfirmBeforeSwitching] = useState(false);
  const [gracefulCloseTimeout, setGracefulCloseTimeout] = useState(5);
  const [dryRun, setDryRun] = useState(false);
  const [appScale, setAppScale] = useState(100);
  const [saving, setSaving] = useState(false);

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

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      await updateSettings({
        startWithWindows,
        defaultTransitionSound,
        confirmBeforeSwitching,
        gracefulCloseTimeout,
        dryRun,
        appScale,
      });
      setCurrentView('main');
    } catch {
      /* save error */
    } finally {
      setSaving(false);
    }
  };

  const handleBack = (): void => {
    setCurrentView('main');
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
                backgroundColor: 'rgba(124, 58, 237, 0.2)',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="#7C3AED"
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
              onClick={() => setStartWithWindows(!startWithWindows)}
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
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="#3B82F6"
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
              onClick={() => setConfirmBeforeSwitching(!confirmBeforeSwitching)}
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
                  style={{ backgroundColor: 'rgba(59,130,246,0.15)' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" style={{ color: '#3B82F6' }}>
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

          {/* BEHAVIOR & AUDIO section label */}
          <span
            className="block uppercase tracking-widest font-medium pt-2"
            style={{ fontSize: '10px', color: 'var(--text-muted)' }}
          >
            Behavior &amp; Audio
          </span>

          {/* Card 3 — Graceful close timeout */}
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

          {/* Card 4 — Default transition sound */}
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
              onChange={setDefaultTransitionSound}
            />
          </div>

          {/* DEVELOPER section label */}
          <span
            className="block uppercase tracking-widest font-medium pt-2"
            style={{ fontSize: '10px', color: 'var(--text-muted)' }}
          >
            Developer
          </span>

          {/* Card 5 — Dry Run Mode */}
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
                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="#F59E0B"
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
                  Log all actions to a JSON file instead of executing them.
                  Logs saved to %APPDATA%/scene-shiftr/logs/
                </span>
              </div>
              {/* Toggle */}
              <button
                type="button"
                onClick={() => setDryRun(!dryRun)}
                className="relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 cursor-pointer"
                style={{
                  backgroundColor: dryRun ? '#F59E0B' : 'var(--bg-elevated)',
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
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                }}
              >
                <p className="text-xs" style={{ color: '#F59E0B' }}>
                  Dry run is active. Workspace activations will be logged but no system changes will be made.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer with actions */}
      <div
        className="flex items-center justify-between px-8 py-4 shrink-0"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Scene Shiftr Core v0.1.0
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors duration-150"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-md text-white text-sm font-medium cursor-pointer transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--accent)' }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseDown={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.transform = 'scale(0.97)';
              }
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
