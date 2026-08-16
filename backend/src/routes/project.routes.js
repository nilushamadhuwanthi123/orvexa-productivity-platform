import { Router } from 'express';
import * as ctrl from '../controllers/project.controller.js';
import validate from '../middleware/validate.js';
import { protect, authorize } from '../middleware/auth.js';
import { loadProject, requireProjectManager } from '../middleware/projectAccess.js';
import {
  createProjectSchema,
  updateProjectSchema,
  memberSchema,
} from '../validators/project.validators.js';

const router = Router();
router.use(protect);

/**
 * @openapi
 * /api/projects:
 *   get:
 *     tags: [Projects]
 *     summary: List projects visible to the caller, with live task progress.
 *   post:
 *     tags: [Projects]
 *     summary: Create a project (admin or manager).
 */
router
  .route('/')
  .get(ctrl.listProjects)
  .post(authorize('admin', 'manager'), validate(createProjectSchema), ctrl.createProject);

router
  .route('/:projectId')
  .get(loadProject(), ctrl.getProject)
  .patch(loadProject(), requireProjectManager, validate(updateProjectSchema), ctrl.updateProject)
  .delete(loadProject(), ctrl.deleteProject);

router.post(
  '/:projectId/members',
  loadProject(),
  requireProjectManager,
  validate(memberSchema),
  ctrl.addMember
);
router.delete(
  '/:projectId/members/:userId',
  loadProject(),
  requireProjectManager,
  ctrl.removeMember
);

export default router;
