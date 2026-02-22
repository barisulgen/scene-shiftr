import { useState, useEffect, useCallback } from 'react';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/layout/Sidebar';
import MainPanel from './components/layout/MainPanel';
import StatusBar from './components/layout/StatusBar';
import ForceCloseDialog from './components/common/ForceCloseDialog';

function AppShell(): JSX.Element {
  const [forceCloseApp, setForceCloseApp] = useState<string | null>(null);

  // Sound playback listener
  useEffect(() => {
    const cleanup = window.api.onPlaySound((soundPath: string) => {
      const audio = new Audio(`file://${soundPath}`);
      audio.volume = 0.5;
      audio.play().catch(console.error);
    });
    return cleanup;
  }, []);

  // Force-close prompt listener
  useEffect(() => {
    const cleanup = window.api.onForceClosePrompt((appName: string) => {
      setForceCloseApp(appName);
    });
    return cleanup;
  }, []);

  const handleForceClose = useCallback(() => {
    if (forceCloseApp) {
      window.api.respondForceClose(forceCloseApp, 'force');
      setForceCloseApp(null);
    }
  }, [forceCloseApp]);

  const handleSkip = useCallback(() => {
    if (forceCloseApp) {
      window.api.respondForceClose(forceCloseApp, 'skip');
      setForceCloseApp(null);
    }
  }, [forceCloseApp]);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 select-none">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainPanel />
      </div>
      <StatusBar />
      {forceCloseApp && (
        <ForceCloseDialog
          appName={forceCloseApp}
          onForceClose={handleForceClose}
          onSkip={handleSkip}
        />
      )}
    </div>
  );
}

export default function App(): JSX.Element {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
