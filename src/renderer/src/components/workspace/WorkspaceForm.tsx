import { useState, useEffect, useCallback, useRef } from 'react';
import type { Workspace, AppEntry } from '../../../../shared/types';
import { useApp } from '../../context/AppContext';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import AppSelector from './AppSelector';
import TransitionSoundPicker from './TransitionSoundPicker';

interface WorkspaceFormProps {
  workspace?: Workspace;
}

// Shared input style for text inputs
const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  padding: '12px 16px',
  color: 'var(--text-primary)',
  fontSize: '14px',
};

// Shared select style — uses solid bg so native dropdown options render dark
const selectStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '12px 16px',
  color: 'var(--text-primary)',
  fontSize: '14px',
};

const inputFocusBorder = 'rgba(232,99,107,0.3)';

export default function WorkspaceForm({ workspace }: WorkspaceFormProps): JSX.Element {
  const { navigateAway, setHasUnsavedChanges } = useApp();
  const { createWorkspace, updateWorkspace } = useWorkspaces();

  const markDirty = useCallback(() => setHasUnsavedChanges(true), [setHasUnsavedChanges]);

  const isEdit = !!workspace;
  const isDefaultWorkspace = workspace?.isDefault ?? false;

  // --- Form state (raw setters are private, dirty wrappers are used in JSX) ---
  const [name, setNameRaw] = useState(workspace?.name ?? '');
  const [icon, setIconRaw] = useState(workspace?.icon ?? '');
  const [appsToOpen, setAppsToOpenRaw] = useState<AppEntry[]>(workspace?.apps.open ?? []);
  const [appsToClose, setAppsToCloseRaw] = useState<AppEntry[]>(workspace?.apps.close ?? []);
  const [folders, setFolders] = useState<string[]>(workspace?.folders ?? []);
  const [closeFolders, setCloseFoldersRaw] = useState(workspace?.closeFolders ?? false);
  const [urls, setUrls] = useState<string[]>(workspace?.urls ?? []);
  const [urlInput, setUrlInput] = useState('');
  const [audioDevice, setAudioDeviceRaw] = useState<string | null>(workspace?.system.audioDevice ?? null);
  const [volume, setVolumeRaw] = useState<number>(workspace?.system.volume ?? 50);
  const [volumeEnabled, setVolumeEnabledRaw] = useState(workspace?.system.volume != null);
  const [audioDevices, setAudioDevices] = useState<{ id: string; name: string }[]>([]);
  const [wallpaper, setWallpaper] = useState<string | null>(workspace?.display.wallpaper ?? null);
  const [transitionSound, setTransitionSoundRaw] = useState<string | null>(workspace?.audio.transitionSound ?? null);
  const [musicEnabled, setMusicEnabledRaw] = useState(!!workspace?.audio.playlistUri);
  const [playlistUri, setPlaylistUriRaw] = useState(workspace?.audio.playlistUri ?? '');

  // Dirty-wrapping setters — these mark the form as having unsaved changes
  const setName = (v: string): void => { setNameRaw(v); markDirty(); };
  const setIcon = (v: string): void => { setIconRaw(v); markDirty(); };
  const setAppsToOpen = (v: AppEntry[]): void => { setAppsToOpenRaw(v); markDirty(); };
  const setAppsToClose = (v: AppEntry[]): void => { setAppsToCloseRaw(v); markDirty(); };
  const setAudioDevice = (v: string | null): void => { setAudioDeviceRaw(v); markDirty(); };
  const setVolume = (v: number): void => { setVolumeRaw(v); markDirty(); };
  const setVolumeEnabled = (v: boolean): void => { setVolumeEnabledRaw(v); markDirty(); };
  const setTransitionSound = (v: string | null): void => { setTransitionSoundRaw(v); markDirty(); };
  const setMusicEnabled = (v: boolean): void => { setMusicEnabledRaw(v); markDirty(); };
  const setPlaylistUri = (v: string): void => { setPlaylistUriRaw(v); markDirty(); };
  const setCloseFolders = (v: boolean): void => { setCloseFoldersRaw(v); markDirty(); };

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

  const handleSave = async (): Promise<void> => {
    if (!name.trim()) return;
    setSaving(true);

    const data: Partial<Workspace> = {
      name: name.trim(),
      icon: icon || '\u{1F5A5}\u{FE0F}',
      apps: { open: appsToOpen, close: appsToClose },
      folders,
      closeFolders,
      urls,
      system: {
        audioDevice,
        volume: volumeEnabled ? volume : null,
      },
      display: {
        wallpaper,
      },
      audio: {
        transitionSound,
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

  // Extract wallpaper filename for display
  const wallpaperFileName = wallpaper
    ? wallpaper.replace(/\\/g, '/').split('/').pop() ?? wallpaper
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* ---- Sticky Header ---- */}
      <div
        className="flex items-center justify-between px-8 py-4 shrink-0"
        style={{
          background: 'var(--bg-base)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <h1
          className="text-lg font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {isEdit ? 'Edit Workspace' : 'Create Workspace'}
        </h1>
        <button
          type="button"
          onClick={handleCancel}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-colors duration-150"
          style={{ background: 'rgba(255,255,255,0.04)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
          }}
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

      {/* ---- Scrollable Middle ---- */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-2xl">

          {/* ======== GROUP 1 — IDENTITY ======== */}
          <div className="mb-8">
            <div
              className="text-[10px] font-semibold uppercase mb-4"
              style={{ color: '#5a5a6e', letterSpacing: '0.15em' }}
            >
              Identity
            </div>
            <div className="flex items-center gap-3">
              {isDefaultWorkspace ? (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {'\u{1F3E0}'}
                </div>
              ) : (
                <EmojiPicker value={icon} onChange={setIcon} />
              )}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Workspace"
                required
                className="flex-1 focus:outline-none"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = inputFocusBorder; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              />
            </div>
          </div>

          {/* ======== GROUP 2 — WHAT HAPPENS ======== */}
          {!isDefaultWorkspace && (
            <div className="mb-8">
              {/* Divider */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
              <div className="pt-6">
                <div
                  className="text-[10px] font-semibold uppercase mb-4"
                  style={{ color: '#5a5a6e', letterSpacing: '0.15em' }}
                >
                  What Happens
                </div>

                {/* --- Apps & Programs --- */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    {/* Grid icon */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                      style={{ color: '#8888A0' }}
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Apps &amp; Programs
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        color: '#8888A0',
                      }}
                    >
                      {appsToOpen.length + appsToClose.length} Selected
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Open these column */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: '#6382f1' }}
                        />
                        <span
                          className="text-[10px] font-semibold uppercase"
                          style={{ color: '#5a5a6e', letterSpacing: '0.15em' }}
                        >
                          Open These
                        </span>
                      </div>
                      <AppSelector
                        value={appsToOpen}
                        onChange={setAppsToOpen}
                        label=""
                        variant="open"
                      />
                    </div>

                    {/* Close these column */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: 'var(--accent)' }}
                        />
                        <span
                          className="text-[10px] font-semibold uppercase"
                          style={{ color: '#5a5a6e', letterSpacing: '0.15em' }}
                        >
                          Close These
                        </span>
                      </div>
                      <AppSelector
                        value={appsToClose}
                        onChange={setAppsToClose}
                        label=""
                        variant="close"
                      />
                    </div>
                  </div>
                </div>

                {/* --- Folders --- */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                      style={{ color: '#8888A0' }}
                    >
                      <path d="M3.75 3A1.75 1.75 0 0 0 2 4.75v3.26a3.235 3.235 0 0 1 1.75-.51h12.5c.644 0 1.245.188 1.75.51V6.75A1.75 1.75 0 0 0 16.25 5h-4.836a.25.25 0 0 1-.177-.073L9.823 3.513A1.75 1.75 0 0 0 8.586 3H3.75ZM3.75 9A1.75 1.75 0 0 0 2 10.75v4.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0 0 18 15.25v-4.5A1.75 1.75 0 0 0 16.25 9H3.75Z" />
                    </svg>
                    <span className="text-sm font-medium flex-1" style={{ color: 'var(--text-primary)' }}>
                      Folders
                    </span>
                    <button
                      type="button"
                      onClick={handleAddFolder}
                      className="text-xs cursor-pointer transition-colors duration-150 px-2.5 py-1 rounded-lg"
                      style={{
                        color: '#8888A0',
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--text-primary)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#8888A0';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                      }}
                    >
                      + Add Folder
                    </button>
                  </div>

                  {/* Close other folders toggle */}
                  <div className="flex items-center justify-between py-2 mb-2">
                    <span className="text-xs" style={{ color: '#8888A0' }}>
                      Close other folders
                    </span>
                    <ToggleSwitch checked={closeFolders} onChange={setCloseFolders} />
                  </div>

                  <div className="space-y-1.5">
                    {folders.length === 0 && (
                      <p className="text-xs py-3 text-center" style={{ color: '#5a5a6e' }}>
                        No folders added
                      </p>
                    )}
                    {folders.map((folder, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          className="w-3.5 h-3.5 shrink-0"
                          style={{ color: '#5a5a6e' }}
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
                          className="shrink-0 cursor-pointer transition-colors duration-150"
                          style={{ color: '#5a5a6e' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--text-primary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#5a5a6e';
                          }}
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
                </div>

                {/* --- URLs --- */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                      style={{ color: '#8888A0' }}
                    >
                      <path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z" />
                      <path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z" />
                    </svg>
                    <span className="text-sm font-medium flex-1" style={{ color: 'var(--text-primary)' }}>
                      URLs
                    </span>
                  </div>

                  {/* URL input + Add button */}
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={handleUrlKeyDown}
                      placeholder="https://example.com"
                      className="flex-1 focus:outline-none"
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = inputFocusBorder; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                    />
                    <button
                      type="button"
                      onClick={handleAddUrl}
                      disabled={!urlInput.trim()}
                      className="shrink-0 px-4 rounded-lg text-sm font-medium cursor-pointer transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#8888A0',
                      }}
                      onMouseEnter={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.color = 'var(--text-primary)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#8888A0';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                      }}
                    >
                      Add
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {urls.length === 0 && (
                      <p className="text-xs py-3 text-center" style={{ color: '#5a5a6e' }}>
                        No URLs added
                      </p>
                    )}
                    {urls.map((url, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          className="w-3.5 h-3.5 shrink-0"
                          style={{ color: '#5a5a6e' }}
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
                          className="shrink-0 cursor-pointer transition-colors duration-150"
                          style={{ color: '#5a5a6e' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--text-primary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#5a5a6e';
                          }}
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
                </div>
              </div>
            </div>
          )}

          {/* ======== GROUP 3 — SYSTEM & VIBES ======== */}
          <div>
            {/* Divider */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
            <div className="pt-6">
              <div
                className="text-[10px] font-semibold uppercase mb-4"
                style={{ color: '#5a5a6e', letterSpacing: '0.15em' }}
              >
                System &amp; Vibes
              </div>

              {/* Audio device + Volume — side by side */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Audio device */}
                <div>
                  <label
                    className="block text-xs mb-1.5"
                    style={{ color: '#8888A0' }}
                  >
                    Audio Device
                  </label>
                  <select
                    value={audioDevice ?? ''}
                    onChange={(e) => setAudioDevice(e.target.value || null)}
                    className="w-full focus:outline-none"
                    style={selectStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = inputFocusBorder; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                  >
                    <option value="">Don&apos;t change</option>
                    {audioDevices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Volume */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs" style={{ color: '#8888A0' }}>
                      Volume
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!volumeEnabled}
                        onChange={(e) => setVolumeEnabled(!e.target.checked)}
                        className="rounded w-3.5 h-3.5"
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <span className="text-xs" style={{ color: '#8888A0' }}>
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
                        color: volumeEnabled ? 'var(--text-secondary)' : '#5a5a6e',
                      }}
                    >
                      {volumeEnabled ? `${volume}%` : '--'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Wallpaper */}
              <div className="mb-4">
                <label
                  className="block text-xs mb-1.5"
                  style={{ color: '#8888A0' }}
                >
                  Wallpaper
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleBrowseWallpaper}
                    className="shrink-0 px-4 py-2.5 rounded-lg text-sm cursor-pointer transition-colors duration-150"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#8888A0',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--text-primary)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#8888A0';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    }}
                  >
                    Browse...
                  </button>
                  {wallpaper ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <img
                        src={`file://${wallpaper.replace(/\\/g, '/')}`}
                        alt="Wallpaper preview"
                        className="w-12 h-12 rounded-lg object-cover shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <span
                        className="text-xs truncate flex-1"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {wallpaperFileName}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setWallpaper(null); markDirty(); }}
                        className="shrink-0 text-xs cursor-pointer transition-colors duration-150"
                        style={{ color: '#5a5a6e' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#5a5a6e';
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs" style={{ color: '#5a5a6e' }}>
                      Not set
                    </span>
                  )}
                </div>
              </div>

              {/* Transition Sound + Playlist URI — only for non-default */}
              {!isDefaultWorkspace && (
                <>
                  {/* Transition Sound */}
                  <div className="mb-4">
                    <TransitionSoundPicker value={transitionSound} onChange={setTransitionSound} />
                  </div>

                  {/* Playlist URI */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs" style={{ color: '#8888A0' }}>
                        Playlist URI
                      </label>
                      <ToggleSwitch checked={musicEnabled} onChange={setMusicEnabled} />
                    </div>
                    <input
                      type="text"
                      value={playlistUri}
                      onChange={(e) => setPlaylistUri(e.target.value)}
                      disabled={!musicEnabled}
                      placeholder="spotify:playlist:37i9dQZF1DXcBWIGoYBM5M"
                      className="w-full focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = inputFocusBorder; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ---- Sticky Footer ---- */}
      <div
        className="flex items-center justify-between px-8 py-4 shrink-0"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors duration-150"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#9CA3AF',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.color = '#9CA3AF';
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white cursor-pointer transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--accent)' }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent)';
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
  );
}

/* ---- EmojiPicker sub-component ---- */

const EMOJI_OPTIONS = [
  '\u{1F5A5}\u{FE0F}', '\u{1F3AE}', '\u{1F4BC}', '\u{1F3A8}', '\u{1F3B5}', '\u{1F4DA}', '\u{1F3E0}', '\u{1F319}',
  '\u{2600}\u{FE0F}', '\u{1F680}', '\u{1F4BB}', '\u{1F3AF}', '\u{1F4F7}', '\u{1F3AC}', '\u{270F}\u{FE0F}', '\u{1F527}',
  '\u{1F3A7}', '\u{1F4F1}', '\u{1F30D}', '\u{26A1}', '\u{1F3AD}', '\u{1F3CB}\u{FE0F}', '\u{1F3B8}', '\u{1F37F}',
  '\u{1F4DD}', '\u{1F52C}', '\u{1F3AA}', '\u{1F3D6}\u{FE0F}', '\u{1F3A4}', '\u{1F9E9}', '\u{1F3B2}', '\u{1F308}',
];

function EmojiPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 cursor-pointer transition-colors duration-150"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
        }}
      >
        {value || '\u{1F5A5}\u{FE0F}'}
      </button>
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 p-2 rounded-xl shadow-2xl z-30 grid grid-cols-8 gap-1"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid rgba(255,255,255,0.08)',
            width: '280px',
          }}
        >
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onChange(emoji);
                setIsOpen(false);
              }}
              className="w-8 h-8 rounded-md flex items-center justify-center text-lg transition-colors duration-100"
              style={{
                backgroundColor: value === emoji ? 'var(--accent-soft)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (value !== emoji) e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
              }}
              onMouseLeave={(e) => {
                if (value !== emoji) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
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
      className="relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 cursor-pointer"
      style={{
        background: checked ? 'var(--accent)' : 'var(--bg-elevated)',
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
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
