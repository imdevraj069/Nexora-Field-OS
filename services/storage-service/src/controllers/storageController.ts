import { Request, Response } from 'express';
import { S3Service, verifyClientReadToken } from '../services/s3Service';
import { AppError } from '../utils/http';

export const StorageController = {
  upload: async (req: Request, res: Response) => {
    const result = await S3Service.uploadFile({
      bucket: req.header('x-bucket-name'),
      file: req.file,
      projectId: req.body.projectId,
      orgId: req.body.orgId,
      stageId: req.body.stageId,
      taskId: req.body.taskId,
      uploadedBy: req.body.uploadedBy,
      tags: req.body.tags,
    });
    res.status(201).json(result);
  },

  internalRead: async (req: Request, res: Response) => {
    const fileId = String(req.params.fileId);
    const projectId = req.header('x-project-id')!;
    const orgId = req.header('x-org-id')!;
    const { mimeType, stream } = await S3Service.fetchProjectStream(orgId, projectId, fileId);
    res.setHeader('Content-Type', mimeType);
    stream.pipe(res);
  },

  clientSignedRead: async (req: Request, res: Response) => {
    const fileId = String(req.params.fileId);
    const { projectId, orgId, userId, exp, sig } = req.query as Record<string, string>;
    if (!projectId || !orgId || !userId || !exp || !sig) {
      throw new AppError(400, 'Missing signed URL query parameters');
    }
    if (!verifyClientReadToken(fileId, projectId, userId, Number(exp), sig)) {
      throw new AppError(403, 'Invalid or expired file signature');
    }
    const { mimeType, stream } = await S3Service.fetchProjectStream(orgId, projectId, fileId);
    res.setHeader('Content-Type', mimeType);
    stream.pipe(res);
  },

  internalDelete: async (req: Request, res: Response) => {
    const fileId = String(req.params.fileId);
    const projectId = req.header('x-project-id') || 'general';
    const orgId = req.header('x-org-id')!;
    const result = await S3Service.deleteProjectFile(orgId, projectId, fileId);
    res.json(result);
  },
};
