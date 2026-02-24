import { useState, useEffect, useCallback } from 'react';
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
  const { navigateAway, setHasUnsavedChanges } = useApp();
  const { createWorkspace, updateWorkspace } = useWorkspaces();

  const markDirty = useCallback(() => setHasUnsavedChanges(true), [setHasUnsavedChanges]);

  const isEdit = !!workspace;

  // --- Form state (raw setters are private, dirty wrappers are used in JSX) ---
  const [name, setNameRaw] = useState(workspace?.name ?? '');
  const [icon, setIconRaw] = useState(workspace?.icon ?? '');
  const [appsToOpen, setAppsToOpenRaw] = useState<AppEntry[]>(workspace?.apps.open ?? []);
  const [appsToClose, setAppsToCloseRaw] = useState<AppEntry[]>(workspace?.apps.close ?? []);
  const [folders, setFolders] = useState<string[]>(workspace?.folders ?? []);
  const [urls, setUrls] = useState<string[]>(workspace?.urls ?? []);
  const [urlInput, setUrlInput] = useState('');
  const [nightLight, setNightLightRaw] = useState<TriState>(workspace?.system.nightLight ?? null);
  const [focusAssist, setFocusAssistRaw] = useState<TriState>(workspace?.system.focusAssist ?? null);
  const [audioDevice, setAudioDeviceRaw] = useState<string | null>(workspace?.system.audioDevice ?? null);
  const [volume, setVolumeRaw] = useState<number>(workspace?.system.volume ?? 50);
  const [volumeEnabled, setVolumeEnabledRaw] = useState(workspace?.system.volume !== null);
  const [audioDevices, setAudioDevices] = useState<string[]>([]);
  const [wallpaper, setWallpaper] = useState<string | null>(workspace?.display.wallpaper ?? null);
  const [monitorLayout, setMonitorLayout] = useState<MonitorLayout | null>(workspace?.display.monitorLayout ?? null);
  const [transitionSound, setTransitionSoundRaw] = useState<string | null>(workspace?.audio.transitionSound ?? null);
  const [musicEnabled, setMusicEnabledRaw] = useState(!!(workspace?.audio.musicApp || workspace?.audio.playlistUri));
  const [musicApp, setMusicAppRaw] = useState(workspace?.audio.musicApp ?? '');
  const [playlistUri, setPlaylistUriRaw] = useState(workspace?.audio.playlistUri ?? '');

  // Dirty-wrapping setters — these mark the form as having unsaved changes
  const setName = (v: string) => { setNameRaw(v); markDirty(); };
  const setIcon = (v: string) => { setIconRaw(v); markDirty(); };
  const setAppsToOpen = (v: AppEntry[]) => { setAppsToOpenRaw(v); markDirty(); };
  const setAppsToClose = (v: AppEntry[]) => { setAppsToCloseRaw(v); markDirty(); };
  const setNightLight = (v: TriState) => { setNightLightRaw(v); markDirty(); };
  const setFocusAssist = (v: TriState) => { setFocusAssistRaw(v); markDirty(); };
  const setAudioDevice = (v: string | null) => { setAudioDeviceRaw(v); markDirty(); };
  const setVolume = (v: number) => { setVolumeRaw(v); markDirty(); };
  const setVolumeEnabled = (v: boolean) => { setVolumeEnabledRaw(v); markDirty(); };
  const setTransitionSound = (v: string | null) => { setTransitionSoundRaw(v); markDirty(); };
  const setMusicEnabled = (v: boolean) => { setMusicEnabledRaw(v); markDirty(); };
  const setMusicApp = (v: string) => { setMusicAppRaw(v); markDirty(); };
  const setPlaylistUri = (v: string) => { setPlaylistUriRaw(v); markDirty(); };

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
        markDirty();
      }
    } catch (err) {
      console.error('Failed to open folder dialog:', err);
    }
  };

  const handleRemoveFolder = (index: number): void => {
    setFolders(folders.filter((_, i) => i !== index));
    markDirty();
  };

  const handleAddUrl = (): void => {
    const trimmed = urlInput.trim();
    if (trimmed && !urls.includes(trimmed)) {
      setUrls([...urls, trimmed]);
      setUrlInput('');
      markDirty();
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
    markDirty();
  };

  const handleBrowseWallpaper = async (): Promise<void> => {
    try {
      const filePath = await window.api.openFileDialog([
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp'] },
      ]);
      if (filePath) {
        setWallpaper(filePath);
        markDirty();
      }
    } catch (err) {
      console.error('Failed to open file dialog:', err);
    }
  };

  const handleCaptureLayout = async (): Promise<void> => {
    try {
      const layout = await window.api.captureMonitorLayout();
      setMonitorLayout(layout);
      markDirty();
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
      // Clear dirty flag BEFORE save — createWorkspace internally calls
      // selectWorkspace which goes through the guard. If dirty is still
      // true at that point, the guard blocks it and shows the dialog.
      setHasUnsavedChanges(false);

      if (isEdit && workspace) {
        await updateWorkspace(workspace.id, data as Record<string, unknown>);
      } else {
        await createWorkspace(data as Record<string, unknown>);
      }
      navigateAway('main');
    } catch {
      /* save error */
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (): void => {
    navigateAway('main');
  };

  // --- Shared style constants ---
  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-light)',
    color: 'var(--text-primary)',
  };

  const inputClass =
    'w-full py-2.5 px-3 rounded-lg text-sm placeholder:opacity-50 focus:outline-none focus:ring-1';

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* ---- Header ---- */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1
              className="text-xl font-bold mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              {isEdit ? 'Edit Workspace' : 'Create Workspace'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Configure apps, settings, and vibes for this scene.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity"
            style={{ background: 'var(--bg-elevated)' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
              style={{ color: 'var(--text-secondary)' }}
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <div className="max-w-3xl space-y-6">
          {/* ---- 1. Workspace Name Section ---- */}
          <section className="flex items-start gap-4">
            {/* Icon preview */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-2xl"
              style={{ background: 'var(--bg-elevated)' }}
            >
              {icon || '\u{1F5A5}\u{FE0F}'}
            </div>

            <div className="flex-1 space-y-2">
              <div>
                <label
                  className="block text-[10px] font-medium tracking-widest uppercase mb-1.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Workspace"
                  required
                  className={inputClass}
                  style={{
                    ...inputStyle,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    '--tw-ring-color': 'var(--accent)',
                  } as React.CSSProperties}
                />
              </div>
              <div className="w-20">
                <label
                  className="block text-[10px] font-medium tracking-widest uppercase mb-1.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Icon
                </label>
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder={'\u{1F5A5}\u{FE0F}'}
                  className={`${inputClass} text-center`}
                  style={{
                    ...inputStyle,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    '--tw-ring-color': 'var(--accent)',
                  } as React.CSSProperties}
                />
              </div>
            </div>
          </section>

          {/* ---- 2. Apps & Programs Card ---- */}
          <section className="rounded-xl p-5" style={cardStyle}>
            {/* Card header */}
            <div className="flex items-center gap-2 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5"
                style={{ color: 'var(--accent)' }}
              >
                <path
                  fillRule="evenodd"
                  d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z"
                  clipRule="evenodd"
                />
              </svg>
              <h2
                className="text-sm font-semibold flex-1"
                style={{ color: 'var(--text-primary)' }}
              >
                Apps &amp; Programs
              </h2>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                }}
              >
                {appsToOpen.length + appsToClose.length} Selected
              </span>
            </div>

            {/* Two columns */}
            <div className="grid grid-cols-2 gap-4">
              {/* Open these */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: 'var(--accent)' }}
                  />
                  <span
                    className="text-[10px] font-medium tracking-widest uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Open These
                  </span>
                </div>
                <AppSelector
                  value={appsToOpen}
                  onChange={setAppsToOpen}
                  label="Select apps to open"
                />
              </div>

              {/* Close these */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: 'var(--accent)' }}
                  />
                  <span
                    className="text-[10px] font-medium tracking-widest uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Close These
                  </span>
                </div>
                <AppSelector
                  value={appsToClose}
                  onChange={setAppsToClose}
                  label="Select apps to close"
                />
              </div>
            </div>
          </section>

          {/* ---- 3. Folders & URLs ---- */}
          <div className="grid grid-cols-2 gap-4">
            {/* Folders card */}
            <section className="rounded-xl p-5" style={cardStyle}>
              <div className="flex items-center gap-2 mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5"
                  style={{ color: 'var(--accent)' }}
                >
                  <path d="M3.75 3A1.75 1.75 0 0 0 2 4.75v3.26a3.235 3.235 0 0 1 1.75-.51h12.5c.644 0 1.245.188 1.75.51V6.75A1.75 1.75 0 0 0 16.25 5h-4.836a.25.25 0 0 1-.177-.073L9.823 3.513A1.75 1.75 0 0 0 8.586 3H3.75ZM3.75 9A1.75 1.75 0 0 0 2 10.75v4.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0 0 18 15.25v-4.5A1.75 1.75 0 0 0 16.25 9H3.75Z" />
                </svg>
                <h2
                  className="text-sm font-semibold flex-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Folders
                </h2>
                <button
                  type="button"
                  onClick={handleAddFolder}
                  className="hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--accent)' }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-1.5">
                {folders.length === 0 && (
                  <p className="text-xs py-3 text-center" style={{ color: 'var(--text-muted)' }}>
                    No folders added
                  </p>
                )}
                {folders.map((folder, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: 'var(--bg-elevated)' }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h2.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H12.5A1.5 1.5 0 0 1 14 5.5v1.382a1.5 1.5 0 0 0-1-.382h-10a1.5 1.5 0 0 0-1 .382V3.5ZM2 9.607a1.5 1.5 0 0 1 1-1.415V13.5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5V8.192a1.5 1.5 0 0 1 1 1.415V13.5a3 3 0 0 1-3 3h-7a3 3 0 0 1-3-3V9.607Z" />
                    </svg>
                    <span
                      className="flex-1 text-xs truncate"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {folder}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFolder(idx)}
                      className="shrink-0 hover:opacity-80 transition-opacity"
                      style={{ color: 'var(--text-muted)' }}
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
            </section>

            {/* URLs card */}
            <section className="rounded-xl p-5" style={cardStyle}>
              <div className="flex items-center gap-2 mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5"
                  style={{ color: 'var(--accent)' }}
                >
                  <path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z" />
                  <path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z" />
                </svg>
                <h2
                  className="text-sm font-semibold flex-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  URLs
                </h2>
                <button
                  type="button"
                  onClick={handleAddUrl}
                  disabled={!urlInput.trim()}
                  className="hover:opacity-80 transition-opacity disabled:opacity-40"
                  style={{ color: 'var(--accent)' }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              {/* URL input */}
              <div className="mb-3">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={handleUrlKeyDown}
                  placeholder="https://example.com"
                  className={inputClass}
                  style={{
                    ...inputStyle,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    '--tw-ring-color': 'var(--accent)',
                  } as React.CSSProperties}
                />
              </div>

              <div className="space-y-1.5">
                {urls.length === 0 && (
                  <p className="text-xs py-3 text-center" style={{ color: 'var(--text-muted)' }}>
                    No URLs added
                  </p>
                )}
                {urls.map((url, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: 'var(--bg-elevated)' }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: 'var(--text-muted)' }}
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
                    <span
                      className="flex-1 text-xs truncate"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {url}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveUrl(idx)}
                      className="shrink-0 hover:opacity-80 transition-opacity"
                      style={{ color: 'var(--text-muted)' }}
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
            </section>
          </div>

          {/* ---- 4. System Settings Card ---- */}
          <section className="rounded-xl p-5" style={cardStyle}>
            <div className="flex items-center gap-2 mb-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5"
                style={{ color: 'var(--accent)' }}
              >
                <path
                  fillRule="evenodd"
                  d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                  clipRule="evenodd"
                />
              </svg>
              <h2
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                System Settings
              </h2>
            </div>

            <div className="space-y-4">
              {/* Night Light */}
              <TriStateToggle
                label="Night Light"
                description="Reduce blue light for comfortable viewing"
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.455 2.004a.75.75 0 0 1 .26.77 7 7 0 0 0 9.958 7.756.75.75 0 0 1 1.067.853A8.5 8.5 0 1 1 6.647 1.921a.75.75 0 0 1 .808.083Z"
                      clipRule="evenodd"
                    />
                  </svg>
                }
                iconColor="var(--accent)"
                value={nightLight}
                onChange={setNightLight}
              />

              {/* Focus Assist */}
              <TriStateToggle
                label="Focus Assist"
                description="Suppress notifications for deep work"
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M10 1a6 6 0 0 0-3.815 10.631C7.237 12.5 8 13.443 8 14.456v.644a.75.75 0 0 0 .572.729 6.016 6.016 0 0 0 2.856 0A.75.75 0 0 0 12 15.1v-.644c0-1.013.762-1.957 1.815-2.825A6 6 0 0 0 10 1ZM8.863 17.414a.75.75 0 0 0-.226 1.483 9.066 9.066 0 0 0 2.726 0 .75.75 0 0 0-.226-1.483 7.553 7.553 0 0 1-2.274 0Z" />
                  </svg>
                }
                iconColor="#7C3AED"
                value={focusAssist}
                onChange={setFocusAssist}
              />

              {/* Divider */}
              <div className="border-t" style={{ borderColor: 'var(--border)' }} />

              {/* Audio Device */}
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'var(--accent-soft)' }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                    style={{ color: 'var(--accent)' }}
                  >
                    <path d="M10 3.75a.75.75 0 0 0-1.264-.546L4.703 7H3.167a.75.75 0 0 0-.7.48A6.985 6.985 0 0 0 2 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h1.535l4.033 3.796A.75.75 0 0 0 10 16.25V3.75ZM15.95 5.05a.75.75 0 0 0-1.06 1.061 5.5 5.5 0 0 1 0 7.778.75.75 0 0 0 1.06 1.06 7 7 0 0 0 0-9.899Z" />
                    <path d="M13.829 7.172a.75.75 0 0 0-1.061 1.06 2.5 2.5 0 0 1 0 3.536.75.75 0 0 0 1.06 1.06 4 4 0 0 0 0-5.656Z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    Audio Device
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Output device when scene activates
                  </div>
                </div>
                <select
                  value={audioDevice ?? ''}
                  onChange={(e) => setAudioDevice(e.target.value || null)}
                  className="px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 max-w-[200px]"
                  style={{
                    ...inputStyle,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    '--tw-ring-color': 'var(--accent)',
                  } as React.CSSProperties}
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
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(124, 58, 237, 0.15)' }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                    style={{ color: '#7C3AED' }}
                  >
                    <path d="M10 3.75a.75.75 0 0 0-1.264-.546L4.703 7H3.167a.75.75 0 0 0-.7.48A6.985 6.985 0 0 0 2 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h1.535l4.033 3.796A.75.75 0 0 0 10 16.25V3.75Z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        Volume
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Set system volume level
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!volumeEnabled}
                        onChange={(e) => setVolumeEnabled(!e.target.checked)}
                        className="rounded w-3.5 h-3.5"
                        style={{
                          accentColor: 'var(--accent)',
                        }}
                      />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Don&apos;t change
                      </span>
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
                      className="flex-1 h-1.5 rounded-full appearance-none disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: volumeEnabled
                          ? `linear-gradient(to right, var(--accent) ${volume}%, var(--bg-elevated) ${volume}%)`
                          : 'var(--bg-elevated)',
                        accentColor: 'var(--accent)',
                      }}
                    />
                    <span
                      className="text-xs font-mono w-8 text-right"
                      style={{
                        color: volumeEnabled
                          ? 'var(--text-secondary)'
                          : 'var(--text-muted)',
                      }}
                    >
                      {volumeEnabled ? volume : '--'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ---- 5. Display Card ---- */}
          <section className="rounded-xl p-5" style={cardStyle}>
            <div className="flex items-center gap-2 mb-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5"
                style={{ color: 'var(--accent)' }}
              >
                <path
                  fillRule="evenodd"
                  d="M2 4.25A2.25 2.25 0 0 1 4.25 2h11.5A2.25 2.25 0 0 1 18 4.25v8.5A2.25 2.25 0 0 1 15.75 15h-3.105a3.501 3.501 0 0 0 1.1 1.677A.75.75 0 0 1 13.26 18H6.74a.75.75 0 0 1-.484-1.323A3.501 3.501 0 0 0 7.355 15H4.25A2.25 2.25 0 0 1 2 12.75v-8.5Zm1.5 0a.75.75 0 0 1 .75-.75h11.5a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-.75.75H4.25a.75.75 0 0 1-.75-.75v-7.5Z"
                  clipRule="evenodd"
                />
              </svg>
              <h2
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Display
              </h2>
            </div>

            <div className="space-y-4">
              {/* Wallpaper */}
              <div>
                <label
                  className="block text-[10px] font-medium tracking-widest uppercase mb-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Wallpaper
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBrowseWallpaper}
                    className="shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-light)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Browse...
                  </button>
                  {wallpaper ? (
                    <>
                      <span
                        className="flex-1 text-xs truncate px-3 py-2.5 rounded-lg"
                        style={{
                          background: 'var(--bg-elevated)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {wallpaper}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setWallpaper(null); markDirty(); }}
                        className="shrink-0 text-xs hover:opacity-80 transition-opacity"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Clear
                      </button>
                    </>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Not set
                    </span>
                  )}
                </div>
              </div>

              {/* Monitor Layout */}
              <div>
                <label
                  className="block text-[10px] font-medium tracking-widest uppercase mb-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Monitor Layout
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCaptureLayout}
                    className="shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-light)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Capture Current Layout
                  </button>
                  {monitorLayout ? (
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {monitorLayout.monitors.length} monitor
                      {monitorLayout.monitors.length !== 1 ? 's' : ''} captured
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Not set
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ---- 6. Audio & Vibes Card ---- */}
          <section className="rounded-xl p-5" style={cardStyle}>
            <div className="flex items-center gap-2 mb-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5"
                style={{ color: 'var(--accent)' }}
              >
                <path
                  fillRule="evenodd"
                  d="M17.721 1.599a.75.75 0 0 1 .279.584v11.29a2.25 2.25 0 0 1-1.774 2.198l-2.041.442a2.216 2.216 0 1 1-.938-4.333l2.224-.482V5.15l-7.5 1.63v7.693a2.25 2.25 0 0 1-1.774 2.198l-2.042.442a2.216 2.216 0 1 1-.935-4.334l2.222-.481V3.472a.75.75 0 0 1 .6-.735l9-1.958a.75.75 0 0 1 .683.177Z"
                  clipRule="evenodd"
                />
              </svg>
              <h2
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Audio &amp; Vibes
              </h2>
            </div>

            <div className="space-y-5">
              {/* Transition Sound */}
              <div>
                <label
                  className="block text-[10px] font-medium tracking-widest uppercase mb-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Transition Sound
                </label>
                <TransitionSoundPicker value={transitionSound} onChange={setTransitionSound} />
              </div>

              {/* Divider */}
              <div className="border-t" style={{ borderColor: 'var(--border)' }} />

              {/* Music */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      Auto-launch Music
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Start a music app when scene activates
                    </div>
                  </div>
                  <ToggleSwitch checked={musicEnabled} onChange={setMusicEnabled} />
                </div>
                {musicEnabled && (
                  <div className="space-y-3 mt-3">
                    <div>
                      <label
                        className="block text-[10px] font-medium tracking-widest uppercase mb-1.5"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Music App
                      </label>
                      <input
                        type="text"
                        value={musicApp}
                        onChange={(e) => setMusicApp(e.target.value)}
                        placeholder="Spotify"
                        className={inputClass}
                        style={{
                          ...inputStyle,
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          '--tw-ring-color': 'var(--accent)',
                        } as React.CSSProperties}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-[10px] font-medium tracking-widest uppercase mb-1.5"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Playlist URI
                      </label>
                      <input
                        type="text"
                        value={playlistUri}
                        onChange={(e) => setPlaylistUri(e.target.value)}
                        placeholder="spotify:playlist:37i9dQZF1DXcBWIGoYBM5M"
                        className={inputClass}
                        style={{
                          ...inputStyle,
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          '--tw-ring-color': 'var(--accent)',
                        } as React.CSSProperties}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ---- Bottom Bar ---- */}
      <div
        className="flex items-center justify-end gap-3 px-8 py-4 border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 text-sm font-medium hover:opacity-80 transition-opacity"
          style={{ color: 'var(--text-secondary)' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--accent)' }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

/* ---- ToggleSwitch sub-component ---- */

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0"
      style={{
        background: checked ? 'var(--accent)' : 'var(--bg-elevated)',
      }}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

/* ---- TriStateToggle sub-component ---- */

function TriStateToggle({
  label,
  description,
  icon,
  iconColor,
  value,
  onChange,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  iconColor: string;
  value: TriState;
  onChange: (v: TriState) => void;
}): JSX.Element {
  const btnBase =
    'px-3 py-1.5 text-xs font-medium transition-colors duration-150';

  return (
    <div className="flex items-center gap-3">
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background:
            iconColor === 'var(--accent)'
              ? 'var(--accent-soft)'
              : 'rgba(124, 58, 237, 0.15)',
          color: iconColor,
        }}
      >
        {icon}
      </div>

      {/* Label + description */}
      <div className="flex-1">
        <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
          {label}
        </div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {description}
        </div>
      </div>

      {/* Three-state buttons */}
      <div
        className="inline-flex rounded-lg overflow-hidden"
        style={{ border: '1px solid var(--border-light)' }}
      >
        <button
          type="button"
          onClick={() => onChange(true)}
          className={btnBase}
          style={{
            background: value === true ? 'var(--accent)' : 'var(--bg-elevated)',
            color: value === true ? '#FFFFFF' : 'var(--text-secondary)',
          }}
        >
          On
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={btnBase}
          style={{
            background: value === false ? 'var(--accent)' : 'var(--bg-elevated)',
            color: value === false ? '#FFFFFF' : 'var(--text-secondary)',
            borderLeft: '1px solid var(--border-light)',
            borderRight: '1px solid var(--border-light)',
          }}
        >
          Off
        </button>
        <button
          type="button"
          onClick={() => onChange(null)}
          className={btnBase}
          style={{
            background: value === null ? 'var(--accent)' : 'var(--bg-elevated)',
            color: value === null ? '#FFFFFF' : 'var(--text-secondary)',
          }}
        >
          Don&apos;t change
        </button>
      </div>
    </div>
  );
}
