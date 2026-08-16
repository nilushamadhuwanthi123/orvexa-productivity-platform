import crypto from 'node:crypto';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ok, created } from '../utils/apiResponse.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  refreshCookieOptions,
} from '../services/token.service.js';
import { logActivity } from '../services/activity.service.js';

/**
 * In-memory password reset store. A production deployment would persist these
 * (or email a signed token); keeping it in memory avoids shipping a fake email
 * integration while still making the flow genuinely work end to end.
 */
const resetTokens = new Map(); // token -> { userId, expiresAt }

const issueSession = async (res, user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  user.refreshTokens = [...(user.refreshTokens || []), refreshToken].slice(-5);
  user.lastActiveAt = new Date();
  await user.save({ validateBeforeSave: false });

  res.cookie('refreshToken', refreshToken, refreshCookieOptions);
  return accessToken;
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (await User.exists({ email })) throw ApiError.conflict('An account with that email already exists');

  // The very first account bootstraps the workspace as an admin.
  const isFirstUser = (await User.estimatedDocumentCount()) === 0;
  const user = await User.create({
    name,
    email,
    password,
    role: isFirstUser ? 'admin' : role && role !== 'admin' ? role : 'employee',
  });

  const accessToken = await issueSession(res, user);
  await logActivity({
    actor: user._id,
    action: 'user.registered',
    entityType: 'user',
    entityId: user._id,
    entityLabel: user.name,
  });

  return created(res, { user: user.toSafeJSON(), accessToken });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password +refreshTokens');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Incorrect email or password');
  }

  const accessToken = await issueSession(res, user);
  return ok(res, { user: user.toSafeJSON(), accessToken });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) throw ApiError.unauthorized('Refresh token missing');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Refresh token is invalid or expired');
  }

  const user = await User.findById(payload.sub).select('+refreshTokens');
  if (!user || !user.refreshTokens?.includes(token)) {
    throw ApiError.unauthorized('Refresh token has been revoked');
  }

  // Rotate: drop the used token before issuing the next pair.
  user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
  const accessToken = await issueSession(res, user);

  return ok(res, { user: user.toSafeJSON(), accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    await User.updateOne({ refreshTokens: token }, { $pull: { refreshTokens: token } });
  }
  res.clearCookie('refreshToken', { ...refreshCookieOptions, maxAge: undefined });
  return ok(res, { message: 'Signed out' });
});

export const logoutAll = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $set: { refreshTokens: [] } });
  res.clearCookie('refreshToken', { ...refreshCookieOptions, maxAge: undefined });
  return ok(res, { message: 'Signed out of all sessions' });
});

export const me = asyncHandler(async (req, res) => ok(res, { user: req.user.toSafeJSON() }));

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  // Always answer the same way so the endpoint cannot be used to enumerate accounts.
  if (!user) {
    return ok(res, { message: 'If that account exists, a reset token has been generated.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  resetTokens.set(token, { userId: String(user._id), expiresAt: Date.now() + 15 * 60 * 1000 });

  return ok(res, {
    message: 'If that account exists, a reset token has been generated.',
    // No mail provider is configured, so the token is returned directly in
    // development instead of pretending an email was sent.
    ...(process.env.NODE_ENV === 'production' ? {} : { resetToken: token, expiresInMinutes: 15 }),
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const entry = resetTokens.get(req.body.token);
  if (!entry || entry.expiresAt < Date.now()) {
    resetTokens.delete(req.body.token);
    throw ApiError.badRequest('Reset token is invalid or has expired');
  }

  const user = await User.findById(entry.userId).select('+refreshTokens');
  if (!user) throw ApiError.notFound('Account not found');

  user.password = req.body.password;
  user.refreshTokens = [];
  await user.save();
  resetTokens.delete(req.body.token);

  return ok(res, { message: 'Password updated. Please sign in again.' });
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password +refreshTokens');
  if (!(await user.comparePassword(req.body.currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  user.password = req.body.newPassword;
  user.refreshTokens = [];
  await user.save();

  return ok(res, { message: 'Password changed. Please sign in again.' });
});
