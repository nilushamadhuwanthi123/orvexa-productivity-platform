import { useUIStore } from '../store/uiStore.js';
import { SHORTCUTS } from '../hooks/useKeyboardShortcuts.js';
import Modal from './ui/Modal.jsx';

export default function ShortcutsModal() {
  const open = useUIStore((s) => s.shortcutsOpen);
  const setOpen = useUIStore((s) => s.setShortcutsOpen);

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Keyboard shortcuts"
      description="Shortcuts are ignored while you are typing in a field."
      size="sm"
    >
      <ul className="col gap-2" style={{ listStyle: 'none' }}>
        {SHORTCUTS.map((s) => (
          <li key={s.label} className="row row--between">
            <span className="muted">{s.label}</span>
            <span className="row gap-1">
              {s.keys.map((k) => (
                <kbd key={k} className="cmd__kbd">
                  {k}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
