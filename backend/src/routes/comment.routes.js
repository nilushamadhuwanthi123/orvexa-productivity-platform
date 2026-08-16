import { Router } from 'express';
import * as ctrl from '../controllers/comment.controller.js';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import { commentSchema } from '../validators/task.validators.js';

const router = Router();
router.use(protect);

router
  .route('/:commentId')
  .patch(validate(commentSchema.pick({ body: true })), ctrl.updateComment)
  .delete(ctrl.deleteComment);

export default router;
