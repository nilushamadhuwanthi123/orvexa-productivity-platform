import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { emitToUser } from '../sockets/index.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(100, Number(req.query.limit) || 30);
  const filter = { recipient: req.user._id };
  if (req.query.unread === 'true') filter.read = false;

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate('actor', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    Notification.countDocuments({ recipient: req.user._id, read: false }),
  ]);

  return ok(res, { notifications, unreadCount });
});

export const markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOne({ _id: req.params.id, recipient: req.user._id });
  if (!n) throw ApiError.notFound('Notification not found');

  n.read = true;
  n.readAt = new Date();
  await n.save();

  const unreadCount = await Notification.countDocuments({ recipient: req.user._id, read: false });
  emitToUser(req.user._id, 'notification:count', { unreadCount });

  return ok(res, { notification: n, unreadCount });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, read: false },
    { $set: { read: true, readAt: new Date() } }
  );
  emitToUser(req.user._id, 'notification:count', { unreadCount: 0 });
  return ok(res, { unreadCount: 0 });
});

export const remove = asyncHandler(async (req, res) => {
  await Notification.deleteOne({ _id: req.params.id, recipient: req.user._id });
  const unreadCount = await Notification.countDocuments({ recipient: req.user._id, read: false });
  return ok(res, { message: 'Notification removed', unreadCount });
});
