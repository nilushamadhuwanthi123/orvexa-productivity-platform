import { Router } from 'express';
import * as ctrl from '../controllers/task.controller.js';
import * as commentCtrl from '../controllers/comment.controller.js';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import {
  createTaskSchema,
  updateTaskSchema,
  moveTaskSchema,
  commentSchema,
} from '../validators/task.validators.js';
import { z } from 'zod';

const router = Router();
router.use(protect);

/**
 * @openapi
 * /api/tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: List tasks with filtering (project, status, priority, assignee, due, search).
 *   post:
 *     tags: [Tasks]
 *     summary: Create a task in a project the caller belongs to.
 */
router.route('/').get(ctrl.listTasks).post(validate(createTaskSchema), ctrl.createTask);

router
  .route('/:id')
  .get(ctrl.getTask)
  .patch(validate(updateTaskSchema), ctrl.updateTask)
  .delete(ctrl.deleteTask);

router.patch('/:id/move', validate(moveTaskSchema), ctrl.moveTask);

router.post(
  '/:id/checklist',
  validate(z.object({ text: z.string().trim().min(1).max(200) })),
  ctrl.addChecklistItem
);
router.patch('/:id/checklist/:itemId', ctrl.toggleChecklistItem);
router.delete('/:id/checklist/:itemId', ctrl.deleteChecklistItem);

router
  .route('/:id/comments')
  .get(commentCtrl.listComments)
  .post(validate(commentSchema), commentCtrl.createComment);

export default router;
