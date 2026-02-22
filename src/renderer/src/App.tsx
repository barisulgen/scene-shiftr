import { AppProvider } from './context/AppContext';
import Sidebar from './components/layout/Sidebar';
import MainPanel from './components/layout/MainPanel';
import StatusBar from './components/layout/StatusBar';

export default function App(): JSX.Element {
  return (
    <AppProvider>
      <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 select-none">
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <MainPanel />
        </div>
        <StatusBar />
      </div>
    </AppProvider>
  );
}
