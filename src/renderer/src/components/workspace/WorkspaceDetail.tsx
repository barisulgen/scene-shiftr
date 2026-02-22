import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import CollapsibleSection from '../common/CollapsibleSection';
import type { Workspace, AppEntry } from '../../../../shared/types';

function AppChip({ app }: { app: AppEntry }): JSX.Element {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-800 text-xs text-zinc-300">
      {app.name}
    </span>
  );
}

function KeyValue({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className="text-xs text-zinc-500 shrink-0">{label}</span>
      <span className="text-xs text-zinc-300 text-right truncate">{value}</span>
    </div>
  );
}

function truncatePath(path: string, maxLen = 40): string {
  if (path.length <= maxLen) return path;
  const parts = path.replace(/\\/g, '/').split('/');
  if (parts.length <= 2) return '...' + path.slice(-maxLen);
  return parts[0] + '/.../' + parts.slice(-2).join('/');
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

function hasAudio(workspace: Workspace): boolean {
  return (
    workspace.audio.transitionSound !== null ||
    workspace.audio.musicApp !== null ||
    workspace.audio.playlistUri !== null
  );
}

export default function WorkspaceDetail(): JSX.Element | null {
  const { activeWorkspaceId, status, setCurrentView } = useApp();
  const { selectedWorkspace, activateWorkspace, deactivateWorkspace, deleteWorkspace } =
    useWorkspaces();
  const [activating, setActivating] = useState(false);

  if (!selectedWorkspace) return null;

  const workspace = selectedWorkspace;
  const isActive = workspace.id === activeWorkspaceId;

  // Reset activating flag when activation completes or workspace becomes active
  useEffect(() => {
    if (activating && (status === 'Ready' || status.includes('Done') || isActive)) {
      setActivating(false);
    }
  }, [activating, status, isActive]);

  const handleActivate = async (): Promise<void> => {
    setActivating(true);
    try {
      await activateWorkspace(workspace.id);
    } catch {
      setActivating(false);
    }
  };

  const handleDeactivate = async (): Promise<void> => {
    await deactivateWorkspace();
  };

  const handleDelete = (): void => {
    if (window.confirm(`Delete "${workspace.name}"? This cannot be undone.`)) {
      deleteWorkspace(workspace.id);
    }
  };

  const handleEdit = (): void => {
    setCurrentView('edit');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">{workspace.icon}</span>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
            {workspace.name}
          </h1>
        </div>

        <div className="w-full h-px bg-zinc-800 my-4" />

        {/* Activate / Active badge */}
        <div className="flex items-center gap-3 mb-6">
          {isActive ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-950/50 text-emerald-400 text-sm font-medium border border-emerald-800/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Active
              </span>
              <button
                onClick={handleDeactivate}
                className="px-4 py-2 rounded-md border border-zinc-700 text-sm text-zinc-300 font-medium hover:border-zinc-600 hover:text-zinc-100 transition-colors duration-150"
              >
                Deactivate
              </button>
            </>
          ) : activating ? (
            <button
              disabled
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600/50 text-white/70 text-sm font-medium cursor-not-allowed"
            >
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Activating...
            </button>
          ) : (
            <button
              onClick={handleActivate}
              className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors duration-150"
            >
              Activate
            </button>
          )}
        </div>

        {/* Sections */}
        <div className="flex flex-col">
          {/* Apps & Programs */}
          <CollapsibleSection
            title="Apps & Programs"
            isEmpty={!hasApps(workspace)}
          >
            {workspace.apps.open.length > 0 && (
              <div className="mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1 block">
                  Open
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {workspace.apps.open.map((app) => (
                    <AppChip key={app.path} app={app} />
                  ))}
                </div>
              </div>
            )}
            {workspace.apps.close.length > 0 && (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1 block">
                  Close
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {workspace.apps.close.map((app) => (
                    <AppChip key={app.path} app={app} />
                  ))}
                </div>
              </div>
            )}
          </CollapsibleSection>

          {/* System Settings */}
          <CollapsibleSection
            title="System Settings"
            isEmpty={!hasSystem(workspace)}
          >
            {workspace.system.nightLight !== null && (
              <KeyValue
                label="Night light"
                value={workspace.system.nightLight ? 'On' : 'Off'}
              />
            )}
            {workspace.system.focusAssist !== null && (
              <KeyValue
                label="Focus assist"
                value={workspace.system.focusAssist ? 'On' : 'Off'}
              />
            )}
            {workspace.system.audioDevice !== null && (
              <KeyValue label="Audio" value={workspace.system.audioDevice} />
            )}
            {workspace.system.volume !== null && (
              <KeyValue label="Volume" value={`${workspace.system.volume}%`} />
            )}
          </CollapsibleSection>

          {/* Display */}
          <CollapsibleSection title="Display" isEmpty={!hasDisplay(workspace)}>
            {workspace.display.wallpaper !== null && (
              <KeyValue
                label="Wallpaper"
                value={truncatePath(workspace.display.wallpaper)}
              />
            )}
            {workspace.display.monitorLayout !== null && (
              <KeyValue
                label="Monitor layout"
                value={`${workspace.display.monitorLayout.monitors.length} monitor${
                  workspace.display.monitorLayout.monitors.length !== 1
                    ? 's'
                    : ''
                } saved`}
              />
            )}
          </CollapsibleSection>

          {/* Audio & Vibes */}
          <CollapsibleSection
            title="Audio & Vibes"
            isEmpty={!hasAudio(workspace)}
          >
            {workspace.audio.transitionSound !== null && (
              <KeyValue
                label="Transition sound"
                value={workspace.audio.transitionSound}
              />
            )}
            {workspace.audio.musicApp !== null && (
              <KeyValue label="Music app" value={workspace.audio.musicApp} />
            )}
            {workspace.audio.playlistUri !== null && (
              <KeyValue
                label="Playlist"
                value={workspace.audio.playlistUri}
              />
            )}
          </CollapsibleSection>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex items-center gap-3 px-8 py-4 border-t border-zinc-800/60">
        <button
          onClick={handleEdit}
          className="px-4 py-2 rounded-md border border-zinc-700 text-sm text-zinc-300 font-medium hover:border-zinc-600 hover:text-zinc-100 transition-colors duration-150"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          className="px-4 py-2 rounded-md bg-red-900/30 text-sm text-red-400 font-medium hover:bg-red-800/50 transition-colors duration-150"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
