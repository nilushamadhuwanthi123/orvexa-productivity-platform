import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/uiStore.js';

const isTyping = (el) =>
  el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

/** Global shortcuts. Registered once by AppLayout. */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { setCommandOpen, setSearchOpen, setShortcutsOpen } = useUIStore();

  useEffect(() => {
    const onKeyDown = (e) => {
      const cmd = e.metaKey || e.ctrlKey;

      if (cmd && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(true);
        return;
      }

      if (e.key === 'Escape') {
        setCommandOpen(false);
        setSearchOpen(false);
        setShortcutsOpen(false);
        return;
      }

      if (isTyping(document.activeElement) || cmd || e.altKey) return;

      switch (e.key) {
        case '/':
          e.preventDefault();
          setSearchOpen(true);
          break;
        case '?':
          e.preventDefault();
          setShortcutsOpen(true);
          break;
        case 'd':
          navigate('/dashboard');
          break;
        case 'p':
          navigate('/projects');
          break;
        case 'm':
          navigate('/my-work');
          break;
        case 'a':
          navigate('/analytics');
          break;
        case 'c':
          window.dispatchEvent(new CustomEvent('orvexa:create-task'));
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, setCommandOpen, setSearchOpen, setShortcutsOpen]);
}

export const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], label: 'Open command centre' },
  { keys: ['/'], label: 'Search everything' },
  { keys: ['C'], label: 'Create task' },
  { keys: ['D'], label: 'Go to dashboard' },
  { keys: ['P'], label: 'Go to projects' },
  { keys: ['M'], label: 'Go to my work' },
  { keys: ['A'], label: 'Go to analytics' },
  { keys: ['?'], label: 'Show this list' },
  { keys: ['Esc'], label: 'Close any overlay' },
];
