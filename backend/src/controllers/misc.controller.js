import mongoose from 'mongoose';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import Comment from '../models/Comment.js';
import Activity from '../models/Activity.js';
import Goal from '../models/Goal.js';
import Milestone from '../models/Milestone.js';
import TimeEntry from '../models/TimeEntry.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ok, created } from '../utils/apiResponse.js';
import { getDbState } from '../config/db.js';
import { getSocketState } from '../sockets/index.js';
import env from '../config/env.js';

/* ------------------------------- health ------------------------------- */

export const health = asyncHandler(async (_req, res) => {
  const db = getDbState();
  let dbPing = false;
  try {
    await mongoose.connection.db.admin().ping();
    dbPing = true;
  } catch {
    dbPing = false;
  }

  const sockets = getSocketState();
  const healthy = dbPing && sockets.initialized;

  return res.status(healthy ? 200 : 503).json({
    success: healthy,
    data: {
      status: healthy ? 'ok' : 'degraded',
      uptimeSeconds: Math.round(process.uptime()),
      environment: env.nodeEnv,
      api: { status: 'ok' },
      database: { status: dbPing ? 'ok' : 'unreachable', name: db.name, readyState: db.readyState },
      realtime: { status: sockets.initialized ? 'ok' : 'down', ...sockets },
      features: { aiAssistant: env.ai.enabled },
      timestamp: new Date().toISOString(),
    },
  });
});

/* ------------------------------- search ------------------------------- */

/** Global search across projects, tasks, users and comments the caller can see. */
export const globalSearch = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return ok(res, { query: q, projects: [], tasks: [], users: [], comments: [] });

  const rx = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const scope =
    req.user.role === 'admin'
      ? {}
      : { $or: [{ owner: req.user._id }, { 'members.user': req.user._id }] };
  const projectIds = await Project.find(scope).distinct('_id');

  const [projects, tasks, users, comments] = await Promise.all([
    Project.find({ _id: { $in: projectIds }, $or: [{ name: rx }, { description: rx }] })
      .select('name status color deadline')
      .limit(6)
      .lean(),
    Task.find({ project: { $in: projectIds }, $or: [{ title: rx }, { description: rx }] })
      .select('title status priority project dueDate')
      .populate('project', 'name color')
      .limit(10)
      .lean(),
    User.find({ $or: [{ name: rx }, { email: rx }, { jobTitle: rx }] })
      .select('name email avatarUrl jobTitle')
      .limit(6)
      .lean(),
    Comment.find({ project: { $in: projectIds }, body: rx })
      .select('body task project createdAt')
      .populate('author', 'name avatarUrl')
      .limit(6)
      .lean(),
  ]);

  return ok(res, { query: q, projects, tasks, users, comments });
});

/* ------------------------------ activity ------------------------------ */

export const listActivity = asyncHandler(async (req, res) => {
  const limit = Math.min(100, Number(req.query.limit) || 30);
  const filter = {};

  if (req.query.project) {
    const project = await Project.findById(req.query.project);
    if (!project) throw ApiError.notFound('Project not found');
    if (req.user.role !== 'admin' && !project.hasMember(req.user._id)) {
      throw ApiError.forbidden('You are not a member of this project');
    }
    filter.project = project._id;
  } else if (req.user.role !== 'admin') {
    filter.project = {
      $in: await Project.find({
        $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
      }).distinct('_id'),
    };
  }

  const activity = await Activity.find(filter)
    .populate('actor', 'name avatarUrl')
    .populate('project', 'name color')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return ok(res, { activity });
});

/* -------------------------------- goals ------------------------------- */

export const listGoals = asyncHandler(async (req, res) => {
  const goals = await Goal.find({ owner: req.user._id })
    .sort({ status: 1, deadline: 1 })
    .lean({ virtuals: true });

  // task_count goals derive `current` from real completed tasks in the window.
  const enriched = await Promise.all(
    goals.map(async (g) => {
      if (g.metric !== 'task_count') return g;
      const match = {
        assignee: req.user._id,
        status: 'done',
        completedAt: { $gte: g.startDate || new Date(0) },
      };
      if (g.deadline) match.completedAt.$lte = g.deadline;
      if (g.project) match.project = g.project;
      const current = await Task.countDocuments(match);
      return { ...g, current, percent: Math.min(100, Math.round((current / g.target) * 100)) };
    })
  );

  return ok(res, { goals: enriched });
});

export const createGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.create({ ...req.body, owner: req.user._id });
  return created(res, { goal: goal.toJSON({ virtuals: true }) });
});

export const updateGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!goal) throw ApiError.notFound('Goal not found');
  return ok(res, { goal: goal.toJSON({ virtuals: true }) });
});

export const deleteGoal = asyncHandler(async (req, res) => {
  const result = await Goal.deleteOne({ _id: req.params.id, owner: req.user._id });
  if (!result.deletedCount) throw ApiError.notFound('Goal not found');
  return ok(res, { message: 'Goal deleted', goalId: req.params.id });
});

/* ----------------------------- milestones ----------------------------- */

export const listMilestones = asyncHandler(async (req, res) => {
  const milestones = await Milestone.find({ project: req.project._id }).sort({ dueDate: 1 }).lean();
  const withProgress = await Promise.all(
    milestones.map(async (m) => {
      const [total, done] = await Promise.all([
        Task.countDocuments({ milestone: m._id }),
        Task.countDocuments({ milestone: m._id, status: 'done' }),
      ]);
      return { ...m, taskTotal: total, taskDone: done, percent: total ? Math.round((done / total) * 100) : 0 };
    })
  );
  return ok(res, { milestones: withProgress });
});

export const createMilestone = asyncHandler(async (req, res) => {
  const milestone = await Milestone.create({ ...req.body, project: req.project._id });
  return created(res, { milestone });
});

export const updateMilestone = asyncHandler(async (req, res) => {
  const milestone = await Milestone.findOneAndUpdate(
    { _id: req.params.milestoneId, project: req.project._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!milestone) throw ApiError.notFound('Milestone not found');
  return ok(res, { milestone });
});

export const deleteMilestone = asyncHandler(async (req, res) => {
  const result = await Milestone.deleteOne({
    _id: req.params.milestoneId,
    project: req.project._id,
  });
  if (!result.deletedCount) throw ApiError.notFound('Milestone not found');
  await Task.updateMany({ milestone: req.params.milestoneId }, { $set: { milestone: null } });
  return ok(res, { message: 'Milestone deleted' });
});

/* --------------------------- time tracking ---------------------------- */

export const startTimer = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.body.task).select('project title');
  if (!task) throw ApiError.notFound('Task not found');

  const running = await TimeEntry.findOne({ user: req.user._id, endedAt: null });
  if (running) throw ApiError.conflict('A timer is already running. Stop it before starting another.');

  const entry = await TimeEntry.create({
    user: req.user._id,
    task: task._id,
    project: task.project,
    startedAt: new Date(),
    source: 'timer',
  });
  return created(res, { entry });
});

export const stopTimer = asyncHandler(async (req, res) => {
  const entry = await TimeEntry.findOne({ user: req.user._id, endedAt: null });
  if (!entry) throw ApiError.notFound('No timer is currently running');

  entry.endedAt = new Date();
  await entry.save();

  await Task.updateOne(
    { _id: entry.task },
    { $inc: { actualHours: Math.round((entry.durationSeconds / 3600) * 100) / 100 } }
  );

  return ok(res, { entry });
});

export const runningTimer = asyncHandler(async (req, res) => {
  const entry = await TimeEntry.findOne({ user: req.user._id, endedAt: null })
    .populate('task', 'title')
    .populate('project', 'name color')
    .lean();
  return ok(res, { entry });
});

export const addManualTime = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.body.task).select('project');
  if (!task) throw ApiError.notFound('Task not found');

  const minutes = Number(req.body.minutes);
  if (!minutes || minutes <= 0) throw ApiError.badRequest('Minutes must be greater than zero');

  const startedAt = new Date(Date.now() - minutes * 60000);
  const entry = await TimeEntry.create({
    user: req.user._id,
    task: task._id,
    project: task.project,
    startedAt,
    endedAt: new Date(),
    durationSeconds: Math.round(minutes * 60),
    note: req.body.note || '',
    source: 'manual',
  });

  await Task.updateOne(
    { _id: task._id },
    { $inc: { actualHours: Math.round((minutes / 60) * 100) / 100 } }
  );

  return created(res, { entry });
});

export const listTimeEntries = asyncHandler(async (req, res) => {
  const entries = await TimeEntry.find({ user: req.user._id })
    .populate('task', 'title')
    .populate('project', 'name color')
    .sort({ startedAt: -1 })
    .limit(50)
    .lean();
  return ok(res, { entries });
});

/* ------------------------------- admin -------------------------------- */

export const adminOverview = asyncHandler(async (_req, res) => {
  const [users, activeUsers, projects, tasks, doneTasks, recentActivity] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ lastActiveAt: { $gte: new Date(Date.now() - 7 * 86400000) } }),
    Project.countDocuments(),
    Task.countDocuments(),
    Task.countDocuments({ status: 'done' }),
    Activity.find()
      .populate('actor', 'name avatarUrl')
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
  ]);

  const byRole = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);

  return ok(res, {
    stats: {
      users,
      activeUsers,
      projects,
      tasks,
      completionRate: tasks ? Math.round((doneTasks / tasks) * 100) : 0,
    },
    byRole,
    recentActivity,
  });
});
