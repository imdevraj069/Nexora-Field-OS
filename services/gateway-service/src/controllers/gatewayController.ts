import { Response } from 'express';
import { AuthedRequest } from '../middlewares/auth';
import { ProjectService } from '../services/projectService';
import { FinanceService } from '../services/financeService';

export const GatewayController = {
  getMyContext: async (req: AuthedRequest, res: Response) => {
    const ctx = await ProjectService.getMyContext(req.auth!);
    res.json(ctx);
  },
  getOrgWorkflowStatuses: async (req: AuthedRequest, res: Response) => {
    const statuses = await ProjectService.getOrgWorkflowStatuses(req.auth!);
    res.json({ statuses });
  },
  updateOrgWorkflowStatuses: async (req: AuthedRequest, res: Response) => {
    const statuses = await ProjectService.updateOrgWorkflowStatuses(req.auth!, req.body.statuses);
    res.json({ statuses });
  },
  listRoles: async (req: AuthedRequest, res: Response) => {
    const roles = await ProjectService.listRoles(req.auth!);
    res.json({ roles });
  },
  upsertRole: async (req: AuthedRequest, res: Response) => {
    const result = await ProjectService.upsertRole(req.auth!, req.body.name, req.body.flags);
    res.status(201).json(result);
  },
  listMembers: async (req: AuthedRequest, res: Response) => {
    const members = await ProjectService.listOrgMembers(req.auth!);
    res.json({ members });
  },
  assignRoles: async (req: AuthedRequest, res: Response) => {
    const result = await ProjectService.assignRolesToMember(
      req.auth!,
      String(req.params.userId),
      req.body.roleIds,
      req.body.allocatedStageIds,
    );
    res.json(result);
  },
  listProjects: async (req: AuthedRequest, res: Response) => {
    const projects = await ProjectService.listProjects(req.auth!);
    res.json({ projects });
  },
  createProject: async (req: AuthedRequest, res: Response) => {
    const project = await ProjectService.createProject(req.auth!, req.body.title, req.body.description, {
      managerUserId: req.body.managerUserId,
      leadBrief: req.body.leadBrief,
      startDate: req.body.startDate,
      targetEndDate: req.body.targetEndDate,
      stages: req.body.stages,
      workflowStatuses: req.body.workflowStatuses,
    });
    res.status(201).json({ project });
  },
  updateProject: async (req: AuthedRequest, res: Response) => {
    const project = await ProjectService.updateProject(req.auth!, String(req.params.projectId), req.body);
    res.json({ project });
  },
  deleteProject: async (req: AuthedRequest, res: Response) => {
    const result = await ProjectService.deleteProject(req.auth!, String(req.params.projectId));
    res.json(result);
  },
  getProject: async (req: AuthedRequest, res: Response) => {
    const project = await ProjectService.getProjectTree(req.auth!, String(req.params.projectId));
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json({ project, stages: project.stages });
  },
  createStage: async (req: AuthedRequest, res: Response) => {
    const stage = await ProjectService.createStage(
      req.auth!,
      String(req.params.projectId),
      req.body.name,
      Number(req.body.orderIndex ?? 1),
      req.body.deadline,
    );
    res.status(201).json({ stage });
  },
  updateStage: async (req: AuthedRequest, res: Response) => {
    const stage = await ProjectService.updateStage(
      req.auth!,
      String(req.params.projectId),
      String(req.params.stageId),
      req.body,
    );
    res.json({ stage });
  },
  deleteStage: async (req: AuthedRequest, res: Response) => {
    const result = await ProjectService.deleteStage(
      req.auth!,
      String(req.params.projectId),
      String(req.params.stageId),
    );
    res.json(result);
  },
  applyAiBlueprint: async (req: AuthedRequest, res: Response) => {
    const result = await ProjectService.applyAiBlueprint(
      req.auth!,
      String(req.params.projectId),
      req.body.leadBrief,
    );
    res.json(result);
  },
  updateTask: async (req: AuthedRequest, res: Response) => {
    const task = await ProjectService.updateTask(
      req.auth!,
      String(req.params.projectId),
      String(req.params.taskId),
      req.body,
    );
    res.json({ task });
  },
  invitePartner: async (req: AuthedRequest, res: Response) => {
    const ok = await ProjectService.invitePartnerOrg(req.auth!, {
      projectId: String(req.params.projectId),
      partnerOrgId: req.body.partnerOrgId,
      userId: req.body.userId,
      roleName: req.body.roleName || 'Partner Collaborator',
      allocatedStageIds: req.body.allocatedStageIds || [],
    });
    res.status(201).json({ invited: ok });
  },
  generateAiBlueprint: async (req: AuthedRequest, res: Response) => {
    const plan = await ProjectService.generateAiPlan(req.auth!, req.body.prompt, req.body.industryHint);
    res.json(plan);
  },
  listTasks: async (req: AuthedRequest, res: Response) => {
    const tasks = await ProjectService.listTasks(req.auth!, {
      projectId: req.query.projectId ? String(req.query.projectId) : undefined,
      assignedToMe: false,
    });
    res.json({ tasks });
  },
  listMyTasks: async (req: AuthedRequest, res: Response) => {
    const tasks = await ProjectService.listTasks(req.auth!, { assignedToMe: true });
    res.json({ tasks });
  },
  getTask: async (req: AuthedRequest, res: Response) => {
    const task = await ProjectService.getTaskById(req.auth!, String(req.params.taskId));
    res.json({ task });
  },
  createTask: async (req: AuthedRequest, res: Response) => {
    const task = await ProjectService.createTask(req.auth!, {
      projectId: req.body.projectId,
      stageId: req.body.stageId,
      title: req.body.title,
      description: req.body.description,
      taskType: req.body.taskType,
      assignedUserId: req.body.assignedUserId,
      deadline: req.body.deadline,
      checklist: req.body.checklist,
      fileRequirements: req.body.fileRequirements,
    });
    res.status(201).json({ task });
  },
  updateTaskStatus: async (req: AuthedRequest, res: Response) => {
    const result = await ProjectService.updateTaskStatus(req.auth!, {
      projectId: String(req.params.projectId),
      taskId: String(req.params.taskId),
      toStatus: req.body.status,
      notes: req.body.notes,
    });
    res.json(result);
  },
  updateChecklist: async (req: AuthedRequest, res: Response) => {
    const result = await ProjectService.updateTaskChecklist(req.auth!, {
      projectId: String(req.params.projectId),
      taskId: String(req.params.taskId),
      checklist: req.body.checklist,
      fileRequirements: req.body.fileRequirements,
      textInputs: req.body.textInputs,
    });
    res.json(result);
  },
  analyzeProjectProgress: async (req: AuthedRequest, res: Response) => {
    const result = await ProjectService.analyzeProjectProgress(req.auth!, String(req.params.projectId));
    res.json(result);
  },
  submitEvidence: async (req: AuthedRequest, res: Response) => {
    const result = await ProjectService.submitEvidence(
      req.auth!,
      String(req.params.projectId),
      String(req.params.taskId),
      req.body,
      req.file,
    );
    res.status(202).json(result);
  },
  getSignedUrl: async (req: AuthedRequest, res: Response) => {
    const result = await ProjectService.mintSignedFileUrl(
      req.auth!,
      String(req.params.projectId),
      String(req.params.fileId),
    );
    res.json(result);
  },
  deleteFile: async (req: AuthedRequest, res: Response) => {
    const result = await ProjectService.deleteFile(
      req.auth!,
      String(req.params.projectId),
      String(req.params.fileId),
    );
    res.json(result);
  },
  listEvidence: async (req: AuthedRequest, res: Response) => {
    const data = await ProjectService.listEvidence(req.auth!, {
      projectId: req.query.projectId ? String(req.query.projectId) : undefined,
      type: req.query.type ? String(req.query.type) : undefined,
    });
    res.json(data);
  },
  getAnalytics: async (req: AuthedRequest, res: Response) => {
    const data = await ProjectService.getEfficiencyAnalytics(req.auth!);
    res.json(data);
  },
  listActivity: async (req: AuthedRequest, res: Response) => {
    const activity = await ProjectService.listActivity(req.auth!);
    res.json({ activity });
  },
  getInbox: async (req: AuthedRequest, res: Response) => {
    const inbox = await ProjectService.getInbox(req.auth!);
    res.json(inbox);
  },
  getFinanceOverview: async (req: AuthedRequest, res: Response) => {
    const overview = await FinanceService.getOverview(req.auth!);
    res.json(overview);
  },
  listBudgets: async (req: AuthedRequest, res: Response) => {
    const budgets = await FinanceService.listBudgets(req.auth!);
    res.json({ budgets });
  },
  upsertBudget: async (req: AuthedRequest, res: Response) => {
    const budget = await FinanceService.upsertBudget(req.auth!, req.body);
    res.status(201).json({ budget });
  },
  listExpenses: async (req: AuthedRequest, res: Response) => {
    const expenses = await FinanceService.listExpenses(
      req.auth!,
      req.query.projectId ? String(req.query.projectId) : undefined,
    );
    res.json({ expenses });
  },
  createExpense: async (req: AuthedRequest, res: Response) => {
    const expense = await FinanceService.createExpense(req.auth!, req.body, req.file);
    res.status(201).json({ expense });
  },
  markExpensePaid: async (req: AuthedRequest, res: Response) => {
    const result = await FinanceService.markExpensePaid(req.auth!, String(req.params.expenseId));
    res.json(result);
  },
  listReimbursements: async (req: AuthedRequest, res: Response) => {
    const claims = await FinanceService.listReimbursements(req.auth!);
    res.json({ claims });
  },
  createReimbursement: async (req: AuthedRequest, res: Response) => {
    const claim = await FinanceService.createReimbursement(req.auth!, req.body, req.file);
    res.status(201).json({ claim });
  },
  reviewReimbursement: async (req: AuthedRequest, res: Response) => {
    const result = await FinanceService.reviewReimbursement(
      req.auth!,
      String(req.params.claimId),
      req.body.status,
      req.body.reviewNotes,
    );
    res.json(result);
  },
  listOrgDirectory: async (req: AuthedRequest, res: Response) => {
    const orgs = await ProjectService.listOrgDirectory(
      req.auth!,
      req.query.q ? String(req.query.q) : undefined,
    );
    res.json({ orgs });
  },
  inviteOrgCollaboration: async (req: AuthedRequest, res: Response) => {
    const collab = await ProjectService.inviteOrgCollaboration(req.auth!, {
      projectId: String(req.params.projectId),
      partnerOrgId: req.body.partnerOrgId,
      allocatedStageIds: req.body.allocatedStageIds,
      notes: req.body.notes,
    });
    res.status(201).json({ collaboration: collab });
  },
  listProjectCollaborations: async (req: AuthedRequest, res: Response) => {
    const data = await ProjectService.listProjectCollaborations(req.auth!, String(req.params.projectId));
    res.json(data);
  },
  listIncomingOrgCollaborations: async (req: AuthedRequest, res: Response) => {
    const incoming = await ProjectService.listIncomingOrgCollaborations(req.auth!);
    res.json({ incoming });
  },
  respondToOrgCollaboration: async (req: AuthedRequest, res: Response) => {
    const collaboration = await ProjectService.respondToOrgCollaboration(
      req.auth!,
      String(req.params.collabId),
      req.body,
    );
    res.json({ collaboration });
  },
  assignPartnerMembers: async (req: AuthedRequest, res: Response) => {
    const result = await ProjectService.assignPartnerMembers(
      req.auth!,
      String(req.params.projectId),
      req.body,
    );
    res.status(201).json(result);
  },
  removePartnerMember: async (req: AuthedRequest, res: Response) => {
    const result = await ProjectService.removePartnerMember(
      req.auth!,
      String(req.params.projectId),
      String(req.params.userId),
    );
    res.json(result);
  },
  listProjectAssignees: async (req: AuthedRequest, res: Response) => {
    const assignees = await ProjectService.listProjectAssignees(req.auth!, String(req.params.projectId));
    res.json({ assignees });
  },
};
