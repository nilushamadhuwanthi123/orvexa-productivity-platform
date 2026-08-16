import Notification from '../models/Notification.js';
import { emitToUser } from '../sockets/index.js';

/**
 * Creates a notification and pushes it to the recipient over Socket.IO.
 * Self-notifications are skipped (you do not get notified about your own action).
 */
export async function notify({
  recipient,
  actor = null,
  type,
  title,
  body = '',
  link = '',
  entity = {},
}) {
  if (actor && String(actor) === String(recipient)) return null;

  const doc = await Notification.create({ recipient, actor, type, title, body, link, entity });
  const populated = await doc.populate('actor', 'name avatarUrl');

  emitToUser(recipient, 'notification:new', populated);

  const unreadCount = await Notification.countDocuments({ recipient, read: false });
  emitToUser(recipient, 'notification:count', { unreadCount });

  return populated;
}

export async function notifyMany(recipients, payload) {
  const unique = [...new Set(recipients.map(String))];
  return Promise.all(unique.map((recipient) => notify({ ...payload, recipient })));
}

export default { notify, notifyMany };
