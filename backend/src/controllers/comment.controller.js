import Comment from '../models/Comment.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ok, created } from '../utils/apiResponse.js';
import { logActivity } from '../services/activity.service.js';
import { notify, notifyMany } from '../services/notification.service.js';
import { emitToProject, emitToTask } from '../sockets/index.js';

async function loadTaskWithAccess(user, taskId) {
  const task = await Task.findById(taskId).select('title project assignee reporter');
  if (!task) throw ApiError.notFound('Task not found');
  const project = await Project.findById(task.project);
  if (!project) throw ApiError.notFound('Project not found');
  if (user.role !== 'admin' && !project.hasMember(user._id)) {
    throw ApiError.forbidden('You are not a member of this project');
  }
  return { task, project };
}

export const listComments = asyncHandler(async (req, res) => {
  const { task } = await loadTaskWithAccess(req.user, req.params.id);
  const comments = await Comment.find({ task: task._id })
    .populate('author', 'name avatarUrl jobTitle')
    .populate('mentions', 'name')
    .sort({ createdAt: 1 })
    .lean();
  return ok(res, { comments });
});

export const createComment = asyncHandler(async (req, res) => {
  const { task, project } = await loadTaskWithAccess(req.user, req.params.id);

  const comment = await Comment.create({
    body: req.body.body,
    mentions: req.body.mentions || [],
    task: task._id,
    project: project._id,
    author: req.user._id,
  });
  await comment.populate('author', 'name avatarUrl jobTitle');

  await Task.updateOne({ _id: task._id }, { $inc: { commentCount: 1 } });

  const link = `/projects/${project._id}/board?task=${task._id}`;

  if (comment.mentions?.length) {
    await notifyMany(comment.mentions, {
      actor: req.user._id,
      type: 'mention',
      title: `${req.user.name} mentioned you`,
      body: comment.body.slice(0, 140),
      link,
      entity: { kind: 'comment', id: comment._id },
    });
  }

  const watchers = [task.assignee, task.reporter].filter(Boolean);
  await notifyMany(
    watchers.filter((w) => !comment.mentions?.some((m) => String(m) === String(w))),
    {
      actor: req.user._id,
      type: 'comment_added',
      title: `New comment on "${task.title}"`,
      body: comment.body.slice(0, 140),
      link,
      entity: { kind: 'comment', id: comment._id },
    }
  );

  await logActivity({
    actor: req.user._id,
    action: 'comment.created',
    entityType: 'comment',
    entityId: comment._id,
    entityLabel: task.title,
    project: project._id,
  });

  emitToTask(task._id, 'comment:created', { comment });
  emitToProject(project._id, 'comment:created', { comment, taskId: task._id });

  return created(res, { comment });
});

export const updateComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) throw ApiError.notFound('Comment not found');
  if (String(comment.author) !== String(req.user._id)) {
    throw ApiError.forbidden('You can only edit your own comments');
  }

  comment.body = req.body.body;
  comment.editedAt = new Date();
  await comment.save();
  await comment.populate('author', 'name avatarUrl jobTitle');

  emitToTask(comment.task, 'comment:updated', { comment });
  return ok(res, { comment });
});

export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) throw ApiError.notFound('Comment not found');

  const isAuthor = String(comment.author) === String(req.user._id);
  if (!isAuthor && req.user.role !== 'admin') {
    throw ApiError.forbidden('You can only delete your own comments');
  }

  await Comment.deleteOne({ _id: comment._id });
  await Task.updateOne({ _id: comment.task }, { $inc: { commentCount: -1 } });

  emitToTask(comment.task, 'comment:deleted', { commentId: comment._id, taskId: comment.task });
  return ok(res, { message: 'Comment deleted', commentId: comment._id });
});
