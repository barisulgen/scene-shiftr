import { useApp } from '../../context/AppContext';

export default function StatusBar(): JSX.Element {
  const { status, activeWorkspaceId, workspaces } = useApp();

  const isIdle = status === 'Ready';
  const isActivating = !isIdle && !status.includes('Done');
  const activeWorkspace = activeWorkspaceId
    ? workspaces.find((w) => w.id === activeWorkspaceId)
    : null;

  return (
    <footer
      className="flex items-center justify-between h-9 px-4 shrink-0"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
      }}
    >
      {/* Left: status */}
      <div className="flex items-center gap-2">
        {activeWorkspace && isIdle ? (
          /* Active workspace — coral dot */
          <>
            <span
              className="inline-block rounded-full"
              style={{
                width: 6,
                height: 6,
                backgroundColor: 'var(--accent)',
              }}
            />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Scene Active: <span style={{ color: 'var(--text-secondary)' }}>{activeWorkspace.name}</span>
            </span>
          </>
        ) : isActivating ? (
          /* Activating — pulsing coral dot + progress */
          <>
            <span className="relative flex" style={{ width: 6, height: 6 }}>
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: 'var(--accent)' }}
              />
              <span
                className="relative inline-flex rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: 'var(--accent)',
                }}
              />
            </span>
            <span className="text-xs" style={{ color: 'var(--accent)' }}>
              {status}
            </span>
          </>
        ) : (
          /* Idle — green dot */
          <>
            <span
              className="inline-block rounded-full"
              style={{
                width: 6,
                height: 6,
                backgroundColor: 'var(--green)',
              }}
            />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Ready to shift
            </span>
          </>
        )}
      </div>

      {/* Right: version */}
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        v0.1.0
      </span>
    </footer>
  );
}
