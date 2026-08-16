import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CircleUser,
  BarChart3,
  Users,
  CalendarDays,
  Settings,
  Plus,
  Search,
  Sun,
  Moon,
  Monitor,
  LogOut,
  Keyboard,
  CornerDownLeft,
} from 'lucide-react';
import { useUIStore } from '../store/uiStore.js';
import { useAuthStore } from '../store/authStore.js';
import Modal from './ui/Modal.jsx';
import './CommandCenter.css';

export default function CommandCenter() {
  const navigate = useNavigate();
  const open = useUIStore((s) => s.commandOpen);
  const setOpen = useUIStore((s) => s.setCommandOpen);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);
  const setShortcutsOpen = useUIStore((s) => s.setShortcutsOpen);
  const setTheme = useUIStore((s) => s.setTheme);
  const logout = useAuthStore((s) => s.logout);

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef(null);

  const commands = useMemo(
    () => [
      { id: 'task', group: 'Create', label: 'Create task', icon: Plus, hint: 'C', run: () => window.dispatchEvent(new CustomEvent('orvexa:create-task')) },
      { id: 'project', group: 'Create', label: 'Create project', icon: Plus, run: () => navigate('/projects?new=1') },
      { id: 'search', group: 'Navigate', label: 'Search everything', icon: Search, hint: '/', run: () => setSearchOpen(true) },
      { id: 'dashboard', group: 'Navigate', label: 'Go to dashboard', icon: LayoutDashboard, hint: 'D', run: () => navigate('/dashboard') },
      { id: 'projects', group: 'Navigate', label: 'Go to projects', icon: FolderKanban, hint: 'P', run: () => navigate('/projects') },
      { id: 'mywork', group: 'Navigate', label: 'Go to my work', icon: CircleUser, hint: 'M', run: () => navigate('/my-work') },
      { id: 'calendar', group: 'Navigate', label: 'Go to calendar', icon: CalendarDays, run: () => navigate('/calendar') },
      { id: 'analytics', group: 'Navigate', label: 'Go to analytics', icon: BarChart3, hint: 'A', run: () => navigate('/analytics') },
      { id: 'team', group: 'Navigate', label: 'Go to team', icon: Users, run: () => navigate('/team') },
      { id: 'settings', group: 'Navigate', label: 'Open settings', icon: Settings, run: () => navigate('/settings') },
      { id: 'light', group: 'Appearance', label: 'Switch to light theme', icon: Sun, run: () => setTheme('light') },
      { id: 'dark', group: 'Appearance', label: 'Switch to dark theme', icon: Moon, run: () => setTheme('dark') },
      { id: 'system', group: 'Appearance', label: 'Follow system theme', icon: Monitor, run: () => setTheme('system') },
      { id: 'shortcuts', group: 'Help', label: 'Keyboard shortcuts', icon: Keyboard, hint: '?', run: () => setShortcutsOpen(true) },
      { id: 'logout', group: 'Account', label: 'Sign out', icon: LogOut, run: async () => { await logout(); navigate('/login'); } },
    ],
    [navigate, setSearchOpen, setShortcutsOpen, setTheme, logout]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q)
    );
  }, [commands, query]);

  useEffect(() => {
    setActive(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const execute = (cmd) => {
    setOpen(false);
    setTimeout(() => cmd.run(), 40);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && filtered[active]) {
      e.preventDefault();
      execute(filtered[active]);
    }
  };

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  let lastGroup = null;

  return (
    <Modal open={open} onClose={() => setOpen(false)} size="md">
      <div className="cmd">
        <div className="cmd__input-row">
          <Search size={16} className="muted" />
          <input
            data-autofocus
            className="cmd__input"
            placeholder="Type a command or search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Command"
            aria-activedescendant={`cmd-${active}`}
            role="combobox"
            aria-expanded="true"
            aria-controls="cmd-list"
          />
          <kbd className="cmd__kbd">Esc</kbd>
        </div>

        <div className="cmd__list" ref={listRef} id="cmd-list" role="listbox">
          {filtered.length === 0 && (
            <p className="muted cmd__none">No commands match “{query}”.</p>
          )}
          {filtered.map((cmd, i) => {
            const showGroup = cmd.group !== lastGroup;
            lastGroup = cmd.group;
            const Icon = cmd.icon;
            return (
              <div key={cmd.id}>
                {showGroup && <p className="eyebrow cmd__group">{cmd.group}</p>}
                <button
                  type="button"
                  id={`cmd-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={i === active}
                  className={`cmd__item ${i === active ? 'is-active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => execute(cmd)}
                >
                  <Icon size={15} className="cmd__icon" />
                  <span className="grow">{cmd.label}</span>
                  {cmd.hint && <kbd className="cmd__kbd">{cmd.hint}</kbd>}
                  {i === active && <CornerDownLeft size={13} className="muted" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
