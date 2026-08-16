import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, Command, LogOut, User, Settings, WifiOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { useUIStore } from '../store/uiStore.js';
import { useNotificationStore } from '../store/notificationStore.js';
import Avatar from '../components/ui/Avatar.jsx';
import ThemeControls from '../components/ThemeControls.jsx';
import NotificationPanel from '../components/NotificationPanel.jsx';
import { fmtDate } from '../utils/format.js';
import './Topbar.css';

export default function Topbar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { setMobileNav, setSearchOpen, setCommandOpen, online } = useUIStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const menuRef = useRef(null);
  const bellRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <button
        type="button"
        className="btn btn--ghost btn--icon topbar__burger"
        onClick={() => setMobileNav(true)}
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      <button type="button" className="topbar__search" onClick={() => setSearchOpen(true)}>
        <Search size={15} />
        <span className="topbar__search-label">Search projects, tasks, people…</span>
        <kbd className="topbar__kbd">/</kbd>
      </button>

      <div className="topbar__spacer" />

      {!online && (
        <span className="topbar__offline" role="status">
          <WifiOff size={13} /> Offline
        </span>
      )}

      <time className="topbar__date" dateTime={new Date().toISOString()}>
        {fmtDate(new Date(), 'EEE, d MMM')}
      </time>

      <button
        type="button"
        className="btn btn--ghost btn--icon"
        onClick={() => setCommandOpen(true)}
        aria-label="Open command centre"
        title="Command centre (Ctrl+K)"
      >
        <Command size={17} />
      </button>

      <ThemeControls compact />

      <div className="topbar__pop" ref={bellRef}>
        <button
          type="button"
          className="btn btn--ghost btn--icon topbar__bell"
          onClick={() => setBellOpen((v) => !v)}
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          aria-expanded={bellOpen}
        >
          <Bell size={17} />
          {unreadCount > 0 && (
            <span className="topbar__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>
        {bellOpen && <NotificationPanel onClose={() => setBellOpen(false)} />}
      </div>

      <div className="topbar__pop" ref={menuRef}>
        <button
          type="button"
          className="topbar__profile"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <Avatar user={user} size="sm" />
          <span className="topbar__profile-name">{user?.name?.split(' ')[0]}</span>
        </button>

        {menuOpen && (
          <div className="menu" role="menu">
            <div className="menu__head">
              <p className="menu__name">{user?.name}</p>
              <p className="muted menu__email truncate">{user?.email}</p>
              <span className="badge menu__role">{user?.role}</span>
            </div>
            <Link to="/settings" className="menu__item" role="menuitem" onClick={() => setMenuOpen(false)}>
              <User size={15} /> Profile
            </Link>
            <Link to="/settings" className="menu__item" role="menuitem" onClick={() => setMenuOpen(false)}>
              <Settings size={15} /> Settings
            </Link>
            <hr className="divider" />
            <button type="button" className="menu__item menu__item--danger" role="menuitem" onClick={handleLogout}>
              <LogOut size={15} /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
