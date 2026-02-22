import { useState, type ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  isEmpty?: boolean;
  children: ReactNode;
}

export default function CollapsibleSection({
  title,
  defaultOpen = true,
  isEmpty = false,
  children,
}: CollapsibleSectionProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(isEmpty ? false : defaultOpen);

  return (
    <div className="border-t border-zinc-800/60">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-1 py-2.5 text-left hover:bg-zinc-800/30 rounded-sm transition-colors duration-100"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          {title}
          {isEmpty && (
            <span className="ml-2 font-normal normal-case tracking-normal text-zinc-600">
              (not set)
            </span>
          )}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-150 ${
            isOpen ? 'rotate-90' : 'rotate-0'
          }`}
        >
          <path
            fillRule="evenodd"
            d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-96 opacity-100 pb-3' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-1">{children}</div>
      </div>
    </div>
  );
}
