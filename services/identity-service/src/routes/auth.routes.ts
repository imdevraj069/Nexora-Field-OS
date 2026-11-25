import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { asyncHandler } from '../utils/asyncHandler';

const router: Router = Router();
router.post('/superadmin/login', asyncHandler(AuthController.superadminLogin));
router.post('/register', asyncHandler(AuthController.register));
router.post('/verify-email', asyncHandler(AuthController.verifyEmail));
router.post('/login', asyncHandler(AuthController.login));
router.post('/request-reset', asyncHandler(AuthController.requestReset));
router.post('/reset-password', asyncHandler(AuthController.resetPassword));

export default router;
