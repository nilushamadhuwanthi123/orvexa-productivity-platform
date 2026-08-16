import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as ctrl from '../controllers/auth.controller.js';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/auth.validators.js';

const router = Router();

// Credential endpoints get a tighter budget than the global limiter.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many attempts, please try again later.' } },
});

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Create an account. The first account created becomes the workspace admin.
 *     responses:
 *       201: { description: Account created }
 */
router.post('/register', authLimiter, validate(registerSchema), ctrl.register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Exchange credentials for an access token and refresh cookie.
 */
router.post('/login', authLimiter, validate(loginSchema), ctrl.login);

router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.post('/logout-all', protect, ctrl.logoutAll);
router.get('/me', protect, ctrl.me);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), ctrl.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), ctrl.resetPassword);
router.post('/change-password', protect, validate(changePasswordSchema), ctrl.changePassword);

export default router;
