import { useApp } from '../context/AppContext';

export function useWorkspaces() {
  const { workspaces, refreshWorkspaces, selectedWorkspaceId, selectWorkspace } = useApp();

  const createWorkspace = async (data: Record<string, unknown>) => {
    const ws = await window.api.createWorkspace(data);
    await refreshWorkspaces();
    selectWorkspace(ws.id);
    return ws;
  };

  const updateWorkspace = async (id: string, data: Record<string, unknown>) => {
    const ws = await window.api.updateWorkspace(id, data);
    await refreshWorkspaces();
    return ws;
  };

  const deleteWorkspace = async (id: string) => {
    await window.api.deleteWorkspace(id);
    if (selectedWorkspaceId === id) selectWorkspace(null);
    await refreshWorkspaces();
  };

  const reorderWorkspaces = async (ids: string[]) => {
    await window.api.reorderWorkspaces(ids);
    await refreshWorkspaces();
  };

  const activateWorkspace = async (id: string) => {
    await window.api.activateWorkspace(id);
  };

  const deactivateWorkspace = async () => {
    await window.api.deactivateWorkspace();
    await refreshWorkspaces();
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
