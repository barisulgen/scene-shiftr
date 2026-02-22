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
  const [saving, setSaving] = useState(false);

  // Sync local state when settings load
  useEffect(() => {
    if (settings) {
      setStartWithWindows(settings.startWithWindows);
      setDefaultTransitionSound(settings.defaultTransitionSound);
      setConfirmBeforeSwitching(settings.confirmBeforeSwitching);
      setGracefulCloseTimeout(settings.gracefulCloseTimeout);
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
        <span className="text-sm text-zinc-500">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight mb-6">Settings</h1>

        <div className="max-w-2xl space-y-6">
          {/* Start with Windows */}
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-sm text-zinc-300">Start with Windows</span>
              <span className="block text-xs text-zinc-500 mt-0.5">
                Launch Scene Shiftr automatically when you sign in
              </span>
            </div>
            <button
              type="button"
              onClick={() => setStartWithWindows(!startWithWindows)}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                startWithWindows ? 'bg-indigo-600' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                  startWithWindows ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Default transition sound */}
          <div>
            <span className="block text-sm text-zinc-300 mb-2">Default Transition Sound</span>
            <span className="block text-xs text-zinc-500 mb-3">
              Sound played during workspace transitions (can be overridden per workspace)
            </span>
            <TransitionSoundPicker
              value={defaultTransitionSound}
              onChange={setDefaultTransitionSound}
            />
          </div>

          {/* Confirmation before switching */}
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-sm text-zinc-300">Confirmation before switching</span>
              <span className="block text-xs text-zinc-500 mt-0.5">
                Ask for confirmation before activating a workspace
              </span>
            </div>
            <button
              type="button"
              onClick={() => setConfirmBeforeSwitching(!confirmBeforeSwitching)}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                confirmBeforeSwitching ? 'bg-indigo-600' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                  confirmBeforeSwitching ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Graceful close timeout */}
          <div>
            <span className="block text-sm text-zinc-300">Graceful close timeout</span>
            <span className="block text-xs text-zinc-500 mt-0.5 mb-2">
              Seconds to wait before prompting to force-close an app (1-30)
            </span>
            <input
              type="number"
              min={1}
              max={30}
              value={gracefulCloseTimeout}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= 1 && val <= 30) setGracefulCloseTimeout(val);
              }}
              className="w-24 px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Bottom action buttons */}
      <div className="flex items-center gap-3 px-8 py-4 border-t border-zinc-800/60">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={handleBack}
          className="px-4 py-2 rounded-md border border-zinc-700 text-sm text-zinc-300 font-medium hover:border-zinc-600 hover:text-zinc-100 transition-colors duration-150"
        >
          Back
        </button>
      </div>
    </div>
  );
}
