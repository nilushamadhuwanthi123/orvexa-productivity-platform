import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import CommandCenter from '../components/CommandCenter.jsx';
import GlobalSearch from '../components/GlobalSearch.jsx';
import ShortcutsModal from '../components/ShortcutsModal.jsx';
import { Loading } from '../components/ui/States.jsx';
import { useUIStore } from '../store/uiStore.js';
import { useSocketConnection } from '../hooks/useSocket.js';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js';
import './AppLayout.css';

export default function AppLayout() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  useSocketConnection();
  useKeyboardShortcuts();

  return (
    <div className={`app ${collapsed ? 'is-collapsed' : ''}`}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <Sidebar />

      <div className="app__main">
        <Topbar />
        <main id="main" className="app__content" tabIndex={-1}>
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <CommandCenter />
      <GlobalSearch />
      <ShortcutsModal />
    </div>
  );
}
