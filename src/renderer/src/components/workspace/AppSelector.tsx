import { useState, useEffect, useRef } from 'react';
import type { AppEntry } from '../../../../shared/types';

interface AppSelectorProps {
  value: AppEntry[];
  onChange: (apps: AppEntry[]) => void;
  label: string;
  variant?: 'open' | 'close';
}

// Shared input style matching WorkspaceForm
const selectorInputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  padding: '12px 16px',
  color: 'var(--text-primary)',
  fontSize: '14px',
};

const inputFocusBorder = 'rgba(232,99,107,0.3)';

// Tag styles per variant
const tagStyles: Record<'open' | 'close', { bg: string; color: string; border: string }> = {
  open: {
    bg: 'rgba(99,130,241,0.12)',
    color: '#8ba4f6',
    border: '1px solid rgba(99,130,241,0.15)',
  },
  close: {
    bg: 'var(--accent-soft)',
    color: 'var(--accent)',
    border: '1px solid rgba(232,93,93,0.15)',
  },
};

export default function AppSelector({ value, onChange, label, variant = 'open' }: AppSelectorProps): JSX.Element {
  const [detectedApps, setDetectedApps] = useState<AppEntry[]>([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    window.api
      .detectApps()
      .then((apps) => {
        if (!cancelled) setDetectedApps(apps);
      })
      .catch(() => {
        /* detection may fail silently */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredApps = detectedApps.filter(
    (app) =>
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.path.toLowerCase().includes(search.toLowerCase())
  );

  const isSelected = (app: AppEntry): boolean => value.some((v) => v.path === app.path);

  const toggleApp = (app: AppEntry): void => {
    if (isSelected(app)) {
      onChange(value.filter((v) => v.path !== app.path));
    } else {
      onChange([...value, app]);
    }
    setSearch('');
    setIsOpen(false);
  };

  const removeApp = (app: AppEntry): void => {
    onChange(value.filter((v) => v.path !== app.path));
  };

  const handleBrowseExe = async (): Promise<void> => {
    try {
      const filePath = await window.api.openFileDialog([
        { name: 'Executables', extensions: ['exe'] },
      ]);
      if (filePath) {
        const segments = filePath.replace(/\\/g, '/').split('/');
        const fileName = segments[segments.length - 1].replace(/\.exe$/i, '');
        const newApp: AppEntry = { name: fileName, path: filePath };
        if (!value.some((v) => v.path === filePath)) {
          onChange([...value, newApp]);
        }
      }
    } catch (err) {
      console.error('Failed to browse for exe:', err);
    }
  };

  const currentTagStyle = tagStyles[variant];

  return (
    <div ref={containerRef} className="space-y-2">
      {label && <label className="block text-sm" style={{ color: '#8888A0' }}>{label}</label>}

      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search detected apps..."
          className="w-full focus:outline-none"
          style={selectorInputStyle}
          onFocusCapture={(e) => { e.currentTarget.style.borderColor = inputFocusBorder; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div
              className="w-4 h-4 rounded-full animate-spin"
              style={{
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: 'rgba(255,255,255,0.08)',
                borderTopColor: '#8888A0',
              }}
            />
          </div>
        )}

        {/* Dropdown list */}
        {isOpen && filteredApps.length > 0 && (
          <div
            className="max-h-48 overflow-y-auto rounded-lg absolute left-0 right-0 z-20 shadow-xl"
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              backgroundColor: 'var(--bg-card)',
              top: '100%',
              marginTop: '4px',
            }}
          >
            {filteredApps.map((app) => (
              <button
                key={app.path}
                type="button"
                onClick={() => toggleApp(app)}
                title={app.path}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm transition-colors duration-100"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span
                  className="flex items-center justify-center w-4 h-4 rounded shrink-0"
                  style={
                    isSelected(app)
                      ? {
                          backgroundColor: 'var(--accent)',
                          border: '1px solid var(--accent-hover)',
                        }
                      : {
                          backgroundColor: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }
                  }
                >
                  {isSelected(app) && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="w-3 h-3 text-white"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </span>
                <span className="truncate" style={{ color: 'var(--text-primary)' }}>
                  {app.name}
                </span>
              </button>
            ))}
          </div>
        )}

        {isOpen && !loading && filteredApps.length === 0 && search && (
          <div
            className="px-3 py-2 rounded-lg text-sm absolute left-0 right-0 z-20 shadow-xl"
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              backgroundColor: 'var(--bg-card)',
              color: '#5a5a6e',
              top: '100%',
              marginTop: '4px',
            }}
          >
            No apps found matching &quot;{search}&quot;
          </div>
        )}
      </div>

      {/* Browse .exe text link */}
      <button
        type="button"
        onClick={handleBrowseExe}
        className="text-xs cursor-pointer transition-colors duration-150 hover:underline"
        style={{ color: '#5a5a6e', background: 'none', border: 'none', padding: 0 }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#8888A0';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#5a5a6e';
        }}
      >
        Can&apos;t find it? Browse for .exe
      </button>

      {/* Selected apps as tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {value.map((app) => (
            <span
              key={app.path}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
              style={{
                backgroundColor: currentTagStyle.bg,
                border: currentTagStyle.border,
                color: currentTagStyle.color,
              }}
            >
              {app.name}
              <button
                type="button"
                onClick={() => removeApp(app)}
                className="ml-0.5 transition-colors cursor-pointer"
                style={{ color: currentTagStyle.color, opacity: 0.7 }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.7';
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="w-3 h-3"
                >
                  <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
