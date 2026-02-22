import { useApp } from '../../context/AppContext';

export default function Sidebar(): JSX.Element {
  const { setCurrentView, currentView } = useApp();

  return (
    <aside className="flex flex-col w-64 bg-zinc-900 border-r border-zinc-800 shrink-0">
      {/* App logo / title */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-zinc-800/50">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-indigo-600 text-white text-xs font-bold tracking-tight">
          SS
        </div>
        <span className="text-sm font-semibold tracking-wide text-zinc-100">
          Scene Shiftr
        </span>
      </div>

      {/* Workspace list area */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="px-2 pb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Workspaces
          </span>
        </div>
        {/* Workspace items will be populated in Task 20 */}
        <div className="flex flex-col items-center justify-center py-8 text-zinc-600 text-xs">
          <span>No workspaces yet</span>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex flex-col gap-1 px-3 pb-3">
        <button
          onClick={() => setCurrentView('create')}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors duration-150"
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
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors duration-150 ${
            currentView === 'settings'
              ? 'text-zinc-100 bg-zinc-800'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
          }`}
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
      </div>
    </aside>
  );
}
