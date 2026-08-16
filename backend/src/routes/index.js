import { Router } from 'express';
import { z } from 'zod';

import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import projectRoutes from './project.routes.js';
import taskRoutes from './task.routes.js';
import commentRoutes from './comment.routes.js';
import notificationRoutes from './notification.routes.js';
import analyticsRoutes from './analytics.routes.js';

import * as misc from '../controllers/misc.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { loadProject, requireProjectManager } from '../middleware/projectAccess.js';
import validate from '../middleware/validate.js';

const router = Router();

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const goalSchema = z.object({
  title: z.string().trim().min(2).max(140),
  metric: z.enum(['task_count', 'manual']).optional(),
  target: z.number().int().min(1).max(10000),
  current: z.number().int().min(0).optional(),
  period: z.enum(['weekly', 'monthly', 'quarterly', 'custom']).optional(),
  project: z.union([objectId, z.null()]).optional(),
  startDate: z.coerce.date().optional(),
  deadline: z.coerce.date().optional(),
  status: z.enum(['active', 'achieved', 'missed', 'archived']).optional(),
});

const milestoneSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().max(2000).optional(),
  dueDate: z.coerce.date().optional(),
  status: z.enum(['upcoming', 'in_progress', 'completed', 'missed']).optional(),
});

router.get('/health', misc.health);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/comments', commentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);

router.get('/search', protect, misc.globalSearch);
router.get('/activity', protect, misc.listActivity);

router
  .route('/goals')
  .get(protect, misc.listGoals)
  .post(protect, validate(goalSchema), misc.createGoal);
router
  .route('/goals/:id')
  .patch(protect, validate(goalSchema.partial()), misc.updateGoal)
  .delete(protect, misc.deleteGoal);

router
  .route('/projects/:projectId/milestones')
  .get(protect, loadProject(), misc.listMilestones)
  .post(protect, loadProject(), requireProjectManager, validate(milestoneSchema), misc.createMilestone);
router
  .route('/projects/:projectId/milestones/:milestoneId')
  .patch(protect, loadProject(), requireProjectManager, validate(milestoneSchema.partial()), misc.updateMilestone)
  .delete(protect, loadProject(), requireProjectManager, misc.deleteMilestone);

router.get('/time', protect, misc.listTimeEntries);
router.get('/time/running', protect, misc.runningTimer);
router.post('/time/start', protect, validate(z.object({ task: objectId })), misc.startTimer);
router.post('/time/stop', protect, misc.stopTimer);
router.post(
  '/time/manual',
  protect,
  validate(z.object({ task: objectId, minutes: z.number().min(1).max(1440), note: z.string().max(300).optional() })),
  misc.addManualTime
);

router.get('/admin/overview', protect, authorize('admin'), misc.adminOverview);

export default router;
