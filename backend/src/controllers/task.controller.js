import Task from '../models/Task.js';
import Project from '../models/Project.js';
import Comment from '../models/Comment.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ok, created, paginated } from '../utils/apiResponse.js';
import { logActivity } from '../services/activity.service.js';
import { notify, notifyMany } from '../services/notification.service.js';
import { emitToProject } from '../sockets/index.js';

const POPULATE = [
  { path: 'assignee', select: 'name email avatarUrl jobTitle' },
  { path: 'reporter', select: 'name email avatarUrl' },
  { path: 'project', select: 'name key color status' },
  { path: 'dependsOn', select: 'title status' },
];

/** Project ids the caller is allowed to read tasks from. */
async function accessibleProjectIds(user) {
  if (user.role === 'admin') return Project.find({}).distinct('_id');
  return Project.find({ $or: [{ owner: user._id }, { 'members.user': user._id }] }).distinct('_id');
}

async function assertProjectAccess(user, projectId) {
  const project = await Project.findById(projectId);
  if (!project) throw ApiError.notFound('Project not found');
  if (user.role !== 'admin' && !project.hasMember(user._id)) {
    throw ApiError.forbidden('You are not a member of this project');
  }
  return project;
}

export const listTasks = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const { project, status, priority, assignee, search, label, due, sort } = req.query;

  const ids = await accessibleProjectIds(req.user);
  const filter = { project: { $in: ids } };

  if (project) {
    await assertProjectAccess(req.user, project);
    filter.project = project;
  }
  if (status) filter.status = { $in: String(status).split(',') };
  if (priority) filter.priority = { $in: String(priority).split(',') };
  if (assignee) filter.assignee = assignee === 'me' ? req.user._id : assignee;
  if (label) filter.labels = label;
  if (search) filter.title = { $regex: String(search).trim(), $options: 'i' };

  if (due === 'overdue') {
    filter.status = { $ne: 'done' };
    filter.dueDate = { $lt: new Date() };
  } else if (due === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    filter.dueDate = { $gte: start, $lt: end };
  } else if (due === 'week') {
    const end = new Date();
    end.setDate(end.getDate() + 7);
    filter.dueDate = { $lte: end };
    filter.status = { $ne: 'done' };
  }

  const sortMap = {
    due: { dueDate: 1 },
    priority: { priority: -1, dueDate: 1 },
    created: { createdAt: -1 },
    order: { order: 1 },
  };

  const [items, total] = await Promise.all([
    Task.find(filter)
      .populate(POPULATE)
      .sort(sortMap[sort] || { updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean({ virtuals: true }),
    Task.countDocuments(filter),
  ]);

  return paginated(res, items, { page, limit, total });
});

export const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate(POPULATE);
  if (!task) throw ApiError.notFound('Task not found');
  await assertProjectAccess(req.user, task.project._id || task.project);
  return ok(res, { task: task.toJSON({ virtuals: true }) });
});

export const createTask = asyncHandler(async (req, res) => {
  const project = await assertProjectAccess(req.user, req.body.project);

  const last = await Task.findOne({ project: project._id, status: req.body.status || 'todo' })
    .sort({ order: -1 })
    .select('order');

  const task = await Task.create({
    ...req.body,
    assignee: req.body.assignee || null,
    reporter: req.user._id,
    order: (last?.order ?? -1) + 1,
  });
  await task.populate(POPULATE);

  await logActivity({
    actor: req.user._id,
    action: 'task.created',
    entityType: 'task',
    entityId: task._id,
    entityLabel: task.title,
    project: project._id,
  });

  if (task.assignee) {
    await notify({
      recipient: task.assignee._id || task.assignee,
      actor: req.user._id,
      type: 'task_assigned',
      title: `${req.user.name} assigned you "${task.title}"`,
      body: project.name,
      link: `/projects/${project._id}/board?task=${task._id}`,
      entity: { kind: 'task', id: task._id },
    });
  }

  emitToProject(project._id, 'task:created', { task });
  return created(res, { task });
});

export const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw ApiError.notFound('Task not found');
  const project = await assertProjectAccess(req.user, task.project);

  const prevAssignee = String(task.assignee || '');
  const prevStatus = task.status;

  Object.assign(task, req.body);
  if (req.body.assignee === '' || req.body.assignee === null) task.assignee = null;
  await task.save();
  await task.populate(POPULATE);

  const newAssignee = String(task.assignee?._id || task.assignee || '');
  if (newAssignee && newAssignee !== prevAssignee) {
    await notify({
      recipient: newAssignee,
      actor: req.user._id,
      type: 'task_assigned',
      title: `${req.user.name} assigned you "${task.title}"`,
      body: project.name,
      link: `/projects/${project._id}/board?task=${task._id}`,
      entity: { kind: 'task', id: task._id },
    });
  }

  if (task.status !== prevStatus) {
    await handleStatusSideEffects(task, prevStatus, req.user, project);
  }

  await logActivity({
    actor: req.user._id,
    action: 'task.updated',
    entityType: 'task',
    entityId: task._id,
    entityLabel: task.title,
    project: project._id,
    meta: { fields: Object.keys(req.body) },
  });

  emitToProject(project._id, 'task:updated', { task });
  return ok(res, { task });
});

/** Kanban move: status + position, persisted so a refresh shows the same board. */
export const moveTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw ApiError.notFound('Task not found');
  const project = await assertProjectAccess(req.user, task.project);

  const { status, order } = req.body;
  const prevStatus = task.status;

  if (order !== undefined) {
    // Make room at the target index within the destination column.
    await Task.updateMany(
      { project: task.project, status, order: { $gte: order }, _id: { $ne: task._id } },
      { $inc: { order: 1 } }
    );
    task.order = order;
  }
  task.status = status;
  await task.save();
  await task.populate(POPULATE);

  if (status !== prevStatus) await handleStatusSideEffects(task, prevStatus, req.user, project);

  await logActivity({
    actor: req.user._id,
    action: 'task.moved',
    entityType: 'task',
    entityId: task._id,
    entityLabel: task.title,
    project: project._id,
    meta: { from: prevStatus, to: status },
  });

  emitToProject(project._id, 'task:moved', { task, from: prevStatus });
  return ok(res, { task });
});

async function handleStatusSideEffects(task, prevStatus, actor, project) {
  if (task.status !== 'done') return;

  // Tell the reporter their task landed.
  if (task.reporter && String(task.reporter._id || task.reporter) !== String(actor._id)) {
    await notify({
      recipient: task.reporter._id || task.reporter,
      actor: actor._id,
      type: 'task_completed',
      title: `"${task.title}" was completed`,
      body: `${actor.name} moved it to Done.`,
      link: `/projects/${project._id}/board?task=${task._id}`,
      entity: { kind: 'task', id: task._id },
    });
  }

  // Unblock anything that depended on this task.
  const dependents = await Task.find({ dependsOn: task._id }).select('title assignee');
  const recipients = dependents.map((d) => d.assignee).filter(Boolean);
  if (recipients.length) {
    await notifyMany(recipients, {
      actor: actor._id,
      type: 'dependency_completed',
      title: `A blocker was cleared: "${task.title}"`,
      body: 'A task you are assigned to is no longer blocked.',
      link: `/projects/${project._id}/board`,
      entity: { kind: 'task', id: task._id },
    });
  }
}

export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw ApiError.notFound('Task not found');
  const project = await assertProjectAccess(req.user, task.project);

  const isOwnerOrReporter =
    String(task.reporter) === String(req.user._id) || String(project.owner) === String(req.user._id);
  if (!isOwnerOrReporter && !['admin', 'manager'].includes(req.user.role)) {
    throw ApiError.forbidden('Only the reporter, project owner, or a manager can delete this task');
  }

  await Promise.all([
    Comment.deleteMany({ task: task._id }),
    Task.updateMany({ dependsOn: task._id }, { $pull: { dependsOn: task._id } }),
    Task.deleteOne({ _id: task._id }),
  ]);

  await logActivity({
    actor: req.user._id,
    action: 'task.deleted',
    entityType: 'task',
    entityId: task._id,
    entityLabel: task.title,
    project: project._id,
  });

  emitToProject(project._id, 'task:deleted', { taskId: task._id, projectId: project._id });
  return ok(res, { message: 'Task deleted', taskId: task._id });
});

/* ----------------------------- checklist ----------------------------- */

export const addChecklistItem = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw ApiError.notFound('Task not found');
  await assertProjectAccess(req.user, task.project);

  task.checklist.push({ text: req.body.text, done: false });
  await task.save();
  await task.populate(POPULATE);

  emitToProject(task.project._id || task.project, 'task:updated', { task });
  return ok(res, { task });
});

export const toggleChecklistItem = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw ApiError.notFound('Task not found');
  await assertProjectAccess(req.user, task.project);

  const item = task.checklist.id(req.params.itemId);
  if (!item) throw ApiError.notFound('Checklist item not found');
  item.done = !item.done;
  await task.save();
  await task.populate(POPULATE);

  emitToProject(task.project._id || task.project, 'task:updated', { task });
  return ok(res, { task });
});

export const deleteChecklistItem = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw ApiError.notFound('Task not found');
  await assertProjectAccess(req.user, task.project);

  task.checklist.pull({ _id: req.params.itemId });
  await task.save();
  await task.populate(POPULATE);

  emitToProject(task.project._id || task.project, 'task:updated', { task });
  return ok(res, { task });
});
