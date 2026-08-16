import mongoose from 'mongoose';
import env from './env.js';

let connectionState = 'disconnected';

export const getDbState = () => ({
  state: connectionState,
  readyState: mongoose.connection.readyState,
  name: mongoose.connection.name || null,
});

export async function connectDB() {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    connectionState = 'connected';
    console.log(`[orvexa] MongoDB connected → ${mongoose.connection.name}`);
  });
  mongoose.connection.on('disconnected', () => {
    connectionState = 'disconnected';
    console.warn('[orvexa] MongoDB disconnected');
  });
  mongoose.connection.on('error', (err) => {
    connectionState = 'error';
    console.error('[orvexa] MongoDB error:', err.message);
  });

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 15000,
    maxPoolSize: 20,
  });

  return mongoose.connection;
}

export default connectDB;
