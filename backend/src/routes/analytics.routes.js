import { Router } from 'express';
import * as ctrl from '../controllers/analytics.controller.js';
import { protect } from '../middleware/auth.js';
import { loadProject } from '../middleware/projectAccess.js';

const router = Router();
router.use(protect);

/**
 * @openapi
 * /api/analytics/dashboard:
 *   get:
 *     tags: [Analytics]
 *     summary: Aggregated dashboard payload (KPIs, progress, projects, deadlines, insights).
 */
router.get('/dashboard', ctrl.getDashboard);
router.get('/productivity', ctrl.getProductivity);
router.get('/projects/:projectId', loadProject(), ctrl.getProjectAnalytics);

export default router;
