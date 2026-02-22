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
      const oldIndex = workspaces.findIndex((w) => w.id === active.id);
      const newIndex = workspaces.findIndex((w) => w.id === over.id);
      const reordered = arrayMove(workspaces, oldIndex, newIndex);
      reorderWorkspaces(reordered.map((w) => w.id));
    }
  };

  const handleSelect = (id: string): void => {
    selectWorkspace(id);
    setCurrentView('main');
  };

  if (workspaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-zinc-600 text-xs">
        <span>No workspaces yet</span>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={workspaces.map((w) => w.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-0.5">
          {workspaces.map((workspace) => (
            <WorkspaceListItem
              key={workspace.id}
              workspace={workspace}
              isSelected={workspace.id === selectedWorkspaceId}
              isActive={workspace.id === activeWorkspaceId}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
