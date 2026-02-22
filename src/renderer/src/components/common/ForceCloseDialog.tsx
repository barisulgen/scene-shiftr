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
      <div className="w-full max-w-md mx-4 rounded-lg bg-zinc-900 border border-zinc-800 shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-5 pb-2">
          <h2 className="text-base font-semibold text-zinc-100">App Not Responding</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-3">
          <p className="text-sm text-zinc-400">
            <span className="font-medium text-zinc-300">{appName}</span> didn&apos;t close within
            the timeout. Force close it or skip?
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 pb-5 pt-3">
          <button
            onClick={onSkip}
            className="px-4 py-2 rounded-md border border-zinc-700 text-sm text-zinc-300 font-medium hover:border-zinc-600 hover:text-zinc-100 transition-colors duration-150"
          >
            Skip
          </button>
          <button
            onClick={onForceClose}
            className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-colors duration-150"
          >
            Force Close
          </button>
        </div>
      </div>
    </div>
  );
}
