import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getAccessToken } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import { useNotificationStore } from '../store/notificationStore.js';

let socket = null;

export const getSocket = () => socket;

/**
 * Owns the single Socket.IO connection for the app. Mounted once in AppLayout.
 * Task/project events are re-broadcast as DOM CustomEvents so any screen can
 * subscribe without threading props or a global event store.
 */
export function useSocketConnection() {
  const user = useAuthStore((s) => s.user);
  const receive = useNotificationStore((s) => s.receive);
  const setCount = useNotificationStore((s) => s.setCount);
  const started = useRef(false);

  useEffect(() => {
    if (!user || started.current) return undefined;
    started.current = true;

    socket = io('/', {
      auth: { token: getAccessToken() },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 8,
      reconnectionDelay: 800,
    });

    socket.on('notification:new', receive);
    socket.on('notification:count', ({ unreadCount }) => setCount(unreadCount));

    const relay = (event) => (payload) =>
      window.dispatchEvent(new CustomEvent(`orvexa:${event}`, { detail: payload }));

    const events = [
      'task:created',
      'task:updated',
      'task:moved',
      'task:deleted',
      'project:updated',
      'project:deleted',
      'comment:created',
      'comment:updated',
      'comment:deleted',
      'presence:online',
      'presence:offline',
    ];
    events.forEach((e) => socket.on(e, relay(e)));

    return () => {
      events.forEach((e) => socket?.off(e));
      socket?.disconnect();
      socket = null;
      started.current = false;
    };
  }, [user, receive, setCount]);
}

/** Subscribe a component to one of the relayed realtime events. */
export function useRealtime(event, handler) {
  useEffect(() => {
    const listener = (e) => handler(e.detail);
    window.addEventListener(`orvexa:${event}`, listener);
    return () => window.removeEventListener(`orvexa:${event}`, listener);
  }, [event, handler]);
}

/** Join/leave a project room so this client receives that project's events. */
export function useProjectRoom(projectId) {
  useEffect(() => {
    if (!projectId || !socket) return undefined;
    socket.emit('project:join', projectId);
    return () => socket?.emit('project:leave', projectId);
  }, [projectId]);
}
