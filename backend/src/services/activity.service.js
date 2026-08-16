import Activity from '../models/Activity.js';

/**
 * Records an audit-trail entry. Never throws into the request path — an audit
 * failure must not fail the user's action.
 */
export async function logActivity({
  actor,
  action,
  entityType,
  entityId,
  entityLabel = '',
  project = null,
  meta = {},
}) {
  try {
    return await Activity.create({
      actor,
      action,
      entityType,
      entityId,
      entityLabel,
      project,
      meta,
    });
  } catch (err) {
    console.error('[orvexa] activity log failed:', err.message);
    return null;
  }
}

export default { logActivity };
