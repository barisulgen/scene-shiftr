import { useApp } from '../../context/AppContext';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import WorkspaceDetail from '../workspace/WorkspaceDetail';
import WorkspaceForm from '../workspace/WorkspaceForm';
import SettingsPage from '../../pages/SettingsPage';

export default function MainPanel(): JSX.Element {
  const { currentView, selectedWorkspaceId } = useApp();
  const { selectedWorkspace } = useWorkspaces();

  return (
    <main className="flex-1 overflow-y-auto bg-zinc-950">
      {currentView === 'settings' && <SettingsPage />}

      {currentView === 'create' && <WorkspaceForm />}

      {currentView === 'main' && !selectedWorkspaceId && (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3 text-zinc-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-10 h-10 text-zinc-700"
            >
              <path d="M5.566 4.657A4.505 4.505 0 0 1 6.75 4.5h10.5c.41 0 .806.055 1.183.157A3 3 0 0 0 15.75 3h-7.5a3 3 0 0 0-2.684 1.657ZM2.25 12a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3v-6ZM5.25 7.5c-.41 0-.806.055-1.184.157A3 3 0 0 1 6.75 6h10.5a3 3 0 0 1 2.683 1.657A4.505 4.505 0 0 0 18.75 7.5H5.25Z" />
            </svg>
            <span className="text-sm font-medium text-zinc-400">Select a workspace</span>
            <span className="text-xs text-zinc-600">
              Choose a workspace from the sidebar or create a new one
            </span>
          </div>
        </div>
      )}

      {currentView === 'main' && selectedWorkspaceId && <WorkspaceDetail />}

      {currentView === 'edit' && selectedWorkspace && (
        <WorkspaceForm workspace={selectedWorkspace} />
      )}

      {currentView === 'edit' && !selectedWorkspace && (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3 text-zinc-500">
            <span className="text-sm font-medium text-zinc-400">No workspace selected</span>
            <span className="text-xs text-zinc-600">
              Select a workspace to edit from the sidebar
            </span>
          </div>
        </div>
      )}
    </main>
  );
}
