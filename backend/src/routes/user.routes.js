import { Router } from 'express';
import * as ctrl from '../controllers/user.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/', ctrl.listUsers);
router.get('/workload', ctrl.getTeamWorkload);
router.patch('/me', ctrl.updateMe);
router.get('/:id', ctrl.getUser);
router.patch('/:id/role', authorize('admin'), ctrl.updateUserRole);
router.delete('/:id', authorize('admin'), ctrl.deleteUser);

export default router;
