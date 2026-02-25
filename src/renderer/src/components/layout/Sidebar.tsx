import { useApp } from '../../context/AppContext';
import WorkspaceList from '../workspace/WorkspaceList';

export default function Sidebar(): JSX.Element {
  const { setCurrentView, currentView } = useApp();

  return (
    <aside
      className="flex flex-col w-64 shrink-0"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Workspace list area */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="px-2 pb-2">
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}
          >
            Workspaces
          </span>
        </div>
        <WorkspaceList />
      </div>

      {/* Bottom actions */}
      <div className="flex flex-col gap-1 px-3 pb-3" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => setCurrentView('create')}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-colors duration-150"
          style={{ color: 'var(--accent)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-soft)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          New Workspace
        </button>
        <button
          onClick={() => setCurrentView(currentView === 'settings' ? 'main' : 'settings')}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-colors duration-150 relative"
          style={{
            color: currentView === 'settings' ? 'var(--text-primary)' : 'var(--text-secondary)',
            backgroundColor: currentView === 'settings' ? 'var(--bg-card-hover)' : 'transparent',
            borderLeft: currentView === 'settings' ? '3px solid var(--accent)' : '3px solid transparent',
          }}
          onMouseEnter={(e) => {
            if (currentView !== 'settings') {
              e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (currentView !== 'settings') {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path
              fillRule="evenodd"
              d="M6.955 1.45A.5.5 0 0 1 7.452 1h1.096a.5.5 0 0 1 .497.45l.17 1.699c.484.12.94.312 1.356.562l1.321-.916a.5.5 0 0 1 .67.033l.774.775a.5.5 0 0 1 .034.67l-.916 1.32c.25.417.443.873.563 1.357l1.699.17a.5.5 0 0 1 .45.497v1.096a.5.5 0 0 1-.45.497l-1.699.17c-.12.484-.312.94-.562 1.356l.916 1.321a.5.5 0 0 1-.034.67l-.774.774a.5.5 0 0 1-.67.033l-1.32-.916c-.417.25-.874.443-1.357.563l-.17 1.699a.5.5 0 0 1-.497.45H7.452a.5.5 0 0 1-.497-.45l-.17-1.699a4.973 4.973 0 0 1-1.356-.562l-1.321.916a.5.5 0 0 1-.67-.034l-.774-.774a.5.5 0 0 1-.034-.67l.916-1.32a4.972 4.972 0 0 1-.563-1.357l-1.699-.17A.5.5 0 0 1 1 8.548V7.452a.5.5 0 0 1 .45-.497l1.699-.17c.12-.484.312-.94.562-1.356l-.916-1.321a.5.5 0 0 1 .034-.67l.774-.774a.5.5 0 0 1 .67-.033l1.32.916c.417-.25.874-.443 1.357-.563l.17-1.699ZM8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
              clipRule="evenodd"
            />
          </svg>
          Settings
        </button>
        <button
          onClick={() => window.open('https://github.com/barisulgen/scene-shiftr/issues/new/choose', '_blank')}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-colors duration-150"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path fillRule="evenodd" d="M1 8.74c0 .983.713 1.825 1.69 1.943.764.092 1.534.164 2.31.216v2.351a.75.75 0 0 0 1.28.53l2.51-2.51c.182-.181.427-.29.684-.31a41.72 41.72 0 0 0 2.836-.26c.977-.118 1.69-.96 1.69-1.943V4.26c0-.983-.713-1.825-1.69-1.943A44.73 44.73 0 0 0 8 2a44.73 44.73 0 0 0-5.31.317C1.713 2.435 1 3.277 1 4.26v4.48ZM5.5 6a.75.75 0 0 0 0 1.5h5a.75.75 0 0 0 0-1.5h-5Zm0 2.5a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5H5.5Z" clipRule="evenodd" />
          </svg>
          Feedback
        </button>
      </div>
    </aside>
  );
}
