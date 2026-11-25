import { Request, Response, NextFunction } from 'express';
import { grpcCall, identityClient } from '../grpc/clients';
import { AppError } from '../utils/http';

export interface AuthContext {
  userId: string;
  email: string;
  activeOrgId: string;
  shardId: 1 | 2 | 3;
  roleId: string;
}

export interface AuthedRequest extends Request {
  auth?: AuthContext;
}

export async function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Missing Bearer token' });
    return;
  }
  try {
    const verified = await grpcCall(identityClient.VerifyAccessToken.bind(identityClient), { token });
    if (!verified.valid) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    req.auth = {
      userId: String(verified.user_id),
      email: String(verified.email),
      activeOrgId: String(verified.active_org_id),
      shardId: Number(verified.shard_id) as 1 | 2 | 3,
      roleId: String(verified.role_id),
    };
    next();
  } catch (err) {
    res.status(503).json({ error: 'Identity verification unavailable', detail: (err as Error).message });
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  if (statusCode >= 500) {
    console.error(`[gateway-service] ${req.method} ${req.url}:`, err);
  }
  res.status(statusCode).json({ success: false, error: err.message || 'Internal Server Error' });
}
