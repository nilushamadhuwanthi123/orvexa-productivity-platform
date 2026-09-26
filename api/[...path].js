/**
 * Vercel serverless entry for the Orvexa API.
 *
 * The app normally runs as a long-lived process (backend/src/server.js): one
 * MongoDB pool, Socket.IO attached to the HTTP server, then listen. None of
 * that survives on serverless, where each request may land in a fresh instance
 * that is frozen again immediately after. This file keeps the Express app
 * exactly as it is and changes only the two things that must change.
 *
 * It is a catch-all route ([...path]) rather than api/index.js on purpose: a
 * catch-all leaves the original URL on req.url, so Express still sees
 * /api/projects/123 and its routers match exactly as they do locally.
 * Rewriting everything to a single /api function would hand Express the
 * destination path instead, and every route would 404.
 */
import mongoose from 'mongoose';
import app from '../backend/src/app.js';
import env from '../backend/src/config/env.js';
import configureDns from '../backend/src/config/dns.js';

/**
 * One connection per warm instance, shared by every request it serves.
 *
 * Connecting per request would open a new pool each time and exhaust the Atlas
 * connection limit under any real traffic. The promise is cached rather than
 * the connection, so concurrent cold requests all await the same handshake
 * instead of racing to start their own.
 */
let connecting = null;

function connectOnce() {
  if (!connecting) {
    connecting = (async () => {
      configureDns();
      mongoose.set('strictQuery', true);
      await mongoose.connect(env.mongoUri, {
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        // Deliberately smaller than the long-running server's 20: here every
        // warm instance holds its own pool, and there can be many of them.
        maxPoolSize: 5,
      });
    })().catch((err) => {
      // Let the next request retry instead of caching a failed handshake for
      // the lifetime of the instance.
      connecting = null;
      throw err;
    });
  }
  return connecting;
}

export default async function handler(req, res) {
  try {
    await connectOnce();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[orvexa] Mongo connection failed:', err.message);
    res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'The database is not reachable right now. Please try again in a moment.',
      },
    });
    return;
  }

  return app(req, res);
}
