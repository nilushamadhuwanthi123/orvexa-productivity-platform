import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';

let io = null;
/** userId -> Set<socketId> */
const online = new Map();

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  // Handshake auth: the client sends its access token in socket.handshake.auth.token
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = jwt.verify(token, env.jwtSecret);
      const user = await User.findById(payload.sub).select('name email avatarUrl role');
      if (!user) return next(new Error('Account no longer exists'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = String(socket.user._id);
    socket.join(`user:${userId}`);

    if (!online.has(userId)) online.set(userId, new Set());
    online.get(userId).add(socket.id);
    if (online.get(userId).size === 1) {
      io.emit('presence:online', { userId, user: socket.user });
    }

    socket.on('project:join', (projectId) => {
      if (projectId) socket.join(`project:${projectId}`);
    });
    socket.on('project:leave', (projectId) => {
      if (projectId) socket.leave(`project:${projectId}`);
    });

    socket.on('presence:list', (cb) => {
      if (typeof cb === 'function') cb({ online: [...online.keys()] });
    });

    socket.on('typing:start', ({ taskId }) => {
      if (taskId) socket.to(`task:${taskId}`).emit('typing:start', { user: socket.user, taskId });
    });
    socket.on('task:join', (taskId) => taskId && socket.join(`task:${taskId}`));
    socket.on('task:leave', (taskId) => taskId && socket.leave(`task:${taskId}`));

    socket.on('disconnect', () => {
      const set = online.get(userId);
      if (!set) return;
      set.delete(socket.id);
      if (set.size === 0) {
        online.delete(userId);
        io.emit('presence:offline', { userId });
      }
    });
  });

  return io;
}

export const getIO = () => io;

export const getSocketState = () => ({
  initialized: Boolean(io),
  onlineUsers: online.size,
  connections: io ? io.engine.clientsCount : 0,
});

export const emitToUser = (userId, event, payload) => {
  io?.to(`user:${String(userId)}`).emit(event, payload);
};

export const emitToProject = (projectId, event, payload) => {
  io?.to(`project:${String(projectId)}`).emit(event, payload);
};

export const emitToTask = (taskId, event, payload) => {
  io?.to(`task:${String(taskId)}`).emit(event, payload);
};

export const getOnlineUserIds = () => [...online.keys()];
