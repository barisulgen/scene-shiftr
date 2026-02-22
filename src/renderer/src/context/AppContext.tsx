import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Workspace } from '../../../shared/types';

interface AppContextValue {
  // Workspace state
  workspaces: Workspace[];
  selectedWorkspaceId: string | null;
  activeWorkspaceId: string | null;

  // UI state
  status: string;
  currentView: 'main' | 'settings' | 'create' | 'edit';

  // Actions
  selectWorkspace: (id: string | null) => void;
  setStatus: (msg: string) => void;
  setCurrentView: (view: 'main' | 'settings' | 'create' | 'edit') => void;
  refreshWorkspaces: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }): JSX.Element {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [status, setStatus] = useState('Ready');
  const [currentView, setCurrentView] = useState<'main' | 'settings' | 'create' | 'edit'>('main');

  const refreshWorkspaces = useCallback(async () => {
    try {
      const list = await window.api.listWorkspaces();
      setWorkspaces(list);
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    }
    try {
      const settings = await window.api.getSettings();
      setActiveWorkspaceId(settings.activeWorkspaceId);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, []);

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  // Listen for activation progress
  useEffect(() => {
    try {
      const cleanup = window.api.onActivationProgress((msg: string) => {
        setStatus(msg);
        if (msg.includes('Done')) {
          refreshWorkspaces();
          setTimeout(() => setStatus('Ready'), 2000);
        }
      });
      return cleanup;
    } catch (err) {
      console.error('Failed to register activation progress listener:', err);
      return undefined;
    }
  }, [refreshWorkspaces]);

  const value: AppContextValue = {
    workspaces,
    selectedWorkspaceId,
    activeWorkspaceId,
    status,
    currentView,
    selectWorkspace: setSelectedWorkspaceId,
    setStatus,
    setCurrentView,
    refreshWorkspaces,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
