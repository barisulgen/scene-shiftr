import { useState, useEffect } from 'react';
import type { Workspace, AppEntry, MonitorLayout } from '../../../../shared/types';
import { useApp } from '../../context/AppContext';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import AppSelector from './AppSelector';
import TransitionSoundPicker from './TransitionSoundPicker';

interface WorkspaceFormProps {
  workspace?: Workspace;
}

type TriState = true | false | null;

export default function WorkspaceForm({ workspace }: WorkspaceFormProps): JSX.Element {
  const { setCurrentView } = useApp();
  const { createWorkspace, updateWorkspace } = useWorkspaces();

  const isEdit = !!workspace;

  // --- Form state ---
  const [name, setName] = useState(workspace?.name ?? '');
  const [icon, setIcon] = useState(workspace?.icon ?? '');
  const [appsToOpen, setAppsToOpen] = useState<AppEntry[]>(workspace?.apps.open ?? []);
  const [appsToClose, setAppsToClose] = useState<AppEntry[]>(workspace?.apps.close ?? []);
  const [folders, setFolders] = useState<string[]>(workspace?.folders ?? []);
  const [urls, setUrls] = useState<string[]>(workspace?.urls ?? []);
  const [urlInput, setUrlInput] = useState('');

  // System settings
  const [nightLight, setNightLight] = useState<TriState>(workspace?.system.nightLight ?? null);
  const [focusAssist, setFocusAssist] = useState<TriState>(workspace?.system.focusAssist ?? null);
  const [audioDevice, setAudioDevice] = useState<string | null>(
    workspace?.system.audioDevice ?? null
  );
  const [volume, setVolume] = useState<number>(workspace?.system.volume ?? 50);
  const [volumeEnabled, setVolumeEnabled] = useState(workspace?.system.volume !== null);
  const [audioDevices, setAudioDevices] = useState<string[]>([]);

  // Display
  const [wallpaper, setWallpaper] = useState<string | null>(workspace?.display.wallpaper ?? null);
  const [monitorLayout, setMonitorLayout] = useState<MonitorLayout | null>(
    workspace?.display.monitorLayout ?? null
  );

  // Audio
  const [transitionSound, setTransitionSound] = useState<string | null>(
    workspace?.audio.transitionSound ?? null
  );
  const [musicEnabled, setMusicEnabled] = useState(
    !!(workspace?.audio.musicApp || workspace?.audio.playlistUri)
  );
  const [musicApp, setMusicApp] = useState(workspace?.audio.musicApp ?? '');
  const [playlistUri, setPlaylistUri] = useState(workspace?.audio.playlistUri ?? '');

  const [saving, setSaving] = useState(false);

  // Load audio devices on mount
  useEffect(() => {
    window.api
      .getAudioDevices()
      .then(setAudioDevices)
      .catch(() => {
        /* may fail silently */
      });
  }, []);

  // --- Handlers ---
  const handleAddFolder = async (): Promise<void> => {
    try {
      const folderPath = await window.api.openFolderDialog();
      if (folderPath && !folders.includes(folderPath)) {
        setFolders([...folders, folderPath]);
      }
    } catch (err) {
      console.error('Failed to open folder dialog:', err);
    }
  };

  const handleRemoveFolder = (index: number): void => {
    setFolders(folders.filter((_, i) => i !== index));
  };

  const handleAddUrl = (): void => {
    const trimmed = urlInput.trim();
    if (trimmed && !urls.includes(trimmed)) {
      setUrls([...urls, trimmed]);
      setUrlInput('');
    }
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddUrl();
    }
  };

  const handleRemoveUrl = (index: number): void => {
    setUrls(urls.filter((_, i) => i !== index));
  };

  const handleBrowseWallpaper = async (): Promise<void> => {
    try {
      const filePath = await window.api.openFileDialog([
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp'] },
      ]);
      if (filePath) {
        setWallpaper(filePath);
      }
    } catch (err) {
      console.error('Failed to open file dialog:', err);
    }
  };

  const handleCaptureLayout = async (): Promise<void> => {
    try {
      const layout = await window.api.captureMonitorLayout();
      setMonitorLayout(layout);
    } catch {
      /* capture may fail */
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!name.trim()) return;
    setSaving(true);

    const data: Partial<Workspace> = {
      name: name.trim(),
      icon: icon || '\u{1F5A5}\u{FE0F}',
      apps: { open: appsToOpen, close: appsToClose },
      folders,
      urls,
      system: {
        nightLight,
        focusAssist,
        audioDevice,
        volume: volumeEnabled ? volume : null,
      },
      display: {
        wallpaper,
        monitorLayout,
      },
      audio: {
        transitionSound,
        musicApp: musicEnabled && musicApp.trim() ? musicApp.trim() : null,
        playlistUri: musicEnabled && playlistUri.trim() ? playlistUri.trim() : null,
      },
    };

    try {
      if (isEdit && workspace) {
        await updateWorkspace(workspace.id, data as Record<string, unknown>);
      } else {
        await createWorkspace(data as Record<string, unknown>);
      }
      setCurrentView('main');
    } catch {
      /* save error */
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (): void => {
    setCurrentView('main');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Page title */}
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight mb-6">
          {isEdit ? 'Edit Workspace' : 'Create Workspace'}
        </h1>

        <div className="max-w-2xl space-y-8">
          {/* ---- 1. Name & Icon ---- */}
          <section>
            <h2 className="text-sm font-medium text-zinc-300 mb-3">Name & Icon</h2>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm text-zinc-400 mb-1">Workspace name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Workspace"
                  required
                  className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="w-20">
                <label className="block text-sm text-zinc-400 mb-1">Icon</label>
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder={'\u{1F5A5}\u{FE0F}'}
                  className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 text-center placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </section>

          {/* ---- 2. Apps to Open ---- */}
          <section>
            <h2 className="text-sm font-medium text-zinc-300 mb-3">Apps to Open</h2>
            <AppSelector value={appsToOpen} onChange={setAppsToOpen} label="Select apps to open" />
          </section>

          {/* ---- 3. Apps to Close ---- */}
          <section>
            <h2 className="text-sm font-medium text-zinc-300 mb-3">Apps to Close</h2>
            <AppSelector
              value={appsToClose}
              onChange={setAppsToClose}
              label="Select apps to close"
            />
          </section>

          {/* ---- 4. Folders to Open ---- */}
          <section>
            <h2 className="text-sm font-medium text-zinc-300 mb-3">Folders to Open</h2>
            {folders.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {folders.map((folder, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-700"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="w-4 h-4 text-zinc-500 shrink-0"
                    >
                      <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h2.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H12.5A1.5 1.5 0 0 1 14 5.5v1.382a1.5 1.5 0 0 0-1-.382h-10a1.5 1.5 0 0 0-1 .382V3.5ZM2 9.607a1.5 1.5 0 0 1 1-1.415V13.5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5V8.192a1.5 1.5 0 0 1 1 1.415V13.5a3 3 0 0 1-3 3h-7a3 3 0 0 1-3-3V9.607Z" />
                    </svg>
                    <span className="flex-1 text-xs text-zinc-300 truncate">{folder}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFolder(idx)}
                      className="shrink-0 text-zinc-500 hover:text-zinc-200 transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="w-3.5 h-3.5"
                      >
                        <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={handleAddFolder}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors duration-150"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
              </svg>
              Add Folder
            </button>
          </section>

          {/* ---- 5. URLs to Open ---- */}
          <section>
            <h2 className="text-sm font-medium text-zinc-300 mb-3">URLs to Open</h2>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={handleUrlKeyDown}
                placeholder="https://example.com"
                className="flex-1 px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddUrl}
                disabled={!urlInput.trim()}
                className="shrink-0 px-3 py-2 rounded-md border border-zinc-700 text-sm text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
            {urls.length > 0 && (
              <div className="space-y-1.5">
                {urls.map((url, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-700"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="w-4 h-4 text-zinc-500 shrink-0"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.914 6.025a.75.75 0 0 1 1.06 0 3.5 3.5 0 0 1 0 4.95l-2 2a3.5 3.5 0 0 1-5.396-4.402.75.75 0 0 1 1.251.827 2 2 0 0 0 3.085 2.514l2-2a2 2 0 0 0 0-2.828.75.75 0 0 1 0-1.06Z"
                        clipRule="evenodd"
                      />
                      <path
                        fillRule="evenodd"
                        d="M7.086 9.975a.75.75 0 0 1-1.06 0 3.5 3.5 0 0 1 0-4.95l2-2a3.5 3.5 0 0 1 5.396 4.402.75.75 0 0 1-1.251-.827 2 2 0 0 0-3.085-2.514l-2 2a2 2 0 0 0 0 2.828.75.75 0 0 1 0 1.06Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="flex-1 text-xs text-zinc-300 truncate">{url}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveUrl(idx)}
                      className="shrink-0 text-zinc-500 hover:text-zinc-200 transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="w-3.5 h-3.5"
                      >
                        <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ---- 6. System Settings ---- */}
          <section>
            <h2 className="text-sm font-medium text-zinc-300 mb-3">System Settings</h2>
            <div className="space-y-4">
              {/* Night Light */}
              <TriStateToggle
                label="Night light"
                value={nightLight}
                onChange={setNightLight}
              />

              {/* Focus Assist */}
              <TriStateToggle
                label="Focus assist"
                value={focusAssist}
                onChange={setFocusAssist}
              />

              {/* Audio Device */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Audio device</label>
                <select
                  value={audioDevice ?? ''}
                  onChange={(e) => setAudioDevice(e.target.value || null)}
                  className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Don&apos;t change</option>
                  {audioDevices.map((device) => (
                    <option key={device} value={device}>
                      {device}
                    </option>
                  ))}
                </select>
              </div>

              {/* Volume */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-zinc-400">Volume</label>
                  <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!volumeEnabled}
                      onChange={(e) => setVolumeEnabled(!e.target.checked)}
                      className="rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 w-3.5 h-3.5"
                    />
                    Don&apos;t change
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    disabled={!volumeEnabled}
                    className="flex-1 h-1.5 rounded-full appearance-none bg-zinc-700 accent-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <span
                    className={`text-xs font-mono w-8 text-right ${
                      volumeEnabled ? 'text-zinc-300' : 'text-zinc-600'
                    }`}
                  >
                    {volumeEnabled ? volume : '--'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ---- 7. Wallpaper ---- */}
          <section>
            <h2 className="text-sm font-medium text-zinc-300 mb-3">Wallpaper</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBrowseWallpaper}
                className="shrink-0 px-3 py-2 rounded-md border border-zinc-700 text-sm text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 transition-colors duration-150"
              >
                Browse...
              </button>
              {wallpaper ? (
                <>
                  <span className="flex-1 text-xs text-zinc-400 truncate">{wallpaper}</span>
                  <button
                    type="button"
                    onClick={() => setWallpaper(null)}
                    className="shrink-0 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Clear
                  </button>
                </>
              ) : (
                <span className="text-xs text-zinc-600">Not set</span>
              )}
            </div>
          </section>

          {/* ---- 8. Monitor Layout ---- */}
          <section>
            <h2 className="text-sm font-medium text-zinc-300 mb-3">Monitor Layout</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCaptureLayout}
                className="shrink-0 px-3 py-2 rounded-md border border-zinc-700 text-sm text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 transition-colors duration-150"
              >
                Capture Current Layout
              </button>
              {monitorLayout ? (
                <span className="text-xs text-zinc-400">
                  {monitorLayout.monitors.length} monitor
                  {monitorLayout.monitors.length !== 1 ? 's' : ''} captured
                </span>
              ) : (
                <span className="text-xs text-zinc-600">Not set</span>
              )}
            </div>
          </section>

          {/* ---- 9. Transition Sound ---- */}
          <section>
            <h2 className="text-sm font-medium text-zinc-300 mb-3">Transition Sound</h2>
            <TransitionSoundPicker value={transitionSound} onChange={setTransitionSound} />
          </section>

          {/* ---- 10. Music ---- */}
          <section>
            <h2 className="text-sm font-medium text-zinc-300 mb-3">Music</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setMusicEnabled(!musicEnabled)}
                  className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                    musicEnabled ? 'bg-indigo-600' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                      musicEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-sm text-zinc-400">Auto-launch music</span>
              </label>
              {musicEnabled && (
                <div className="space-y-2 pl-11">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Music app</label>
                    <input
                      type="text"
                      value={musicApp}
                      onChange={(e) => setMusicApp(e.target.value)}
                      placeholder="Spotify"
                      className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Spotify playlist URI</label>
                    <input
                      type="text"
                      value={playlistUri}
                      onChange={(e) => setPlaylistUri(e.target.value)}
                      placeholder="spotify:playlist:37i9dQZF1DXcBWIGoYBM5M"
                      className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Bottom action buttons */}
      <div className="flex items-center gap-3 px-8 py-4 border-t border-zinc-800/60">
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="px-5 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 rounded-md border border-zinc-700 text-sm text-zinc-300 font-medium hover:border-zinc-600 hover:text-zinc-100 transition-colors duration-150"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ---- TriStateToggle sub-component ---- */

function TriStateToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TriState;
  onChange: (v: TriState) => void;
}): JSX.Element {
  return (
    <div>
      <label className="block text-sm text-zinc-400 mb-1.5">{label}</label>
      <div className="inline-flex rounded-md border border-zinc-700 overflow-hidden">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
            value === true
              ? 'bg-indigo-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          On
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`px-3 py-1.5 text-xs font-medium border-x border-zinc-700 transition-colors duration-150 ${
            value === false
              ? 'bg-indigo-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Off
        </button>
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
            value === null
              ? 'bg-indigo-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Don&apos;t change
        </button>
      </div>
    </div>
  );
}
