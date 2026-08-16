import Task from '../models/Task.js';
import Project from '../models/Project.js';
import Goal from '../models/Goal.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import {
  getDashboardKpis,
  getProductivitySeries,
  getStreak,
  getTrackedTime,
  computeProjectHealth,
  daysAgo,
  startOfDay,
  pctChange,
} from '../services/analytics.service.js';

/** Everything the dashboard needs, in one round trip. */
export const getDashboard = asyncHandler(async (req, res) => {
  const kpis = await getDashboardKpis(req.user);
  const { projectIds } = kpis;
  delete kpis.projectIds;

  const now = new Date();
  const weekStart = daysAgo(7);
  const prevWeekStart = daysAgo(14);

  const [
    myCompletedThisWeek,
    myCompletedPrevWeek,
    myOpen,
    myOverdue,
    myOnTime,
    myDoneWithDue,
    streak,
    trackedSeconds,
    goals,
    series,
  ] = await Promise.all([
    Task.countDocuments({ assignee: req.user._id, status: 'done', completedAt: { $gte: weekStart } }),
    Task.countDocuments({
      assignee: req.user._id,
      status: 'done',
      completedAt: { $gte: prevWeekStart, $lt: weekStart },
    }),
    Task.countDocuments({ assignee: req.user._id, status: { $ne: 'done' } }),
    Task.countDocuments({
      assignee: req.user._id,
      status: { $ne: 'done' },
      dueDate: { $lt: now },
    }),
    Task.countDocuments({
      assignee: req.user._id,
      status: 'done',
      dueDate: { $ne: null },
      $expr: { $lte: ['$completedAt', '$dueDate'] },
    }),
    Task.countDocuments({ assignee: req.user._id, status: 'done', dueDate: { $ne: null } }),
    getStreak(req.user._id),
    getTrackedTime(req.user._id, 7),
    Goal.find({ owner: req.user._id, status: 'active' }).sort({ deadline: 1 }).limit(5).lean({ virtuals: true }),
    getProductivitySeries(projectIds, req.user._id, 30),
  ]);

  const weeklyGoal = req.user.weeklyTaskGoal || 20;

  const progress = {
    weeklyGoal,
    completed: myCompletedThisWeek,
    remaining: Math.max(0, weeklyGoal - myCompletedThisWeek),
    percent: weeklyGoal ? Math.min(100, Math.round((myCompletedThisWeek / weeklyGoal) * 100)) : 0,
    change: pctChange(myCompletedThisWeek, myCompletedPrevWeek),
    openTasks: myOpen,
    overdueTasks: myOverdue,
    onTimeRate: myDoneWithDue ? Math.round((myOnTime / myDoneWithDue) * 100) : null,
    trackedHours: Math.round((trackedSeconds / 3600) * 10) / 10,
    streak,
  };

  // Project cards with real progress + derived health.
  const projects = await Project.find({
    _id: { $in: projectIds },
    status: { $in: ['active', 'planning', 'on_hold'] },
  })
    .populate('members.user', 'name avatarUrl')
    .sort({ deadline: 1, updatedAt: -1 })
    .limit(6)
    .lean({ virtuals: true });

  const projectCards = await Promise.all(
    projects.map(async (p) => ({ ...p, health: await computeProjectHealth(p._id) }))
  );

  // Upcoming deadlines, bucketed.
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 30);
  const upcoming = await Task.find({
    project: { $in: projectIds },
    status: { $ne: 'done' },
    dueDate: { $ne: null, $lte: horizon },
  })
    .populate('project', 'name color')
    .populate('assignee', 'name avatarUrl')
    .sort({ dueDate: 1 })
    .limit(20)
    .lean({ virtuals: true });

  const todayStart = startOfDay();
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const deadlines = { overdue: [], today: [], tomorrow: [], thisWeek: [], later: [] };
  for (const t of upcoming) {
    const d = new Date(t.dueDate);
    if (d < todayStart) deadlines.overdue.push(t);
    else if (d < tomorrowStart) deadlines.today.push(t);
    else if (d < new Date(tomorrowStart.getTime() + 86400000)) deadlines.tomorrow.push(t);
    else if (d < weekEnd) deadlines.thisWeek.push(t);
    else deadlines.later.push(t);
  }

  const insights = buildInsights({ progress, kpis, projectCards, series });

  return ok(res, { kpis, progress, projects: projectCards, deadlines, goals, series, insights });
});

/**
 * Insights are derived strictly from the aggregates above. If a signal is not
 * present in the data, no insight is emitted — nothing here is invented.
 */
function buildInsights({ progress, kpis, projectCards, series }) {
  const out = [];

  if (progress.change !== 0 && progress.completed > 0) {
    out.push({
      tone: progress.change > 0 ? 'positive' : 'warning',
      text: `Your completed tasks are ${progress.change > 0 ? 'up' : 'down'} ${Math.abs(progress.change)}% compared with last week.`,
    });
  }

  if (progress.remaining > 0 && progress.completed > 0) {
    out.push({
      tone: 'info',
      text: `You are ${progress.remaining} task${progress.remaining === 1 ? '' : 's'} away from your weekly goal of ${progress.weeklyGoal}.`,
    });
  }

  if (kpis.overdueTasks > 0) {
    out.push({
      tone: 'critical',
      text: `${kpis.overdueTasks} task${kpis.overdueTasks === 1 ? ' is' : 's are'} past their due date across your projects.`,
    });
  }

  const atRisk = projectCards.filter((p) => p.health.status !== 'healthy');
  if (atRisk.length) {
    out.push({
      tone: 'warning',
      text: `${atRisk.length} project${atRisk.length === 1 ? '' : 's'} need attention: ${atRisk
        .slice(0, 3)
        .map((p) => p.name)
        .join(', ')}.`,
    });
  }

  // Most productive weekday, only when there is enough signal to be meaningful.
  const byWeekday = new Array(7).fill(0);
  let totalCompleted = 0;
  for (const point of series) {
    const day = new Date(point.date).getDay();
    byWeekday[day] += point.completed;
    totalCompleted += point.completed;
  }
  if (totalCompleted >= 10) {
    const bestIdx = byWeekday.indexOf(Math.max(...byWeekday));
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    out.push({ tone: 'info', text: `${names[bestIdx]} is your most productive day this month.` });
  }

  if (progress.streak.current >= 2) {
    out.push({
      tone: 'positive',
      text: `You are on a ${progress.streak.current}-day completion streak. Your best is ${progress.streak.best}.`,
    });
  }

  return out;
}

/** Standalone analytics page: series + distributions over a selectable window. */
export const getProductivity = asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(7, Number(req.query.days) || 30));
  const scope =
    req.user.role === 'admin'
      ? {}
      : { $or: [{ owner: req.user._id }, { 'members.user': req.user._id }] };
  const projectIds = await Project.find(scope).distinct('_id');
  const mine = req.query.scope === 'me';

  const match = { project: { $in: projectIds } };
  if (mine) match.assignee = req.user._id;

  const [series, byStatus, byPriority, byProject] = await Promise.all([
    getProductivitySeries(projectIds, req.user._id, days, mine),
    Task.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Task.aggregate([{ $match: match }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
    Task.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$project',
          total: { $sum: 1 },
          done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from: 'projects',
          localField: '_id',
          foreignField: '_id',
          as: 'project',
          pipeline: [{ $project: { name: 1, color: 1 } }],
        },
      },
      { $unwind: '$project' },
      { $sort: { total: -1 } },
      { $limit: 8 },
    ]),
  ]);

  const completionRate = (() => {
    const total = byStatus.reduce((a, s) => a + s.count, 0);
    const done = byStatus.find((s) => s._id === 'done')?.count || 0;
    return total ? Math.round((done / total) * 100) : 0;
  })();

  return ok(res, {
    days,
    series,
    byStatus,
    byPriority,
    byProject: byProject.map((p) => ({
      name: p.project.name,
      color: p.project.color,
      total: p.total,
      done: p.done,
      percent: p.total ? Math.round((p.done / p.total) * 100) : 0,
    })),
    completionRate,
  });
});

export const getProjectAnalytics = asyncHandler(async (req, res) => {
  const health = await computeProjectHealth(req.project._id);
  const [byStatus, byAssignee, series] = await Promise.all([
    Task.aggregate([
      { $match: { project: req.project._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      { $match: { project: req.project._id, assignee: { $ne: null } } },
      {
        $group: {
          _id: '$assignee',
          total: { $sum: 1 },
          done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { name: 1, avatarUrl: 1 } }],
        },
      },
      { $unwind: '$user' },
    ]),
    getProductivitySeries([req.project._id], null, 30),
  ]);

  return ok(res, { health, byStatus, byAssignee, series });
});
