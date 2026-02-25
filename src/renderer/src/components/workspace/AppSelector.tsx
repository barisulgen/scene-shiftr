import { useState, useEffect, useRef } from 'react';
import type { AppEntry } from '../../../../shared/types';

interface AppSelectorProps {
  value: AppEntry[];
  onChange: (apps: AppEntry[]) => void;
  label: string;
}

export default function AppSelector({ value, onChange, label }: AppSelectorProps): JSX.Element {
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

  return (
    <div ref={containerRef} className="space-y-2">
      <label className="block text-sm" style={{ color: 'var(--text-muted)' }}>{label}</label>

      {/* Search input and browse button */}
      <div className="flex gap-2 relative">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search detected apps..."
            className="w-full px-3 py-2 rounded-md text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
              // @ts-expect-error CSS custom property for Tailwind ring color
              '--tw-ring-color': 'var(--accent)',
            }}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div
                className="w-4 h-4 rounded-full animate-spin"
                style={{
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  borderColor: 'var(--border)',
                  borderTopColor: 'var(--text-muted)',
                }}
              />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleBrowseExe}
          className="shrink-0 px-3 py-2 rounded-md text-sm transition-colors duration-150"
          style={{
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          Browse .exe
        </button>

      {/* Dropdown list — absolute positioned to overlay */}
      {isOpen && filteredApps.length > 0 && (
        <div
          className="max-h-48 overflow-y-auto rounded-md absolute left-0 right-0 z-20 shadow-xl"
          style={{
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border)',
            backgroundColor: 'var(--bg-elevated)',
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
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: 'var(--accent-hover)',
                      }
                    : {
                        backgroundColor: 'var(--bg-card)',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: 'var(--border)',
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
          className="px-3 py-2 rounded-md text-sm absolute left-0 right-0 z-20 shadow-xl"
          style={{
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border)',
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-muted)',
            top: '100%',
            marginTop: '4px',
          }}
        >
          No apps found matching &quot;{search}&quot;
        </div>
      )}
      </div>

      {/* Selected apps as chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {value.map((app) => (
            <span
              key={app.path}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              {app.name}
              <button
                type="button"
                onClick={() => removeApp(app)}
                className="ml-0.5 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = 'var(--text-primary)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = 'var(--text-muted)')
                }
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
