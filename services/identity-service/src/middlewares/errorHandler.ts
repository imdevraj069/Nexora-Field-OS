import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  if (statusCode >= 500) {
    console.error(`[identity-service] ${req.method} ${req.url}:`, err);
  }
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
}
