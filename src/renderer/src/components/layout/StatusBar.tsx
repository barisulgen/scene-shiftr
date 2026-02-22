import { useApp } from '../../context/AppContext';

export default function StatusBar(): JSX.Element {
  const { status } = useApp();

  return (
    <footer className="flex items-center h-8 px-4 bg-zinc-900 border-t border-zinc-800 shrink-0">
      <span className="text-[11px] text-zinc-500">{status}</span>
    </footer>
  );
}
