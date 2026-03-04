import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Workspace } from '../../../../shared/types';

interface WorkspaceListItemProps {
  workspace: Workspace;
  isSelected: boolean;
  isActive: boolean;
  onSelect: (id: string) => void;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getSubtitle(workspace: Workspace, isActive: boolean): string {
  if (workspace.isDefault) return isActive ? 'Active' : 'Default';
  if (isActive) return 'Active';
  const appNames = workspace.apps.open.map((a) => a.name).slice(0, 3);
  if (appNames.length === 0) return 'No apps configured';
  return appNames.join(', ');
}

function SortableWorkspaceListItem({
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
  const wsColor = workspace.color || '#E8636B';
  const selectedBg = hexToRgba(wsColor, 0.08);
  const hoverBg = hexToRgba(wsColor, 0.05);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    backgroundColor: isSelected ? selectedBg : 'transparent',
    borderLeft: `3px solid ${wsColor}`,
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
          e.currentTarget.style.backgroundColor = hoverBg;
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
        style={{
          backgroundColor: hexToRgba(wsColor, 0.1),
          border: `1px solid ${hexToRgba(wsColor, 0.2)}`,
        }}
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
          style={{ color: isActive ? wsColor : 'var(--text-muted)' }}
        >
          {subtitle}
        </span>
      </div>

      {/* Active dot */}
      {isActive && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: wsColor }}
        />
      )}
    </div>
  );
}

export default function WorkspaceListItem({
  workspace,
  isSelected,
  isActive,
  onSelect,
}: WorkspaceListItemProps): JSX.Element {
  const wsColor = workspace.color || '#E8636B';
  const selectedBg = hexToRgba(wsColor, 0.08);
  const hoverBg = hexToRgba(wsColor, 0.05);

  // Default workspace is not draggable — render without sortable wrapper
  if (workspace.isDefault) {
    const subtitle = getSubtitle(workspace, isActive);

    const style: React.CSSProperties = {
      backgroundColor: isSelected ? selectedBg : 'transparent',
      borderLeft: `3px solid ${wsColor}`,
    };

    return (
      <div
        style={style}
        className="flex items-center gap-3 px-2 py-1.5 rounded-md cursor-pointer transition-colors duration-100"
        onClick={() => onSelect(workspace.id)}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = hoverBg;
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        {/* Icon in colored square */}
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 text-base"
          style={{
            backgroundColor: hexToRgba(wsColor, 0.1),
            border: `1px solid ${hexToRgba(wsColor, 0.2)}`,
          }}
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
            style={{ color: isActive ? wsColor : 'var(--text-muted)' }}
          >
            {subtitle}
          </span>
        </div>

        {/* Active dot */}
        {isActive && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: wsColor }}
          />
        )}
      </div>
    );
  }

  // Regular workspace — use sortable wrapper
  return (
    <SortableWorkspaceListItem
      workspace={workspace}
      isSelected={isSelected}
      isActive={isActive}
      onSelect={onSelect}
    />
  );
}
