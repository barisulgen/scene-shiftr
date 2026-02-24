import { useState, useEffect, useCallback } from 'react';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/layout/Sidebar';
import MainPanel from './components/layout/MainPanel';
import StatusBar from './components/layout/StatusBar';
import ForceCloseDialog from './components/common/ForceCloseDialog';
import SplashScreen from './components/SplashScreen';

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
    <div className="flex flex-col h-screen select-none" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
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
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
