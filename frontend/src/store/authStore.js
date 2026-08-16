import { create } from 'zustand';
import { authApi } from '../api/endpoints.js';
import { setAccessToken, setUnauthorizedHandler } from '../api/client.js';

export const useAuthStore = create((set, get) => ({
  user: null,
  status: 'idle', // idle | loading | authenticated | unauthenticated
  error: null,

  /** Restores a session from the refresh cookie on first load. */
  bootstrap: async () => {
    set({ status: 'loading' });
    try {
      const { user, accessToken } = await authApi.refresh();
      setAccessToken(accessToken);
      set({ user, status: 'authenticated', error: null });
    } catch {
      setAccessToken(null);
      set({ user: null, status: 'unauthenticated' });
    }
  },

  login: async (credentials) => {
    set({ error: null });
    const { user, accessToken } = await authApi.login(credentials);
    setAccessToken(accessToken);
    set({ user, status: 'authenticated' });
    return user;
  },

  register: async (payload) => {
    set({ error: null });
    const { user, accessToken } = await authApi.register(payload);
    setAccessToken(accessToken);
    set({ user, status: 'authenticated' });
    return user;
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      set({ user: null, status: 'unauthenticated' });
    }
  },

  updateUser: (patch) => set({ user: { ...get().user, ...patch } }),

  hasRole: (...roles) => roles.includes(get().user?.role),
}));

// A failed refresh anywhere in the app drops the session cleanly.
setUnauthorizedHandler(() => {
  setAccessToken(null);
  useAuthStore.setState({ user: null, status: 'unauthenticated' });
});
