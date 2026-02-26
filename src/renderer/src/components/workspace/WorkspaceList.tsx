import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useApp } from '../../context/AppContext';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import WorkspaceListItem from './WorkspaceListItem';

export default function WorkspaceList(): JSX.Element {
  const { selectedWorkspaceId, activeWorkspaceId, setCurrentView } = useApp();
  const { workspaces, selectWorkspace, reorderWorkspaces } = useWorkspaces();

  // Separate default workspace from the rest
  const defaultWorkspace = workspaces.find((w) => w.isDefault) ?? null;
  const sortableWorkspaces = workspaces.filter((w) => !w.isDefault);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortableWorkspaces.findIndex((w) => w.id === active.id);
      const newIndex = sortableWorkspaces.findIndex((w) => w.id === over.id);
      const reordered = arrayMove(sortableWorkspaces, oldIndex, newIndex);
      reorderWorkspaces(reordered.map((w) => w.id));
    }
  };

  const handleSelect = (id: string): void => {
    selectWorkspace(id);
    setCurrentView('main');
  };

  if (workspaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>No workspaces yet</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {/* Default workspace — always first, not draggable */}
      {defaultWorkspace && (
        <WorkspaceListItem
          key={defaultWorkspace.id}
          workspace={defaultWorkspace}
          isSelected={defaultWorkspace.id === selectedWorkspaceId}
          isActive={defaultWorkspace.id === activeWorkspaceId}
          onSelect={handleSelect}
        />
      )}

      {/* Sortable workspaces */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortableWorkspaces.map((w) => w.id)}
          strategy={verticalListSortingStrategy}
        >
          {sortableWorkspaces.map((workspace) => (
            <WorkspaceListItem
              key={workspace.id}
              workspace={workspace}
              isSelected={workspace.id === selectedWorkspaceId}
              isActive={workspace.id === activeWorkspaceId}
              onSelect={handleSelect}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
