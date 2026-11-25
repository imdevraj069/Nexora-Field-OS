import { Router } from 'express';
import { SuperadminController } from '../controllers/superadminController';
import { authMiddleware, superadminOnly } from '../middlewares/auth';
import { asyncHandler } from '../utils/http';

const router: Router = Router();
router.use(authMiddleware, superadminOnly);

router.get('/overview', asyncHandler(SuperadminController.overview));
router.get('/organizations', asyncHandler(SuperadminController.listOrgs));
router.get('/organizations/:orgId', asyncHandler(SuperadminController.orgDetail));
router.get('/users', asyncHandler(SuperadminController.listUsers));
router.patch('/organizations/:orgId/users/:userId/status', asyncHandler(SuperadminController.setMemberStatus));
router.patch('/organizations/:orgId/projects/:projectId/status', asyncHandler(SuperadminController.overrideProject));
router.patch('/organizations/:orgId/stages/:stageId/status', asyncHandler(SuperadminController.overrideStage));
router.patch('/organizations/:orgId/tasks/:taskId', asyncHandler(SuperadminController.overrideTask));

export default router;
