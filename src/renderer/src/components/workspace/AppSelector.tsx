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
    const filePath = await window.api.openFileDialog([
      { name: 'Executables', extensions: ['exe'] },
    ]);
    if (filePath) {
      // Extract name from path
      const segments = filePath.replace(/\\/g, '/').split('/');
      const fileName = segments[segments.length - 1].replace(/\.exe$/i, '');
      const newApp: AppEntry = { name: fileName, path: filePath };
      if (!value.some((v) => v.path === filePath)) {
        onChange([...value, newApp]);
      }
    }
  };

  return (
    <div ref={containerRef} className="space-y-2">
      <label className="block text-sm text-zinc-400">{label}</label>

      {/* Search input and browse button */}
      <div className="flex gap-2">
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
            className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleBrowseExe}
          className="shrink-0 px-3 py-2 rounded-md border border-zinc-700 text-sm text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 transition-colors duration-150"
        >
          Browse .exe
        </button>
      </div>

      {/* Dropdown list */}
      {isOpen && filteredApps.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-800">
          {filteredApps.map((app) => (
            <button
              key={app.path}
              type="button"
              onClick={() => toggleApp(app)}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm hover:bg-zinc-700/50 transition-colors duration-100"
            >
              <span
                className={`flex items-center justify-center w-4 h-4 rounded border ${
                  isSelected(app)
                    ? 'bg-indigo-600 border-indigo-500'
                    : 'border-zinc-600 bg-zinc-900'
                }`}
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
              <span className="text-zinc-200 truncate">{app.name}</span>
              <span className="ml-auto text-[11px] text-zinc-500 truncate max-w-[200px]">
                {app.path}
              </span>
            </button>
          ))}
        </div>
      )}

      {isOpen && !loading && filteredApps.length === 0 && search && (
        <div className="px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-sm text-zinc-500">
          No apps found matching &quot;{search}&quot;
        </div>
      )}

      {/* Selected apps as chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {value.map((app) => (
            <span
              key={app.path}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-xs text-zinc-300"
            >
              {app.name}
              <button
                type="button"
                onClick={() => removeApp(app)}
                className="ml-0.5 text-zinc-500 hover:text-zinc-200 transition-colors"
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
