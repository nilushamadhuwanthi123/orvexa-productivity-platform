import mongoose from 'mongoose';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import TimeEntry from '../models/TimeEntry.js';

const oid = (id) => new mongoose.Types.ObjectId(String(id));

export const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const daysAgo = (n) => startOfDay(new Date(Date.now() - n * 86400000));

/**
 * Derives a project's health from live task data.
 * Score starts at 100 and is reduced by measurable risk signals, so the
 * returned reason always maps to something the user can verify in the UI.
 */
export async function computeProjectHealth(projectId) {
  const now = new Date();
  const soon = new Date(Date.now() + 7 * 86400000);

  const [agg] = await Task.aggregate([
    { $match: { project: oid(projectId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$status', 'done'] },
                  { $ne: ['$dueDate', null] },
                  { $lt: ['$dueDate', now] },
                ],
              },
              1,
              0,
            ],
          },
        },
        dueSoon: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$status', 'done'] },
                  { $ne: ['$dueDate', null] },
                  { $gte: ['$dueDate', now] },
                  { $lte: ['$dueDate', soon] },
                ],
              },
              1,
              0,
            ],
          },
        },
        blocked: { $sum: { $cond: [{ $gt: [{ $size: '$dependsOn' }, 0] }, 1, 0] } },
        completedRecently: {
          $sum: {
            $cond: [{ $gte: ['$completedAt', daysAgo(14)] }, 1, 0],
          },
        },
      },
    },
  ]);

  const s = agg || { total: 0, done: 0, overdue: 0, dueSoon: 0, blocked: 0, completedRecently: 0 };
  const completionRate = s.total ? Math.round((s.done / s.total) * 100) : 0;

  const reasons = [];
  let score = 100;

  if (s.overdue > 0) {
    const penalty = Math.min(45, s.overdue * 8);
    score -= penalty;
    reasons.push(`${s.overdue} task${s.overdue === 1 ? ' is' : 's are'} overdue`);
  }
  if (s.total > 0 && completionRate < 30) {
    score -= 15;
    reasons.push(`only ${completionRate}% of tasks are complete`);
  }
  if (s.dueSoon > 3) {
    score -= 10;
    reasons.push(`${s.dueSoon} tasks are due within 7 days`);
  }
  if (s.total > 5 && s.completedRecently === 0) {
    score -= 20;
    reasons.push('no tasks have been completed in the last 14 days');
  }

  score = Math.max(0, Math.min(100, score));
  const status = score >= 75 ? 'healthy' : score >= 45 ? 'at_risk' : 'critical';

  const reason =
    reasons.length === 0
      ? s.total === 0
        ? 'No tasks yet — add work to start tracking health.'
        : 'On track: no overdue work and steady completion.'
      : `Project is ${status === 'healthy' ? 'healthy' : status === 'at_risk' ? 'at risk' : 'critical'} because ${reasons.join(', and ')}.`;

  return {
    score,
    status,
    reason,
    completionRate,
    totals: {
      total: s.total,
      completed: s.done,
      remaining: s.total - s.done,
      overdue: s.overdue,
      dueSoon: s.dueSoon,
      blocked: s.blocked,
    },
  };
}

/** Percentage change helper that avoids divide-by-zero noise in the UI. */
export const pctChange = (current, previous) => {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
};

/** KPI block for the dashboard header. All numbers come from live aggregates. */
export async function getDashboardKpis(user) {
  const scope =
    user.role === 'admin' ? {} : { $or: [{ owner: user._id }, { 'members.user': user._id }] };
  const projectIds = await Project.find(scope).distinct('_id');

  const now = new Date();
  const weekStart = daysAgo(7);
  const prevWeekStart = daysAgo(14);

  const taskScope = { project: { $in: projectIds } };

  const [
    activeProjects,
    completedThisWeek,
    completedPrevWeek,
    inProgress,
    overdue,
    createdThisWeek,
    createdPrevWeek,
  ] = await Promise.all([
    Project.countDocuments({ ...scope, status: 'active' }),
    Task.countDocuments({ ...taskScope, status: 'done', completedAt: { $gte: weekStart } }),
    Task.countDocuments({
      ...taskScope,
      status: 'done',
      completedAt: { $gte: prevWeekStart, $lt: weekStart },
    }),
    Task.countDocuments({ ...taskScope, status: 'in_progress' }),
    Task.countDocuments({ ...taskScope, status: { $ne: 'done' }, dueDate: { $lt: now } }),
    Task.countDocuments({ ...taskScope, createdAt: { $gte: weekStart } }),
    Task.countDocuments({ ...taskScope, createdAt: { $gte: prevWeekStart, $lt: weekStart } }),
  ]);

  const [totals] = await Task.aggregate([
    { $match: taskScope },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
      },
    },
  ]);
  const productivity = totals?.total ? Math.round((totals.done / totals.total) * 100) : 0;

  return {
    activeProjects,
    completedTasks: completedThisWeek,
    completedTasksChange: pctChange(completedThisWeek, completedPrevWeek),
    inProgressTasks: inProgress,
    overdueTasks: overdue,
    createdTasks: createdThisWeek,
    createdTasksChange: pctChange(createdThisWeek, createdPrevWeek),
    productivity,
    totalTasks: totals?.total || 0,
    projectIds,
  };
}

/** Daily series of created / completed / overdue counts over the last `days`. */
export async function getProductivitySeries(projectIds, userId, days = 30, scopeToUser = false) {
  const from = daysAgo(days - 1);
  const match = { project: { $in: projectIds } };
  if (scopeToUser && userId) match.assignee = oid(userId);

  const [completed, createdAgg] = await Promise.all([
    Task.aggregate([
      { $match: { ...match, completedAt: { $gte: from } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          count: { $sum: 1 },
        },
      },
    ]),
    Task.aggregate([
      { $match: { ...match, createdAt: { $gte: from } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const completedMap = new Map(completed.map((d) => [d._id, d.count]));
  const createdMap = new Map(createdAgg.map((d) => [d._id, d.count]));

  const series = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = daysAgo(i);
    const key = d.toISOString().slice(0, 10);
    series.push({
      date: key,
      completed: completedMap.get(key) || 0,
      created: createdMap.get(key) || 0,
    });
  }
  return series;
}

/** Current and best consecutive-day completion streak for a user. */
export async function getStreak(userId) {
  const rows = await Task.aggregate([
    { $match: { assignee: oid(userId), completedAt: { $ne: null } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const days = new Set(rows.map((r) => r._id));
  const key = (d) => d.toISOString().slice(0, 10);

  let current = 0;
  const cursor = startOfDay();
  // A streak stays alive if today is still in progress but yesterday counted.
  if (!days.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(key(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  let best = 0;
  let run = 0;
  let prev = null;
  for (const day of [...days].sort()) {
    const d = new Date(day);
    run = prev && (d - prev) / 86400000 === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }

  return {
    current,
    best,
    heatmap: rows.map((r) => ({ date: r._id, count: r.count })),
  };
}

/** Total tracked seconds for a user over a window. */
export async function getTrackedTime(userId, days = 7) {
  const [row] = await TimeEntry.aggregate([
    { $match: { user: oid(userId), startedAt: { $gte: daysAgo(days) } } },
    { $group: { _id: null, seconds: { $sum: '$durationSeconds' } } },
  ]);
  return row?.seconds || 0;
}

export default {
  computeProjectHealth,
  getDashboardKpis,
  getProductivitySeries,
  getStreak,
  getTrackedTime,
  pctChange,
  daysAgo,
  startOfDay,
};
