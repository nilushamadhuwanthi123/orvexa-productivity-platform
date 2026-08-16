import mongoose from 'mongoose';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ok, created, paginated } from '../utils/apiResponse.js';
import { logActivity } from '../services/activity.service.js';
import { notifyMany } from '../services/notification.service.js';
import { emitToProject } from '../sockets/index.js';
import { computeProjectHealth } from '../services/analytics.service.js';

/** Non-admins only ever see projects they own or belong to. */
const visibilityFilter = (user) =>
  user.role === 'admin' ? {} : { $or: [{ owner: user._id }, { 'members.user': user._id }] };

export const listProjects = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const { status, priority, search, tag } = req.query;

  const filter = { ...visibilityFilter(req.user) };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (tag) filter.tags = tag;
  if (search) filter.name = { $regex: String(search).trim(), $options: 'i' };

  const [items, total] = await Promise.all([
    Project.find(filter)
      .populate('owner', 'name email avatarUrl')
      .populate('members.user', 'name email avatarUrl jobTitle')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean({ virtuals: true }),
    Project.countDocuments(filter),
  ]);

  // Attach live progress so list cards never render invented numbers.
  const ids = items.map((p) => p._id);
  const stats = await Task.aggregate([
    { $match: { project: { $in: ids } } },
    {
      $group: {
        _id: '$project',
        total: { $sum: 1 },
        done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
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
  ]);
  const byId = new Map(stats.map((s) => [String(s._id), s]));

  const withProgress = items.map((p) => {
    const s = byId.get(String(p._id)) || { total: 0, done: 0, overdue: 0 };
    return {
      ...p,
      taskStats: {
        total: s.total,
        completed: s.done,
        remaining: s.total - s.done,
        overdue: s.overdue,
        progress: s.total ? Math.round((s.done / s.total) * 100) : 0,
      },
    };
  });

  return paginated(res, withProgress, { page, limit, total });
});

export const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.project._id)
    .populate('owner', 'name email avatarUrl jobTitle')
    .populate('members.user', 'name email avatarUrl jobTitle department availability')
    .lean({ virtuals: true });

  const health = await computeProjectHealth(project._id);
  return ok(res, { project: { ...project, health } });
});

export const createProject = asyncHandler(async (req, res) => {
  const { memberIds = [], ...data } = req.body;

  const members = [
    { user: req.user._id, projectRole: 'owner' },
    ...memberIds
      .filter((id) => String(id) !== String(req.user._id))
      .map((id) => ({ user: id, projectRole: 'contributor' })),
  ];

  const project = await Project.create({ ...data, owner: req.user._id, members });
  await project.populate('members.user', 'name email avatarUrl');

  await logActivity({
    actor: req.user._id,
    action: 'project.created',
    entityType: 'project',
    entityId: project._id,
    entityLabel: project.name,
    project: project._id,
  });

  if (memberIds.length) {
    await notifyMany(memberIds, {
      actor: req.user._id,
      type: 'project_invitation',
      title: `You were added to ${project.name}`,
      body: `${req.user.name} added you to the project.`,
      link: `/projects/${project._id}`,
      entity: { kind: 'project', id: project._id },
    });
  }

  return created(res, { project });
});

export const updateProject = asyncHandler(async (req, res) => {
  const { memberIds, ...data } = req.body;
  const project = req.project;

  Object.assign(project, data);
  if (data.status === 'archived') project.archivedAt = new Date();
  if (data.status && data.status !== 'archived') project.archivedAt = null;

  await project.save();
  await project.populate('members.user', 'name email avatarUrl');

  await logActivity({
    actor: req.user._id,
    action: 'project.updated',
    entityType: 'project',
    entityId: project._id,
    entityLabel: project.name,
    project: project._id,
    meta: { fields: Object.keys(data) },
  });

  emitToProject(project._id, 'project:updated', { project });
  return ok(res, { project });
});

export const deleteProject = asyncHandler(async (req, res) => {
  const project = req.project;
  if (req.user.role !== 'admin' && String(project.owner) !== String(req.user._id)) {
    throw ApiError.forbidden('Only the project owner or an admin can delete a project');
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Task.deleteMany({ project: project._id }, { session });
      await Project.deleteOne({ _id: project._id }, { session });
    });
  } catch {
    // Standalone MongoDB deployments do not support transactions — fall back.
    await Task.deleteMany({ project: project._id });
    await Project.deleteOne({ _id: project._id });
  } finally {
    await session.endSession();
  }

  await logActivity({
    actor: req.user._id,
    action: 'project.deleted',
    entityType: 'project',
    entityId: project._id,
    entityLabel: project.name,
  });

  emitToProject(project._id, 'project:deleted', { projectId: project._id });
  return ok(res, { message: 'Project deleted', projectId: project._id });
});

export const addMember = asyncHandler(async (req, res) => {
  const { userId, projectRole = 'contributor' } = req.body;
  const project = req.project;

  const user = await User.findById(userId).select('name email avatarUrl');
  if (!user) throw ApiError.notFound('User not found');
  if (project.hasMember(userId)) throw ApiError.conflict('User is already a member of this project');

  project.members.push({ user: userId, projectRole });
  await project.save();
  await project.populate('members.user', 'name email avatarUrl jobTitle');

  await notifyMany([userId], {
    actor: req.user._id,
    type: 'project_invitation',
    title: `You were added to ${project.name}`,
    body: `${req.user.name} added you to the project.`,
    link: `/projects/${project._id}`,
    entity: { kind: 'project', id: project._id },
  });

  await logActivity({
    actor: req.user._id,
    action: 'project.member_added',
    entityType: 'project',
    entityId: project._id,
    entityLabel: project.name,
    project: project._id,
    meta: { member: user.name },
  });

  emitToProject(project._id, 'project:updated', { project });
  return ok(res, { project });
});

export const removeMember = asyncHandler(async (req, res) => {
  const project = req.project;
  const { userId } = req.params;

  if (String(project.owner) === String(userId)) {
    throw ApiError.badRequest('The project owner cannot be removed. Transfer ownership first.');
  }

  project.members = project.members.filter((m) => String(m.user) !== String(userId));
  await project.save();

  // Unassign, rather than delete, that person's work.
  await Task.updateMany({ project: project._id, assignee: userId }, { $set: { assignee: null } });

  await logActivity({
    actor: req.user._id,
    action: 'project.member_removed',
    entityType: 'project',
    entityId: project._id,
    entityLabel: project.name,
    project: project._id,
  });

  emitToProject(project._id, 'project:updated', { project });
  return ok(res, { project });
});
