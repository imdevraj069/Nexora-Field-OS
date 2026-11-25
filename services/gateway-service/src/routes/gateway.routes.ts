import { Router } from 'express';
import multer from 'multer';
import { GatewayController } from '../controllers/gatewayController';
import { authMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../utils/http';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 90 * 1024 * 1024 } });
const router: Router = Router();

router.get('/roles', authMiddleware, asyncHandler(GatewayController.listRoles));
router.post('/roles', authMiddleware, asyncHandler(GatewayController.upsertRole));
router.post(
  '/projects/:projectId/tasks/:taskId/evidence',
  authMiddleware,
  upload.single('file'),
  asyncHandler(GatewayController.submitEvidence),
);
router.get('/projects/:projectId/files/:fileId/signed-url', authMiddleware, asyncHandler(GatewayController.getSignedUrl));

export default router;
