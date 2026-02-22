import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Workspace } from '../../../../shared/types';

interface WorkspaceListItemProps {
  workspace: Workspace;
  isSelected: boolean;
  isActive: boolean;
  onSelect: (id: string) => void;
}

export default function WorkspaceListItem({
  workspace,
  isSelected,
  isActive,
  onSelect,
}: WorkspaceListItemProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: workspace.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors duration-100 ${
        isDragging ? 'opacity-50' : ''
      } ${
        isSelected
          ? 'bg-zinc-800 text-zinc-100'
          : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
      }`}
      onClick={() => onSelect(workspace.id)}
    >
      {/* Drag handle */}
      <button
        className="flex items-center justify-center w-4 h-4 shrink-0 cursor-grab opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity duration-100"
        {...attributes}
        {...listeners}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="w-3.5 h-3.5"
        >
          <path d="M2 4.75A.75.75 0 0 1 2.75 4h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 3A.75.75 0 0 1 2.75 7h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 7.75Zm0 3a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" />
        </svg>
      </button>

      {/* Icon */}
      <span className="text-sm leading-none shrink-0">{workspace.icon}</span>

      {/* Name */}
      <span className="text-sm font-medium truncate flex-1">
        {workspace.name}
      </span>

      {/* Active indicator */}
      {isActive && (
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
      )}
    </div>
  );
}
