import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import CollapsibleSection from '../common/CollapsibleSection';
import type { Workspace, AppEntry } from '../../../../shared/types';

/* ─── SVG Icons ─── */

function GridIcon(): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path
        fillRule="evenodd"
        d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function GearIcon(): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path
        fillRule="evenodd"
        d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function MonitorIcon(): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M15.5 2A1.5 1.5 0 0 1 17 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 12.5v-9A1.5 1.5 0 0 1 4.5 2h11ZM6 17.5a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1-.75-.75Z" />
    </svg>
  );
}

function MusicNoteIcon(): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path
        fillRule="evenodd"
        d="M17.721 1.599a.75.75 0 0 1 .279.584v11.29a2.5 2.5 0 1 1-1.5-2.29V5.598l-10 1.72v8.156a2.5 2.5 0 1 1-1.5-2.29V3.833a.75.75 0 0 1 .63-.74l11.25-1.935a.75.75 0 0 1 .841.44Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PencilIcon(): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
      <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
    </svg>
  );
}

function TrashIcon(): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 1 .7.798l-.35 5.25a.75.75 0 0 1-1.497-.1l.35-5.25a.75.75 0 0 1 .797-.699Zm2.84 0a.75.75 0 0 1 .798.698l.35 5.25a.75.75 0 0 1-1.498.1l-.35-5.25a.75.75 0 0 1 .7-.798Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function MoonIcon(): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path
        fillRule="evenodd"
        d="M7.455 2.004a.75.75 0 0 1 .26.77 7 7 0 0 0 9.958 7.967.75.75 0 0 1 1.067.853A8.5 8.5 0 1 1 6.647 1.921a.75.75 0 0 1 .808.083Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function BellIcon(): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path
        fillRule="evenodd"
        d="M10 2a6 6 0 0 0-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 0 0 .515 1.076 32.91 32.91 0 0 0 3.256.508 3.5 3.5 0 0 0 6.972 0 32.903 32.903 0 0 0 3.256-.508.75.75 0 0 0 .515-1.076A11.448 11.448 0 0 1 16 8a6 6 0 0 0-6-6Zm0 14.5a2 2 0 0 1-1.95-1.557 33.54 33.54 0 0 0 3.9 0A2 2 0 0 1 10 16.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function HeadphonesIcon(): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M10 3.75a6.25 6.25 0 0 0-6.25 6.25v.894l-.476.17A2.25 2.25 0 0 0 1.75 13.25v1.5A2.25 2.25 0 0 0 4 17h.75a.75.75 0 0 0 .75-.75v-5.5a.75.75 0 0 0-.75-.75H4a.25.25 0 0 1-.25-.25V10a6.25 6.25 0 0 1 12.5 0v.75a.25.25 0 0 1-.25.25h-.75a.75.75 0 0 0-.75.75v5.5c0 .414.336.75.75.75H16a2.25 2.25 0 0 0 2.25-2.25v-1.5a2.25 2.25 0 0 0-1.524-2.186l-.476-.17V10A6.25 6.25 0 0 0 10 3.75Z" />
    </svg>
  );
}

function SpeakerIcon(): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M10.5 3.75a.75.75 0 0 0-1.264-.546L5.203 7H2.667a.75.75 0 0 0-.7.48A6.985 6.985 0 0 0 1.5 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h2.535l4.033 3.796a.75.75 0 0 0 1.264-.546V3.75ZM15.95 5.05a.75.75 0 0 0-1.06 1.061 5.5 5.5 0 0 1 0 7.778.75.75 0 0 0 1.06 1.06 7 7 0 0 0 0-9.899Z" />
      <path d="M13.829 7.172a.75.75 0 0 0-1.061 1.06 2.5 2.5 0 0 1 0 3.536.75.75 0 0 0 1.06 1.06 4 4 0 0 0 0-5.656Z" />
    </svg>
  );
}

/* ─── Helpers ─── */

function getFilename(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || path;
}

function hasApps(workspace: Workspace): boolean {
  return workspace.apps.open.length > 0 || workspace.apps.close.length > 0;
}

function hasSystem(workspace: Workspace): boolean {
  return (
    workspace.system.nightLight !== null ||
    workspace.system.focusAssist !== null ||
    workspace.system.audioDevice !== null ||
    workspace.system.volume !== null
  );
}

function hasDisplay(workspace: Workspace): boolean {
  return (
    workspace.display.wallpaper !== null ||
    workspace.display.monitorLayout !== null
  );
}

function hasFoldersOrUrls(workspace: Workspace): boolean {
  return workspace.folders.length > 0 || workspace.urls.length > 0;
}

function FolderIcon(): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M3.75 3A1.75 1.75 0 0 0 2 4.75v3.26a3.235 3.235 0 0 1 1.75-.51h12.5c.644 0 1.245.188 1.75.51V6.75A1.75 1.75 0 0 0 16.25 5h-4.836a.25.25 0 0 1-.177-.073L9.823 3.513A1.75 1.75 0 0 0 8.586 3H3.75ZM3.75 9A1.75 1.75 0 0 0 2 10.75v4.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0 0 18 15.25v-4.5A1.75 1.75 0 0 0 16.25 9H3.75Z" />
    </svg>
  );
}

function LinkIcon(): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z" />
      <path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z" />
    </svg>
  );
}

function hasAudio(workspace: Workspace): boolean {
  return (
    workspace.audio.transitionSound !== null ||
    workspace.audio.musicApp !== null ||
    workspace.audio.playlistUri !== null
  );
}

function countSettings(workspace: Workspace): number {
  let n = 0;
  if (workspace.system.nightLight !== null) n++;
  if (workspace.system.focusAssist !== null) n++;
  if (workspace.system.audioDevice !== null) n++;
  if (workspace.system.volume !== null) n++;
  if (workspace.display.wallpaper !== null) n++;
  if (workspace.display.monitorLayout !== null) n++;
  if (workspace.audio.transitionSound !== null) n++;
  if (workspace.audio.playlistUri !== null) n++;
  return n;
}

/* ─── Sub-components ─── */

function AppChip({ app, variant }: { app: AppEntry; variant: 'open' | 'close' }): JSX.Element {
  const defaultBg = variant === 'close' ? 'var(--accent-soft)' : 'var(--bg-elevated)';
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors duration-150"
      style={{
        backgroundColor: defaultBg,
        color: 'var(--text-primary)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = defaultBg;
      }}
    >
      <span
        className="w-2 h-2 rounded-sm shrink-0"
        style={{ backgroundColor: 'var(--accent)' }}
      />
      {app.name}
    </span>
  );
}

function SettingRow({
  icon,
  label,
  children,
}: {
  icon: JSX.Element;
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function PillBadge({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        color: 'var(--text-secondary)',
      }}
    >
      {children}
    </span>
  );
}

function OnOffBadge({ value }: { value: boolean }): JSX.Element {
  return (
    <PillBadge>
      {value && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: 'var(--green)' }}
        />
      )}
      {value ? 'On' : 'Off'}
    </PillBadge>
  );
}

function VolumeBadge({ value }: { value: number }): JSX.Element {
  return (
    <PillBadge>
      <span className="flex items-center gap-1.5">
        <span
          className="w-10 h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)' }}
        >
          <span
            className="block h-full rounded-full"
            style={{
              width: `${value}%`,
              background: 'linear-gradient(90deg, var(--green), var(--accent))',
            }}
          />
        </span>
        {value}%
      </span>
    </PillBadge>
  );
}

/* ─── Main Component ─── */

export default function WorkspaceDetail(): JSX.Element | null {
  const { activeWorkspaceId, status, setCurrentView } = useApp();
  const { selectedWorkspace, activateWorkspace, deactivateWorkspace, deleteWorkspace } =
    useWorkspaces();
  const [activating, setActivating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isActive = selectedWorkspace ? selectedWorkspace.id === activeWorkspaceId : false;

  // Reset activating flag when activation completes or workspace becomes active
  useEffect(() => {
    if (activating && (status === 'Ready' || status.includes('Done') || isActive)) {
      setActivating(false);
    }
  }, [activating, status, isActive]);

  if (!selectedWorkspace) return null;

  const workspace = selectedWorkspace;

  const handleActivate = async (): Promise<void> => {
    setActivating(true);
    try {
      await activateWorkspace(workspace.id);
    } catch {
      setActivating(false);
    }
  };

  const handleDeactivate = async (): Promise<void> => {
    try {
      await deactivateWorkspace();
    } catch (err) {
      console.error('Failed to deactivate workspace:', err);
    }
  };

  const handleDelete = (): void => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async (): Promise<void> => {
    setShowDeleteConfirm(false);
    try {
      await deleteWorkspace(workspace.id);
    } catch (err) {
      console.error('Failed to delete workspace:', err);
    }
  };

  const handleEdit = (): void => {
    setCurrentView('edit');
  };

  const totalApps = workspace.apps.open.length + workspace.apps.close.length;
  const settingsCount = countSettings(workspace);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl">
        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            {/* Emoji container */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-4xl"
              style={{ backgroundColor: 'var(--bg-card)' }}
            >
              {workspace.icon}
            </div>
            <div>
              <h1
                className="text-2xl font-bold leading-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                {workspace.name}
              </h1>
              {/* Status line */}
              <div className="flex items-center gap-2 mt-1">
                {isActive ? (
                  <>
                    <span
                      className="uppercase text-[10px] font-bold tracking-wider rounded-full px-2.5 py-0.5"
                      style={{
                        backgroundColor: 'var(--accent)',
                        color: '#fff',
                      }}
                    >
                      Active
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {totalApps} app{totalApps !== 1 ? 's' : ''} &middot; {settingsCount} setting{settingsCount !== 1 ? 's' : ''}
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      className="text-[10px] font-medium tracking-wider rounded-full px-2.5 py-0.5"
                      style={{
                        border: '1px solid var(--border-light)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      Inactive
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {totalApps} app{totalApps !== 1 ? 's' : ''} configured
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Edit / Delete buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleEdit}
              className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors duration-150"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              title="Edit"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <PencilIcon />
            </button>
            <button
              onClick={handleDelete}
              className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors duration-150 group"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              title="Delete"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-soft)';
                e.currentTarget.style.color = 'var(--accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <TrashIcon />
            </button>
          </div>
        </div>

        {/* ── Activate / Deactivate Button ── */}
        <div className="mb-6">
          {isActive ? (
            <button
              onClick={handleDeactivate}
              className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-medium cursor-pointer transition-all duration-150"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.97)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {/* Stop square icon */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path
                  fillRule="evenodd"
                  d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm5-2.25A.75.75 0 0 1 7.75 7h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5Z"
                  clipRule="evenodd"
                />
              </svg>
              Deactivate Scene
            </button>
          ) : activating ? (
            <button
              disabled
              className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-medium cursor-not-allowed"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-muted)',
              }}
            >
              <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--text-muted)', borderTopColor: 'var(--text-primary)' }} />
              Activating...
            </button>
          ) : (
            <button
              onClick={handleActivate}
              className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-white cursor-pointer transition-all duration-150 hover:brightness-110"
              style={{
                background: 'var(--gradient-activate)',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.97)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {/* Play triangle icon */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" />
              </svg>
              Activate Scene
            </button>
          )}
        </div>

        {/* ── Sections ── */}
        <div className="flex flex-col">
          {/* Apps & Programs */}
          <CollapsibleSection
            title="Apps & Programs"
            icon={<GridIcon />}
            count={totalApps}
            isEmpty={!hasApps(workspace)}
          >
            {workspace.apps.open.length > 0 && (
              <div className="mb-3">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider mb-2 block"
                  style={{ color: 'var(--accent)' }}
                >
                  Open
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {workspace.apps.open.map((app) => (
                    <AppChip key={app.path} app={app} variant="open" />
                  ))}
                </div>
              </div>
            )}
            {workspace.apps.close.length > 0 && (
              <div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider mb-2 block"
                  style={{ color: 'var(--accent)' }}
                >
                  Close
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {workspace.apps.close.map((app) => (
                    <AppChip key={app.path} app={app} variant="close" />
                  ))}
                </div>
              </div>
            )}
          </CollapsibleSection>

          {/* System Settings */}
          <CollapsibleSection
            title="System Settings"
            icon={<GearIcon />}
            count={
              [
                workspace.system.nightLight,
                workspace.system.focusAssist,
                workspace.system.audioDevice,
                workspace.system.volume,
              ].filter((v) => v !== null).length
            }
            isEmpty={!hasSystem(workspace)}
          >
            {workspace.system.nightLight !== null && (
              <SettingRow icon={<MoonIcon />} label="Night light">
                <OnOffBadge value={workspace.system.nightLight} />
              </SettingRow>
            )}
            {workspace.system.focusAssist !== null && (
              <SettingRow icon={<BellIcon />} label="Focus assist">
                <OnOffBadge value={workspace.system.focusAssist} />
              </SettingRow>
            )}
            {workspace.system.audioDevice !== null && (
              <SettingRow icon={<HeadphonesIcon />} label="Audio device">
                <PillBadge>{workspace.system.audioDevice}</PillBadge>
              </SettingRow>
            )}
            {workspace.system.volume !== null && (
              <SettingRow icon={<SpeakerIcon />} label="Volume">
                <VolumeBadge value={workspace.system.volume} />
              </SettingRow>
            )}
          </CollapsibleSection>

          {/* Display */}
          <CollapsibleSection
            title="Display"
            icon={<MonitorIcon />}
            count={
              [workspace.display.wallpaper, workspace.display.monitorLayout].filter(
                (v) => v !== null
              ).length
            }
            isEmpty={!hasDisplay(workspace)}
          >
            {workspace.display.wallpaper !== null && (
              <SettingRow icon={<MonitorIcon />} label="Wallpaper">
                <PillBadge>{getFilename(workspace.display.wallpaper)}</PillBadge>
              </SettingRow>
            )}
            {workspace.display.monitorLayout !== null && (
              <SettingRow icon={<MonitorIcon />} label="Monitor layout">
                <PillBadge>
                  {workspace.display.monitorLayout.monitors.length} monitor
                  {workspace.display.monitorLayout.monitors.length !== 1 ? 's' : ''}
                </PillBadge>
              </SettingRow>
            )}
          </CollapsibleSection>

          {/* Folders & URLs */}
          <CollapsibleSection
            title="Folders & URLs"
            icon={<FolderIcon />}
            count={workspace.folders.length + workspace.urls.length}
            isEmpty={!hasFoldersOrUrls(workspace)}
          >
            {workspace.folders.length > 0 && (
              <div className="mb-3">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5"
                  style={{ color: 'var(--accent)' }}
                >
                  Folders{workspace.closeFolders ? ' (close others)' : ''}
                </span>
                <div className="space-y-1">
                  {workspace.folders.map((folder) => (
                    <div
                      key={folder}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors duration-150"
                      style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                    >
                      <FolderIcon />
                      <span className="truncate">{folder}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {workspace.urls.length > 0 && (
              <div>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5"
                  style={{ color: 'var(--accent)' }}
                >
                  URLs
                </span>
                <div className="space-y-1">
                  {workspace.urls.map((url) => (
                    <div
                      key={url}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors duration-150"
                      style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                    >
                      <LinkIcon />
                      <span className="truncate">{url}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleSection>

          {/* Audio & Vibes */}
          <CollapsibleSection
            title="Audio & Vibes"
            icon={<MusicNoteIcon />}
            count={
              [
                workspace.audio.transitionSound,
                workspace.audio.musicApp,
                workspace.audio.playlistUri,
              ].filter((v) => v !== null).length
            }
            isEmpty={!hasAudio(workspace)}
          >
            {workspace.audio.transitionSound !== null && (
              <SettingRow icon={<SpeakerIcon />} label="Transition sound">
                <PillBadge>{workspace.audio.transitionSound}</PillBadge>
              </SettingRow>
            )}
            {workspace.audio.playlistUri !== null && (
              <SettingRow icon={<MusicNoteIcon />} label="Playlist">
                <PillBadge>Spotify: {workspace.audio.playlistUri}</PillBadge>
              </SettingRow>
            )}
          </CollapsibleSection>
        </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div
            className="relative rounded-xl p-6 w-[400px] shadow-2xl"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--accent-soft)' }}
            >
              <TrashIcon />
            </div>
            <h2
              className="text-base font-semibold mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              Delete workspace
            </h2>
            <p
              className="text-sm mb-6"
              style={{ color: 'var(--text-secondary)' }}
            >
              Delete &ldquo;{workspace.name}&rdquo;? This cannot be undone.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
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
                onClick={confirmDelete}
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
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
