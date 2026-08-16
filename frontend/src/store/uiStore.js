import { create } from 'zustand';

const read = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

const resolveTheme = (pref) =>
  pref === 'system'
    ? window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark'
    : pref;

const applyTheme = (pref) => {
  const resolved = resolveTheme(pref);
  document.documentElement.dataset.theme = resolved;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', resolved === 'light' ? '#F4F3EE' : '#0B1714');
  return resolved;
};

export const useUIStore = create((set, get) => ({
  theme: read('orvexa.theme', 'system'), // light | dark | system
  resolvedTheme: resolveTheme(read('orvexa.theme', 'system')),
  comfort: read('orvexa.comfort', 'normal'), // normal | comfort | focus
  sidebarCollapsed: read('orvexa.sidebar', 'false') === 'true',
  mobileNavOpen: false,
  commandOpen: false,
  searchOpen: false,
  shortcutsOpen: false,
  online: navigator.onLine,
  toasts: [],

  setTheme: (theme) => {
    localStorage.setItem('orvexa.theme', theme);
    set({ theme, resolvedTheme: applyTheme(theme) });
  },

  setComfort: (comfort) => {
    localStorage.setItem('orvexa.comfort', comfort);
    document.documentElement.dataset.comfort = comfort;
    set({ comfort });
  },

  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    localStorage.setItem('orvexa.sidebar', String(next));
    set({ sidebarCollapsed: next });
  },

  setMobileNav: (mobileNavOpen) => set({ mobileNavOpen }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  setOnline: (online) => set({ online }),

  /** Toast with optional undo action. Returns the id so callers can dismiss early. */
  toast: ({ title, description = '', tone = 'info', duration = 4500, action = null }) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, title, description, tone, action }] }));
    if (duration) setTimeout(() => get().dismissToast(id), duration);
    return id;
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Keep the resolved theme in sync when the OS preference changes.
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
  const { theme } = useUIStore.getState();
  if (theme === 'system') useUIStore.setState({ resolvedTheme: applyTheme('system') });
});

window.addEventListener('online', () => useUIStore.getState().setOnline(true));
window.addEventListener('offline', () => useUIStore.getState().setOnline(false));

applyTheme(useUIStore.getState().theme);
document.documentElement.dataset.comfort = useUIStore.getState().comfort;
