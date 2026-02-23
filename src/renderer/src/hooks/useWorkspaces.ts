import { useApp } from '../context/AppContext';

export function useWorkspaces() {
  const { workspaces, refreshWorkspaces, selectedWorkspaceId, selectWorkspace } = useApp();

  const createWorkspace = async (data: Record<string, unknown>) => {
    try {
      const ws = await window.api.createWorkspace(data);
      await refreshWorkspaces();
      selectWorkspace(ws.id);
      return ws;
    } catch (err) {
      console.error('Failed to create workspace:', err);
      throw err;
    }
  };

  const updateWorkspace = async (id: string, data: Record<string, unknown>) => {
    try {
      const ws = await window.api.updateWorkspace(id, data);
      await refreshWorkspaces();
      return ws;
    } catch (err) {
      console.error('Failed to update workspace:', err);
      throw err;
    }
  };

  const deleteWorkspace = async (id: string) => {
    try {
      await window.api.deleteWorkspace(id);
      if (selectedWorkspaceId === id) selectWorkspace(null);
      await refreshWorkspaces();
    } catch (err) {
      console.error('Failed to delete workspace:', err);
      throw err;
    }
  };

  const reorderWorkspaces = async (ids: string[]) => {
    try {
      await window.api.reorderWorkspaces(ids);
      await refreshWorkspaces();
    } catch (err) {
      console.error('Failed to reorder workspaces:', err);
    }
  };

  const activateWorkspace = async (id: string) => {
    try {
      await window.api.activateWorkspace(id);
    } catch (err) {
      console.error('Failed to activate workspace:', err);
      throw err;
    }
  };

  const deactivateWorkspace = async () => {
    try {
      await window.api.deactivateWorkspace();
      await refreshWorkspaces();
    } catch (err) {
      console.error('Failed to deactivate workspace:', err);
      throw err;
    }
  };

  const selectedWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId) ?? null;

  return {
    workspaces,
    selectedWorkspace,
    selectedWorkspaceId,
    selectWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    reorderWorkspaces,
    activateWorkspace,
    deactivateWorkspace,
  };
}
