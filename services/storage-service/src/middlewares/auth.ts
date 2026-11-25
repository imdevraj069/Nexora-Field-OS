import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { storageEnv } from '../config/s3';
import { AppError } from '../utils/http';

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 90 * 1024 * 1024 },
});

export function requireMasterStorageKey(req: Request, _res: Response, next: NextFunction): void {
  const key = req.header('x-master-storage-key');
  if (!key || key !== storageEnv.masterStorageKey) {
    next(new AppError(401, 'Invalid x-master-storage-key'));
    return;
  }
  next();
}

export function requireMasterReadKey(req: Request, _res: Response, next: NextFunction): void {
  const key = req.header('x-master-read-key');
  const projectId = req.header('x-project-id');
  const orgId = req.header('x-org-id');
  if (!key || key !== storageEnv.masterReadKey || !projectId || !orgId) {
    next(new AppError(401, 'x-master-read-key, x-project-id, and x-org-id headers are required'));
    return;
  }
  next();
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  if (statusCode >= 500) {
    console.error(`[storage-service] ${req.method} ${req.url}:`, err);
  }
  res.status(statusCode).json({ success: false, error: err.message || 'Internal Server Error' });
}
