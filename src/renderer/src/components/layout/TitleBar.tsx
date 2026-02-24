import logoSrc from '../../assets/logo.png';

export default function TitleBar(): JSX.Element {
  return (
    <div
      className="flex items-center h-8 shrink-0 relative"
      style={{
        backgroundColor: 'var(--bg-card)',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* Logo on the left */}
      <div className="flex items-center pl-3">
        <img src={logoSrc} alt="" className="w-4 h-4" />
      </div>

      {/* Centered title */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className="text-[10px] font-semibold tracking-[0.2em] uppercase"
          style={{ color: 'var(--text-muted)' }}
        >
          Scene Shiftr
        </span>
      </div>

      {/* Window control buttons — no-drag so they're clickable */}
      <div
        className="flex items-center h-full ml-auto"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => window.api.windowMinimize()}
          className="flex items-center justify-center w-12 h-full transition-colors duration-100"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1" />
          </svg>
        </button>
        <button
          onClick={() => window.api.windowMaximize()}
          className="flex items-center justify-center w-12 h-full transition-colors duration-100"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0.5" y="0.5" width="9" height="9" />
          </svg>
        </button>
        <button
          onClick={() => window.api.windowClose()}
          className="flex items-center justify-center w-12 h-full transition-colors duration-100"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#E85D5D';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
            <line x1="0" y1="0" x2="10" y2="10" />
            <line x1="10" y1="0" x2="0" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  );
}
