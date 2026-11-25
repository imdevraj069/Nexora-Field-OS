import { Router } from 'express';
import multer from 'multer';
import { GatewayController } from '../controllers/gatewayController';
import { authMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../utils/http';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 90 * 1024 * 1024 } });
const router: Router = Router();

router.get('/org/my-context', authMiddleware, asyncHandler(GatewayController.getMyContext));
router.get('/org/workflow-statuses', authMiddleware, asyncHandler(GatewayController.getOrgWorkflowStatuses));
router.put('/org/workflow-statuses', authMiddleware, asyncHandler(GatewayController.updateOrgWorkflowStatuses));
router.get('/roles', authMiddleware, asyncHandler(GatewayController.listRoles));
router.post('/roles', authMiddleware, asyncHandler(GatewayController.upsertRole));
router.get('/org/members', authMiddleware, asyncHandler(GatewayController.listMembers));
router.put('/org/members/:userId/roles', authMiddleware, asyncHandler(GatewayController.assignRoles));

router.get('/projects', authMiddleware, asyncHandler(GatewayController.listProjects));
router.post('/projects', authMiddleware, asyncHandler(GatewayController.createProject));
router.post('/projects/ai-blueprint', authMiddleware, asyncHandler(GatewayController.generateAiBlueprint));
router.get('/projects/:projectId', authMiddleware, asyncHandler(GatewayController.getProject));
router.patch('/projects/:projectId', authMiddleware, asyncHandler(GatewayController.updateProject));
router.delete('/projects/:projectId', authMiddleware, asyncHandler(GatewayController.deleteProject));
router.post('/projects/:projectId/apply-blueprint', authMiddleware, asyncHandler(GatewayController.applyAiBlueprint));
router.post('/projects/:projectId/stages', authMiddleware, asyncHandler(GatewayController.createStage));
router.patch('/projects/:projectId/stages/:stageId', authMiddleware, asyncHandler(GatewayController.updateStage));
router.delete('/projects/:projectId/stages/:stageId', authMiddleware, asyncHandler(GatewayController.deleteStage));
router.post('/projects/:projectId/collaborators', authMiddleware, asyncHandler(GatewayController.invitePartner));

router.get('/tasks', authMiddleware, asyncHandler(GatewayController.listTasks));
router.get('/tasks/my-assigned', authMiddleware, asyncHandler(GatewayController.listMyTasks));
router.post('/tasks', authMiddleware, asyncHandler(GatewayController.createTask));
router.get('/tasks/:taskId', authMiddleware, asyncHandler(GatewayController.getTask));
router.patch('/projects/:projectId/tasks/:taskId', authMiddleware, asyncHandler(GatewayController.updateTask));

router.patch('/projects/:projectId/tasks/:taskId/status', authMiddleware, asyncHandler(GatewayController.updateTaskStatus));
router.patch('/projects/:projectId/tasks/:taskId/checklist', authMiddleware, asyncHandler(GatewayController.updateChecklist));
router.post('/projects/:projectId/analyze-ai', authMiddleware, asyncHandler(GatewayController.analyzeProjectProgress));
router.post(
  '/projects/:projectId/tasks/:taskId/evidence',
  authMiddleware,
  upload.single('file'),
  asyncHandler(GatewayController.submitEvidence),
);
router.get('/projects/:projectId/files/:fileId/signed-url', authMiddleware, asyncHandler(GatewayController.getSignedUrl));

export default router;
