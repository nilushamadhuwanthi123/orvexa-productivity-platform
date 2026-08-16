import http from 'node:http';
import app from './app.js';
import env from './config/env.js';
import connectDB from './config/db.js';
import { initSocket } from './sockets/index.js';

async function start() {
  await connectDB();

  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.port, () => {
    console.log(`\n  Orvexa API  →  http://localhost:${env.port}`);
    console.log(`  API docs    →  http://localhost:${env.port}/api-docs`);
    console.log(`  Health      →  http://localhost:${env.port}/api/health`);
    console.log(`  Client      →  ${env.clientUrl}\n`);
  });

  const shutdown = (signal) => () => {
    console.log(`\n[orvexa] ${signal} received, shutting down…`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', shutdown('SIGINT'));
  process.on('SIGTERM', shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('[orvexa] Failed to start server:', err);
  process.exit(1);
});
