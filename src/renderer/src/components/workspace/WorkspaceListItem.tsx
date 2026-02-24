import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Workspace } from '../../../../shared/types';

interface WorkspaceListItemProps {
  workspace: Workspace;
  isSelected: boolean;
  isActive: boolean;
  onSelect: (id: string) => void;
}

function getSubtitle(workspace: Workspace, isActive: boolean): string {
  if (isActive) return 'Active';
  const appNames = workspace.apps.open.map((a) => a.name).slice(0, 3);
  if (appNames.length === 0) return 'No apps configured';
  return appNames.join(', ');
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

  const subtitle = getSubtitle(workspace, isActive);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    backgroundColor: isSelected ? 'var(--bg-card-hover)' : 'transparent',
    borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-2 py-1.5 rounded-md cursor-pointer transition-colors duration-100 ${
        isDragging ? 'opacity-50' : ''
      }`}
      onClick={() => onSelect(workspace.id)}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
      {...attributes}
      {...listeners}
    >
      {/* Icon in colored square */}
      <div
        className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 text-base"
        style={{ backgroundColor: 'var(--bg-elevated)' }}
      >
        {workspace.icon}
      </div>

      {/* Name + subtitle */}
      <div className="flex flex-col flex-1 min-w-0">
        <span
          className="text-sm font-semibold truncate"
          style={{ color: 'var(--text-primary)' }}
        >
          {workspace.name}
        </span>
        <span
          className="text-xs truncate"
          style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
        >
          {subtitle}
        </span>
      </div>

      {/* Active dot */}
      {isActive && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: 'var(--accent)' }}
        />
      )}
    </div>
  );
}
