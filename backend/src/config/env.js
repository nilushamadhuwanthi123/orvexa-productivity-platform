import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// backend/.env is the canonical location; fall back to repo root .env
const loaded = [
  dotenv.config({ path: path.resolve(__dirname, '../../.env') }),
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') }),
];

/**
 * dotenv never overwrites a variable that already exists in the environment —
 * correct for deployments, confusing in development. A stale `NODE_ENV` left in
 * a shell silently wins over `.env`, and the app then reports an environment the
 * developer never configured. Warn instead of failing, so the mismatch is
 * visible at startup rather than discovered through wrong behaviour.
 */
const shadowed = [];
for (const result of loaded) {
  for (const [key, fileValue] of Object.entries(result.parsed || {})) {
    if (process.env[key] !== fileValue && !shadowed.some((s) => s.key === key)) {
      shadowed.push({ key, fileValue, actual: process.env[key] });
    }
  }
}

if (shadowed.length) {
  const secret = /SECRET|PASSWORD|URI|TOKEN|KEY/i;
  const show = (k, v) => (secret.test(k) ? '<hidden>' : v);
  // eslint-disable-next-line no-console
  console.warn(
    `\n[orvexa] These variables are set in your shell and override .env:\n` +
      shadowed
        .map((s) => `  ${s.key}: using "${show(s.key, s.actual)}" (.env says "${show(s.key, s.fileValue)}")`)
        .join('\n') +
      `\n  Unset them to use .env — e.g. PowerShell: Remove-Item Env:${shadowed[0].key}\n`
  );
}

const required = ['MONGODB_URI', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);

if (missing.length) {
  // eslint-disable-next-line no-console
  console.error(
    `\n[orvexa] Missing required environment variables: ${missing.join(', ')}\n` +
      `Copy .env.example to backend/.env and fill in the values.\n`
  );
  process.exit(1);
}

export const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 300),
  ai: {
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || '',
    get enabled() {
      return Boolean(process.env.AI_API_KEY);
    },
  },
};

export default env;
