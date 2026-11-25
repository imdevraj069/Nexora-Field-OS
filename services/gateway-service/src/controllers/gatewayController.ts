import { Response } from 'express';
import { AuthedRequest } from '../middlewares/auth';
import { ProjectService } from '../services/projectService';

export const GatewayController = {
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
    const project = await ProjectService.createProject(
      req.auth!,
      req.body.title,
      req.body.description,
      req.body.template,
    );
    res.status(201).json({ project });
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
    );
    res.status(201).json({ stage });
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
};
