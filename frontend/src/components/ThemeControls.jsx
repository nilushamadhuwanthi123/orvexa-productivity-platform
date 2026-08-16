import { Sun, Moon, Monitor, Eye } from 'lucide-react';
import { useUIStore } from '../store/uiStore.js';
import './ThemeControls.css';

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

const COMFORT = [
  { value: 'normal', label: 'Normal', hint: 'Full contrast and motion.' },
  { value: 'comfort', label: 'Comfort', hint: 'Warmer surfaces, softer contrast, less motion.' },
  { value: 'focus', label: 'Focus', hint: 'Decoration and motion removed so content leads.' },
];

/** Compact mode renders a single cycling button for the topbar. */
export default function ThemeControls({ compact = false }) {
  const { theme, setTheme, comfort, setComfort } = useUIStore();

  if (compact) {
    const idx = THEMES.findIndex((t) => t.value === theme);
    const next = THEMES[(idx + 1) % THEMES.length];
    const Current = THEMES[idx === -1 ? 2 : idx].icon;

    return (
      <button
        type="button"
        className="btn btn--ghost btn--icon"
        onClick={() => setTheme(next.value)}
        aria-label={`Theme: ${theme}. Switch to ${next.label}.`}
        title={`Theme: ${theme} — click for ${next.label}`}
      >
        <Current size={17} />
      </button>
    );
  }

  return (
    <div className="col gap-5">
      <fieldset className="theme-group">
        <legend className="label">Appearance</legend>
        <div className="segmented" role="radiogroup" aria-label="Theme">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={theme === value}
              className={`segmented__item ${theme === value ? 'is-active' : ''}`}
              onClick={() => setTheme(value)}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="theme-group">
        <legend className="label">
          <Eye size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
          Eye comfort
        </legend>
        <div className="comfort" role="radiogroup" aria-label="Eye comfort mode">
          {COMFORT.map(({ value, label, hint }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={comfort === value}
              className={`comfort__item ${comfort === value ? 'is-active' : ''}`}
              onClick={() => setComfort(value)}
            >
              <span className="comfort__label">{label}</span>
              <span className="comfort__hint muted">{hint}</span>
            </button>
          ))}
        </div>
        <p className="field__hint">
          Comfort mode adjusts surface warmth and contrast at the design-token level —
          it never paints a yellow filter over the interface.
        </p>
      </fieldset>
    </div>
  );
}
