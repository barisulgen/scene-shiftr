interface ForceCloseDialogProps {
  appName: string;
  onForceClose: () => void;
  onSkip: () => void;
}

export default function ForceCloseDialog({
  appName,
  onForceClose,
  onSkip,
}: ForceCloseDialogProps): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="w-full max-w-md mx-4 rounded-lg shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--border)',
        }}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-2">
          <h2
            className="text-base font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            App Not Responding
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-3">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            <span
              className="font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              {appName}
            </span>{' '}
            didn&apos;t close within the timeout. Force close it or skip?
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 pb-5 pt-3">
          <button
            onClick={onSkip}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150"
            style={{
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            Skip
          </button>
          <button
            onClick={onForceClose}
            className="px-4 py-2 rounded-md text-white text-sm font-medium transition-colors duration-150"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Force Close
          </button>
        </div>
      </div>
    </div>
  );
}
