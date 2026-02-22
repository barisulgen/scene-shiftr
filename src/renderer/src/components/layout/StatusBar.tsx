import { useApp } from '../../context/AppContext';

export default function StatusBar(): JSX.Element {
  const { status, activeWorkspaceId, workspaces } = useApp();

  const isIdle = status === 'Ready';
  const activeWorkspace = activeWorkspaceId
    ? workspaces.find((w) => w.id === activeWorkspaceId)
    : null;

  return (
    <footer className="flex items-center justify-between h-8 px-4 bg-zinc-900 border-t border-zinc-800 shrink-0">
      {/* Left: status */}
      <div className="flex items-center gap-2">
        {!isIdle && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
          </span>
        )}
        <span
          className={`text-[11px] ${
            isIdle ? 'text-zinc-500' : 'text-indigo-400'
          }`}
        >
          {status}
        </span>
      </div>

      {/* Right: active workspace */}
      {activeWorkspace && (
        <span className="text-[11px] text-zinc-500">
          Active: <span className="text-zinc-400">{activeWorkspace.name}</span>
        </span>
      )}
    </footer>
  );
}
