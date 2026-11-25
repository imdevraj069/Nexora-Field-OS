import { Response } from 'express';
import { AuthedRequest } from '../middlewares/auth';
import { SuperadminService } from '../services/superadminService';

export const SuperadminController = {
  overview: async (_req: AuthedRequest, res: Response) => {
    const data = await SuperadminService.getPlatformOverview();
    res.json(data);
  },
  listOrgs: async (_req: AuthedRequest, res: Response) => {
    const organizations = await SuperadminService.listAllOrganizations();
    res.json({ organizations });
  },
  orgDetail: async (req: AuthedRequest, res: Response) => {
    const detail = await SuperadminService.getOrganizationDetail(String(req.params.orgId));
    res.json(detail);
  },
  listUsers: async (_req: AuthedRequest, res: Response) => {
    const users = await SuperadminService.listAllUsers();
    res.json({ users });
  },
  setMemberStatus: async (req: AuthedRequest, res: Response) => {
    const result = await SuperadminService.updateOrgMemberStatus(
      String(req.params.orgId),
      String(req.params.userId),
      req.body.status,
    );
    res.json(result);
  },
  overrideProject: async (req: AuthedRequest, res: Response) => {
    const result = await SuperadminService.overrideProjectStatus(
      String(req.params.orgId),
      String(req.params.projectId),
      req.body.status,
    );
    res.json(result);
  },
  overrideStage: async (req: AuthedRequest, res: Response) => {
    const result = await SuperadminService.overrideStageStatus(
      String(req.params.orgId),
      String(req.params.stageId),
      req.body.status,
    );
    res.json(result);
  },
  overrideTask: async (req: AuthedRequest, res: Response) => {
    const result = await SuperadminService.overrideTask(
      String(req.params.orgId),
      String(req.params.taskId),
      req.body,
    );
    res.json(result);
  },
};
