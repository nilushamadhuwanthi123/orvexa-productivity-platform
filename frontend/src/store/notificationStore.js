import { create } from 'zustand';
import { notificationApi } from '../api/endpoints.js';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const { notifications, unreadCount } = await notificationApi.list({ limit: 40 });
      set({ notifications, unreadCount, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  /** Called by the socket layer when a notification arrives live. */
  receive: (notification) =>
    set((s) => ({
      notifications: [notification, ...s.notifications].slice(0, 40),
      unreadCount: s.unreadCount + 1,
    })),

  setCount: (unreadCount) => set({ unreadCount }),

  markRead: async (id) => {
    const prev = get().notifications;
    set({
      notifications: prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
      unreadCount: Math.max(0, get().unreadCount - (prev.find((n) => n._id === id)?.read ? 0 : 1)),
    });
    try {
      await notificationApi.markRead(id);
    } catch {
      set({ notifications: prev });
    }
  },

  markAllRead: async () => {
    const prev = get().notifications;
    set({ notifications: prev.map((n) => ({ ...n, read: true })), unreadCount: 0 });
    try {
      await notificationApi.markAllRead();
    } catch {
      set({ notifications: prev });
    }
  },

  reset: () => set({ notifications: [], unreadCount: 0 }),
}));
