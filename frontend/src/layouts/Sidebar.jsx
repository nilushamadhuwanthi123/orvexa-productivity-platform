import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CircleUser,
  BarChart3,
  Users,
  CalendarDays,
  Settings,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { useUIStore } from '../store/uiStore.js';
import './Sidebar.css';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, key: 'D' },
  { to: '/projects', label: 'Projects', icon: FolderKanban, key: 'P' },
  { to: '/my-work', label: 'My Work', icon: CircleUser, key: 'M' },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, key: 'A' },
  { to: '/team', label: 'Team', icon: Users },
];

export default function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const mobileOpen = useUIStore((s) => s.mobileNavOpen);
  const setMobileNav = useUIStore((s) => s.setMobileNav);
  const user = useAuthStore((s) => s.user);

  const items = [...NAV];
  if (user?.role === 'admin') items.push({ to: '/admin', label: 'Admin', icon: ShieldCheck });

  return (
    <>
      {mobileOpen && (
        <div className="sidebar__scrim" onClick={() => setMobileNav(false)} aria-hidden="true" />
      )}

      <aside
        className={`sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-open' : ''}`}
        aria-label="Main navigation"
      >
        <div className="sidebar__brand">
          <span className="sidebar__mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="26" height="26">
              <rect width="32" height="32" rx="8" fill="var(--primary-soft-2)" />
              <path
                d="M8 21.5 13.2 10.5h2.3l5.2 11h-2.5l-1.05-2.4h-5.6L10.5 21.5H8Zm4.4-4.3h4l-2-4.6-2 4.6Z"
                fill="var(--primary)"
              />
              <circle cx="23" cy="11" r="2.4" fill="var(--accent)" />
            </svg>
          </span>
          {!collapsed && (
            <span className="sidebar__wordmark">
              Orvexa
              <span className="sidebar__tag">Operations</span>
            </span>
          )}
        </div>

        <nav className="sidebar__nav">
          {items.map(({ to, label, icon: Icon, key }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`}
              onClick={() => setMobileNav(false)}
              title={collapsed ? label : undefined}
            >
              <Icon size={17} strokeWidth={1.9} className="sidebar__icon" />
              {!collapsed && (
                <>
                  <span className="grow">{label}</span>
                  {key && <kbd className="sidebar__kbd">{key}</kbd>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__foot">
          <NavLink
            to="/settings"
            className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`}
            onClick={() => setMobileNav(false)}
            title={collapsed ? 'Settings' : undefined}
          >
            <Settings size={17} strokeWidth={1.9} className="sidebar__icon" />
            {!collapsed && <span>Settings</span>}
          </NavLink>

          <button
            type="button"
            className="sidebar__link sidebar__collapse"
            onClick={toggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen size={17} strokeWidth={1.9} className="sidebar__icon" />
            ) : (
              <>
                <PanelLeftClose size={17} strokeWidth={1.9} className="sidebar__icon" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
