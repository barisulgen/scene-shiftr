import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import type { Workspace } from '../../../shared/types';

type ViewType = 'main' | 'settings' | 'create' | 'edit';

interface PendingNavigation {
  type: 'view' | 'select';
  view?: ViewType;
  workspaceId?: string | null;
}

interface AppContextValue {
  // Workspace state
  workspaces: Workspace[];
  selectedWorkspaceId: string | null;
  activeWorkspaceId: string | null;

  // UI state
  status: string;
  currentView: ViewType;

  // Unsaved changes guard
  pendingNavigation: PendingNavigation | null;

  // Actions
  selectWorkspace: (id: string | null) => void;
  setStatus: (msg: string) => void;
  setCurrentView: (view: ViewType) => void;
  navigateAway: (view: ViewType) => void;
  refreshWorkspaces: () => Promise<void>;
  setHasUnsavedChanges: (dirty: boolean) => void;
  confirmNavigation: () => void;
  cancelNavigation: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }): JSX.Element {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [status, setStatus] = useState('Ready');
  const [currentView, setCurrentViewRaw] = useState<ViewType>('main');
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);
  const hasUnsavedRef = useRef(false);

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

  const isInForm = currentView === 'create' || currentView === 'edit';

  const setCurrentView = useCallback((view: ViewType) => {
    if (isInForm && hasUnsavedRef.current && view !== currentView) {
      setPendingNavigation({ type: 'view', view });
      return;
    }
    hasUnsavedRef.current = false;
    setCurrentViewRaw(view);
  }, [isInForm, currentView]);

  const selectWorkspace = useCallback((id: string | null) => {
    if (isInForm && hasUnsavedRef.current) {
      setPendingNavigation({ type: 'select', workspaceId: id });
      return;
    }
    hasUnsavedRef.current = false;
    setSelectedWorkspaceId(id);
  }, [isInForm]);

  // Force navigation without guard — used by form save/cancel
  const navigateAway = useCallback((view: ViewType) => {
    hasUnsavedRef.current = false;
    setCurrentViewRaw(view);
  }, []);

  const setHasUnsavedChanges = useCallback((dirty: boolean) => {
    hasUnsavedRef.current = dirty;
  }, []);

  const confirmNavigation = useCallback(() => {
    if (!pendingNavigation) return;
    hasUnsavedRef.current = false;

    if (pendingNavigation.type === 'view' && pendingNavigation.view) {
      setCurrentViewRaw(pendingNavigation.view);
    } else if (pendingNavigation.type === 'select') {
      setSelectedWorkspaceId(pendingNavigation.workspaceId ?? null);
      setCurrentViewRaw('main');
    }

    setPendingNavigation(null);
  }, [pendingNavigation]);

  const cancelNavigation = useCallback(() => {
    setPendingNavigation(null);
  }, []);

  const value: AppContextValue = {
    workspaces,
    selectedWorkspaceId,
    activeWorkspaceId,
    status,
    currentView,
    pendingNavigation,
    selectWorkspace,
    setStatus,
    setCurrentView,
    navigateAway,
    refreshWorkspaces,
    setHasUnsavedChanges,
    confirmNavigation,
    cancelNavigation,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
