import User from '../models/User.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ok, paginated } from '../utils/apiResponse.js';
import { logActivity } from '../services/activity.service.js';
import { getOnlineUserIds } from '../sockets/index.js';

export const listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const { search, role, department } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (department) filter.department = department;
  if (search) {
    filter.$or = [
      { name: { $regex: String(search).trim(), $options: 'i' } },
      { email: { $regex: String(search).trim(), $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    User.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  const online = new Set(getOnlineUserIds());
  return paginated(
    res,
    items.map((u) => ({ ...u, isOnline: online.has(String(u._id)) })),
    { page, limit, total }
  );
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) throw ApiError.notFound('User not found');
  return ok(res, { user });
});

export const updateMe = asyncHandler(async (req, res) => {
  const allowed = [
    'name',
    'avatarUrl',
    'jobTitle',
    'department',
    'bio',
    'skills',
    'location',
    'availability',
    'weeklyTaskGoal',
    'onboardingCompleted',
  ];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  );

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  return ok(res, { user: user.toSafeJSON() });
});

/** Admin-only role change, guarded so the last admin cannot lock everyone out. */
export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'manager', 'employee'].includes(role)) throw ApiError.badRequest('Invalid role');

  const target = await User.findById(req.params.id);
  if (!target) throw ApiError.notFound('User not found');

  if (target.role === 'admin' && role !== 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) throw ApiError.badRequest('The workspace must keep at least one admin');
  }

  target.role = role;
  await target.save({ validateBeforeSave: false });

  await logActivity({
    actor: req.user._id,
    action: 'user.role_changed',
    entityType: 'user',
    entityId: target._id,
    entityLabel: target.name,
    meta: { role },
  });

  return ok(res, { user: target.toSafeJSON() });
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    throw ApiError.badRequest('You cannot delete your own account from the admin panel');
  }
  const target = await User.findById(req.params.id);
  if (!target) throw ApiError.notFound('User not found');

  await Task.updateMany({ assignee: target._id }, { $set: { assignee: null } });
  await Project.updateMany({}, { $pull: { members: { user: target._id } } });
  await User.deleteOne({ _id: target._id });

  await logActivity({
    actor: req.user._id,
    action: 'user.deleted',
    entityType: 'user',
    entityId: target._id,
    entityLabel: target.name,
  });

  return ok(res, { message: 'User removed', userId: target._id });
});

/** Team workload view — real counts per member, no ranking or scoring of people. */
export const getTeamWorkload = asyncHandler(async (req, res) => {
  const projectFilter =
    req.user.role === 'admin'
      ? {}
      : { $or: [{ owner: req.user._id }, { 'members.user': req.user._id }] };
  const projectIds = await Project.find(projectFilter).distinct('_id');

  const rows = await Task.aggregate([
    { $match: { project: { $in: projectIds }, assignee: { $ne: null } } },
    {
      $group: {
        _id: '$assignee',
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$status', 'done'] },
                  { $ne: ['$dueDate', null] },
                  { $lt: ['$dueDate', new Date()] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
        pipeline: [{ $project: { name: 1, email: 1, avatarUrl: 1, jobTitle: 1, department: 1 } }],
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        _id: 0,
        user: 1,
        total: 1,
        completed: 1,
        inProgress: 1,
        overdue: 1,
        open: { $subtract: ['$total', '$completed'] },
        completionRate: {
          $cond: [{ $eq: ['$total', 0] }, 0, { $round: [{ $multiply: [{ $divide: ['$completed', '$total'] }, 100] }, 0] }],
        },
      },
    },
    { $sort: { 'user.name': 1 } },
  ]);

  const online = new Set(getOnlineUserIds());
  return ok(res, {
    workload: rows.map((r) => ({ ...r, isOnline: online.has(String(r.user._id)) })),
  });
});
