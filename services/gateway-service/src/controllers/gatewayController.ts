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
