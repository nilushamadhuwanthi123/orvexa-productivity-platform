import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export const signAccessToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

export const signRefreshToken = (user) =>
  jwt.sign({ sub: String(user._id), type: 'refresh' }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  });

export const verifyRefreshToken = (token) => jwt.verify(token, env.jwtRefreshSecret);

export const refreshCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.isProd,
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
