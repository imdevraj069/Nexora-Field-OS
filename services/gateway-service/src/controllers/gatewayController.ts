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
  updateTaskStatus: async (req: AuthedRequest, res: Response) => {
    const result = await ProjectService.updateTaskStatus(req.auth!, {
      projectId: String(req.params.projectId),
      taskId: String(req.params.taskId),
      toStatus: req.body.status,
      notes: req.body.notes,
    });
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
