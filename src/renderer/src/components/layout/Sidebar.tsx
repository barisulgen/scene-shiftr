import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import WorkspaceList from '../workspace/WorkspaceList';

export default function Sidebar(): JSX.Element {
  const { setCurrentView, currentView } = useApp();
  const { importWorkspace } = useWorkspaces();
  const [showFeedback, setShowFeedback] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (feedbackRef.current && !feedbackRef.current.contains(e.target as Node)) {
        setShowFeedback(false);
      }
    }
    if (showFeedback) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [showFeedback]);

  return (
    <aside
      className="flex flex-col w-64 shrink-0"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Workspace list area */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="px-2 pb-2">
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}
          >
            Workspaces
          </span>
        </div>
        <WorkspaceList />
      </div>

      {/* Bottom actions */}
      <div
        className="flex flex-col gap-1 px-3 py-2"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <button
          onClick={() => setCurrentView('create')}
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors duration-150"
          style={{ color: 'var(--accent)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-soft)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          New Workspace
        </button>
        <button
          onClick={() => importWorkspace()}
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors duration-150"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h2.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H12.5A1.5 1.5 0 0 1 14 5.5v1.401a2.986 2.986 0 0 0-1.5-.401h-9c-.546 0-1.059.146-1.5.401V3.5Z" />
            <path d="M2 9.5v3A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-3A1.5 1.5 0 0 0 12.5 8h-9A1.5 1.5 0 0 0 2 9.5Zm5.707-.293a1 1 0 0 0-1.414 0l-.043.043a1 1 0 0 0 .707 1.707H7v.543a1 1 0 0 0 2 0v-.543h.043a1 1 0 0 0 .707-1.707l-.043-.043a1 1 0 0 0-1.414 0L8 9.5l-.293-.293Z" />
          </svg>
          Import Workspace
        </button>
        <button
          onClick={() => setCurrentView(currentView === 'settings' ? 'main' : 'settings')}
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors duration-150 relative"
          style={{
            color: currentView === 'settings' ? 'var(--text-primary)' : 'var(--text-secondary)',
            backgroundColor: currentView === 'settings' ? 'var(--bg-card-hover)' : 'transparent',
            borderLeft:
              currentView === 'settings' ? '3px solid var(--accent)' : '3px solid transparent',
          }}
          onMouseEnter={(e) => {
            if (currentView !== 'settings') {
              e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (currentView !== 'settings') {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path
              fillRule="evenodd"
              d="M6.955 1.45A.5.5 0 0 1 7.452 1h1.096a.5.5 0 0 1 .497.45l.17 1.699c.484.12.94.312 1.356.562l1.321-.916a.5.5 0 0 1 .67.033l.774.775a.5.5 0 0 1 .034.67l-.916 1.32c.25.417.443.873.563 1.357l1.699.17a.5.5 0 0 1 .45.497v1.096a.5.5 0 0 1-.45.497l-1.699.17c-.12.484-.312.94-.562 1.356l.916 1.321a.5.5 0 0 1-.034.67l-.774.774a.5.5 0 0 1-.67.033l-1.32-.916c-.417.25-.874.443-1.357.563l-.17 1.699a.5.5 0 0 1-.497.45H7.452a.5.5 0 0 1-.497-.45l-.17-1.699a4.973 4.973 0 0 1-1.356-.562l-1.321.916a.5.5 0 0 1-.67-.034l-.774-.774a.5.5 0 0 1-.034-.67l.916-1.32a4.972 4.972 0 0 1-.563-1.357l-1.699-.17A.5.5 0 0 1 1 8.548V7.452a.5.5 0 0 1 .45-.497l1.699-.17c.12-.484.312-.94.562-1.356l-.916-1.321a.5.5 0 0 1 .034-.67l.774-.774a.5.5 0 0 1 .67-.033l1.32.916c.417-.25.874-.443 1.357-.563l.17-1.699ZM8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
              clipRule="evenodd"
            />
          </svg>
          Settings
        </button>
        <div
          ref={feedbackRef}
          className="relative"
        >
          <button
            onClick={() => setShowFeedback(!showFeedback)}
            className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors duration-150"
            style={{
              color: showFeedback ? 'var(--text-primary)' : 'var(--text-secondary)',
              backgroundColor: showFeedback ? 'var(--bg-card-hover)' : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!showFeedback) {
                e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!showFeedback) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M1 8.74c0 .983.713 1.825 1.69 1.943.764.092 1.534.164 2.31.216v2.351a.75.75 0 0 0 1.28.53l2.51-2.51c.182-.181.427-.29.684-.31a41.72 41.72 0 0 0 2.836-.26c.977-.118 1.69-.96 1.69-1.943V4.26c0-.983-.713-1.825-1.69-1.943A44.73 44.73 0 0 0 8 2a44.73 44.73 0 0 0-5.31.317C1.713 2.435 1 3.277 1 4.26v4.48ZM5.5 6a.75.75 0 0 0 0 1.5h5a.75.75 0 0 0 0-1.5h-5Zm0 2.5a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5H5.5Z"
                clipRule="evenodd"
              />
            </svg>
            Feedback
          </button>
          {showFeedback && (
            <div
              className="absolute bottom-full left-0 mb-2 w-64 rounded-xl p-4 shadow-2xl z-30"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
              }}
            >
              <p
                className="text-xs mb-3"
                style={{ color: 'var(--text-muted)' }}
              >
                Thank you for using Scene Shiftr! &#10084;
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    window.open(
                      'https://github.com/barisulgen/scene-shiftr/issues/new/choose',
                      '_blank',
                    );
                    setShowFeedback(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-150"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="w-3.5 h-3.5 shrink-0"
                  >
                    <path d="M4.22 11.78a.75.75 0 0 1 0-1.06L9.44 5.5H5.75a.75.75 0 0 1 0-1.5h5.5a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0V6.56l-5.22 5.22a.75.75 0 0 1-1.06 0Z" />
                  </svg>
                  Report a bug/request a feature
                </button>
                <button
                  onClick={() => {
                    window.open('https://github.com/barisulgen/scene-shiftr', '_blank');
                    setShowFeedback(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-150"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="w-3.5 h-3.5 shrink-0"
                  >
                    <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
                  </svg>
                  GitHub Repo
                </button>
              </div>
              <div
                className="mt-3 pt-3"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <p
                  className="text-[10px]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Contact:{' '}
                  <span style={{ color: 'var(--text-secondary)' }}>barisulgn@gmail.com</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
