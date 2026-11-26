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
router.get('/orgs/directory', authMiddleware, asyncHandler(GatewayController.listOrgDirectory));
router.post('/projects/:projectId/org-invites', authMiddleware, asyncHandler(GatewayController.inviteOrgCollaboration));
router.get('/projects/:projectId/collaborations', authMiddleware, asyncHandler(GatewayController.listProjectCollaborations));
router.post('/projects/:projectId/collaborators/assign', authMiddleware, asyncHandler(GatewayController.assignPartnerMembers));
router.delete('/projects/:projectId/collaborators/:userId', authMiddleware, asyncHandler(GatewayController.removePartnerMember));
router.get('/projects/:projectId/assignees', authMiddleware, asyncHandler(GatewayController.listProjectAssignees));
router.get('/collaborations/incoming', authMiddleware, asyncHandler(GatewayController.listIncomingOrgCollaborations));
router.post('/collaborations/:collabId/respond', authMiddleware, asyncHandler(GatewayController.respondToOrgCollaboration));

router.get('/tasks', authMiddleware, asyncHandler(GatewayController.listTasks));
router.get('/tasks/my-assigned', authMiddleware, asyncHandler(GatewayController.listMyTasks));
router.post('/tasks', authMiddleware, asyncHandler(GatewayController.createTask));
router.get('/tasks/:taskId', authMiddleware, asyncHandler(GatewayController.getTask));
router.patch('/projects/:projectId/tasks/:taskId', authMiddleware, asyncHandler(GatewayController.updateTask));

router.patch('/projects/:projectId/tasks/:taskId/status', authMiddleware, asyncHandler(GatewayController.updateTaskStatus));
router.patch('/projects/:projectId/tasks/:taskId/checklist', authMiddleware, asyncHandler(GatewayController.updateChecklist));
router.post('/projects/:projectId/analyze-ai', authMiddleware, asyncHandler(GatewayController.analyzeProjectProgress));
router.get('/projects/:projectId/ai-reports', authMiddleware, asyncHandler(GatewayController.getProjectAiReports));
router.get('/projects/:projectId/team', authMiddleware, asyncHandler(GatewayController.listProjectTeam));
router.post('/projects/:projectId/team', authMiddleware, asyncHandler(GatewayController.assignProjectTeamMember));
router.delete('/projects/:projectId/team/:userId', authMiddleware, asyncHandler(GatewayController.removeProjectTeamMember));
router.get('/projects/:projectId/tasks/:taskId/ai-insights', authMiddleware, asyncHandler(GatewayController.getTaskAiInsights));
router.post(
  '/projects/:projectId/tasks/:taskId/evidence',
  authMiddleware,
  upload.single('file'),
  asyncHandler(GatewayController.submitEvidence),
);
router.get('/projects/:projectId/files/:fileId/signed-url', authMiddleware, asyncHandler(GatewayController.getSignedUrl));
router.delete('/projects/:projectId/files/:fileId', authMiddleware, asyncHandler(GatewayController.deleteFile));

router.get('/evidence', authMiddleware, asyncHandler(GatewayController.listEvidence));
router.get('/analytics/efficiency', authMiddleware, asyncHandler(GatewayController.getAnalytics));
router.get('/activity', authMiddleware, asyncHandler(GatewayController.listActivity));
router.get('/inbox', authMiddleware, asyncHandler(GatewayController.getInbox));

router.get('/finance/overview', authMiddleware, asyncHandler(GatewayController.getFinanceOverview));
router.get('/finance/budgets', authMiddleware, asyncHandler(GatewayController.listBudgets));
router.post('/finance/budgets', authMiddleware, asyncHandler(GatewayController.upsertBudget));
router.get('/finance/budgets/:projectId/revisions', authMiddleware, asyncHandler(GatewayController.listBudgetRevisions));
router.get('/finance/expenses', authMiddleware, asyncHandler(GatewayController.listExpenses));
router.post('/finance/expenses', authMiddleware, upload.single('receipt'), asyncHandler(GatewayController.createExpense));
router.patch('/finance/expenses/:expenseId/pay', authMiddleware, asyncHandler(GatewayController.markExpensePaid));
router.get('/finance/reimbursements', authMiddleware, asyncHandler(GatewayController.listReimbursements));
router.post('/finance/reimbursements', authMiddleware, upload.single('receipt'), asyncHandler(GatewayController.createReimbursement));
router.patch('/finance/reimbursements/:claimId', authMiddleware, asyncHandler(GatewayController.reviewReimbursement));

export default router;
