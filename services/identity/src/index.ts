import crypto from 'node:crypto';
import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import amqplib, { Channel } from 'amqplib';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { IDENTITY_PROTO_PATH } from '@nexora/proto';
import { createShardRouterFromEnv } from '@nexora/shard-router';
import {
  AuthTokenPayload,
  PERMISSION_FLAGS,
  generateOrgId,
  generatePrefixedId,
  resolveShardFromOrgId,
} from '@nexora/shared-types';

const HTTP_PORT = Number(process.env.IDENTITY_HTTP_PORT ?? 4001);
const GRPC_PORT = Number(process.env.IDENTITY_GRPC_PORT ?? 50051);
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret';

const router = createShardRouterFromEnv();
let mqChannel: Channel | null = null;

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, keyHex] = stored.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(keyHex, 'hex'), derived);
}

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function publishEmailTask(payload: Record<string, unknown>): Promise<void> {
  if (!mqChannel) return;
  mqChannel.sendToQueue('email_tasks', Buffer.from(JSON.stringify(payload)), { persistent: true });
}

async function initRabbitMq(): Promise<void> {
  const url = process.env.RABBITMQ_URL;
  if (!url) return;
  try {
    const conn = await amqplib.connect(url);
    mqChannel = await conn.createChannel();
    await mqChannel.assertQueue('email_tasks', { durable: true });
  } catch (err) {
    console.warn('[identity] RabbitMQ unavailable at startup, email events disabled:', (err as Error).message);
  }
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'identity' });
  });

  // Register User + Optionally Bootstrap First Organization
  app.post('/api/v1/auth/register', async (req: Request, res: Response) => {
    try {
      const { email, password, fullName, orgName, orgInitials, industryType } = req.body as {
        email: string;
        password: string;
        fullName: string;
        orgName?: string;
        orgInitials?: string;
        industryType?: string;
      };
      if (!email || !password || !fullName) {
        res.status(400).json({ error: 'email, password, and fullName are required' });
        return;
      }

      const globalPool = router.postgres.getGlobalPool();
      const userId = generatePrefixedId('USR');
      const verifyOtp = crypto.randomBytes(3).toString('hex').toUpperCase();

      await globalPool.query(
        `INSERT INTO users (user_id, email, password_hash, full_name, is_verified, verification_token_hash)
         VALUES ($1, $2, $3, $4, FALSE, $5)`,
        [userId, email.toLowerCase().trim(), hashPassword(password), fullName.trim(), hashToken(verifyOtp)],
      );

      let createdOrg: { orgId: string; shardId: number } | null = null;
      if (orgName && orgInitials) {
        const orgId = generateOrgId(orgInitials);
        const shardId = resolveShardFromOrgId(orgId);
        await globalPool.query(
          `INSERT INTO org_directory (org_id, org_name, org_initials, shard_id, created_by_user_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [orgId, orgName.trim(), orgInitials.trim().toUpperCase(), shardId, userId],
        );

        const shardPool = router.postgres.getPrimaryPool(shardId);
        await shardPool.query(
          `INSERT INTO organizations (org_id, name, industry_type) VALUES ($1, $2, $3)`,
          [orgId, orgName.trim(), industryType ?? 'general_field_ops'],
        );

        const adminFlags = Object.fromEntries(Object.values(PERMISSION_FLAGS).map((f) => [f, true]));
        const roleId = `ROLE-${orgId}-ADMIN`;
        await shardPool.query(
          `INSERT INTO roles (role_id, org_id, name, flags, is_system) VALUES ($1, $2, 'Admin', $3::jsonb, TRUE)`,
          [roleId, orgId, JSON.stringify(adminFlags)],
        );
        await shardPool.query(
          `INSERT INTO org_members (org_id, user_id, role_id) VALUES ($1, $2, $3)`,
          [orgId, userId, roleId],
        );
        await globalPool.query(
          `INSERT INTO user_org_memberships (user_id, org_id, role_id) VALUES ($1, $2, $3)`,
          [userId, orgId, roleId],
        );

        createdOrg = { orgId, shardId };
      }

      await publishEmailTask({
        template: 'verify-email',
        to: email.toLowerCase().trim(),
        subject: 'Verify your Nexora Field OS account',
        data: { fullName, verifyOtp, orgId: createdOrg?.orgId ?? null },
      });

      res.status(201).json({ userId, org: createdOrg, message: 'Registered. Check email for verification code.' });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/v1/auth/verify-email', async (req: Request, res: Response) => {
    const { email, otp } = req.body as { email: string; otp: string };
    const globalPool = router.postgres.getGlobalPool();
    const { rows } = await globalPool.query(
      `UPDATE users SET is_verified = TRUE, verification_token_hash = NULL, updated_at = NOW()
       WHERE email = $1 AND verification_token_hash = $2
       RETURNING user_id, email`,
      [email.toLowerCase().trim(), hashToken(otp.trim().toUpperCase())],
    );
    if (rows.length === 0) {
      res.status(400).json({ error: 'Invalid verification code or email' });
      return;
    }
    res.json({ verified: true, userId: rows[0].user_id });
  });

  app.post('/api/v1/auth/login', async (req: Request, res: Response) => {
    const { email, password, orgId } = req.body as { email: string; password: string; orgId?: string };
    const globalPool = router.postgres.getGlobalPool();
    const userRes = await globalPool.query(
      `SELECT user_id, email, password_hash, full_name, is_verified FROM users WHERE email = $1`,
      [email.toLowerCase().trim()],
    );
    if (userRes.rows.length === 0 || !verifyPassword(password, userRes.rows[0].password_hash)) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = userRes.rows[0];
    const memberships = await globalPool.query(
      `SELECT m.org_id, m.role_id, d.shard_id, d.org_name
       FROM user_org_memberships m
       JOIN org_directory d ON d.org_id = m.org_id
       WHERE m.user_id = $1 AND m.is_active = TRUE`,
      [user.user_id],
    );

    const activeMembership = orgId
      ? memberships.rows.find((m) => m.org_id === orgId.toUpperCase())
      : memberships.rows[0];

    if (!activeMembership) {
      res.status(403).json({ error: 'User has no active organization membership' });
      return;
    }

    const payload: AuthTokenPayload = {
      sub: user.user_id,
      email: user.email,
      activeOrgId: activeMembership.org_id,
      shardId: activeMembership.shard_id,
      roleId: activeMembership.role_id,
    };

    const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ sub: user.user_id, jti: crypto.randomUUID() }, JWT_REFRESH_SECRET, {
      expiresIn: '7d',
    });

    await globalPool.query(
      `INSERT INTO refresh_tokens (token_id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')`,
      [crypto.randomUUID(), user.user_id, hashToken(refreshToken)],
    );

    res.json({
      accessToken,
      refreshToken,
      user: { userId: user.user_id, email: user.email, fullName: user.full_name, isVerified: user.is_verified },
      activeOrg: activeMembership,
      organizations: memberships.rows,
    });
  });

  app.post('/api/v1/auth/request-reset', async (req: Request, res: Response) => {
    const { email } = req.body as { email: string };
    const resetToken = crypto.randomBytes(24).toString('hex');
    const globalPool = router.postgres.getGlobalPool();
    await globalPool.query(
      `UPDATE users SET reset_token_hash = $1, reset_token_expires_at = NOW() + INTERVAL '30 minutes'
       WHERE email = $2`,
      [hashToken(resetToken), email.toLowerCase().trim()],
    );
    await publishEmailTask({
      template: 'password-reset',
      to: email.toLowerCase().trim(),
      subject: 'Reset your Nexora Field OS password',
      data: { resetToken },
    });
    res.json({ sent: true });
  });

  app.post('/api/v1/auth/reset-password', async (req: Request, res: Response) => {
    const { email, resetToken, newPassword } = req.body as {
      email: string;
      resetToken: string;
      newPassword: string;
    };
    const globalPool = router.postgres.getGlobalPool();
    const { rowCount } = await globalPool.query(
      `UPDATE users SET password_hash = $1, reset_token_hash = NULL, reset_token_expires_at = NULL
       WHERE email = $2 AND reset_token_hash = $3 AND reset_token_expires_at > NOW()`,
      [hashPassword(newPassword), email.toLowerCase().trim(), hashToken(resetToken)],
    );
    if (!rowCount) {
      res.status(400).json({ error: 'Invalid or expired reset token' });
      return;
    }
    res.json({ reset: true });
  });

  return app;
}

function startGrpcServer(): void {
  const pkgDef = protoLoader.loadSync(IDENTITY_PROTO_PATH, { keepCase: true, longs: String, enums: String });
  const proto = grpc.loadPackageDefinition(pkgDef) as unknown as {
    nexora: { identity: { IdentityService: { service: grpc.ServiceDefinition } } };
  };

  const server = new grpc.Server();
  server.addService(proto.nexora.identity.IdentityService.service, {
    VerifyAccessToken: (
      call: grpc.ServerUnaryCall<{ token: string }, unknown>,
      callback: grpc.sendUnaryData<unknown>,
    ) => {
      try {
        const decoded = jwt.verify(call.request.token, JWT_ACCESS_SECRET) as AuthTokenPayload;
        callback(null, {
          valid: true,
          user_id: decoded.sub,
          email: decoded.email,
          active_org_id: decoded.activeOrgId,
          shard_id: decoded.shardId,
          role_id: decoded.roleId,
        });
      } catch {
        callback(null, { valid: false });
      }
    },

    ResolveOrgShard: async (
      call: grpc.ServerUnaryCall<{ org_id: string }, unknown>,
      callback: grpc.sendUnaryData<unknown>,
    ) => {
      try {
        const orgId = call.request.org_id.toUpperCase();
        const shardId = resolveShardFromOrgId(orgId);
        const res = await router.postgres
          .getGlobalPool()
          .query('SELECT org_id FROM org_directory WHERE org_id = $1', [orgId]);
        callback(null, { org_id: orgId, shard_id: shardId, exists: res.rows.length > 0 });
      } catch (err) {
        callback(err as grpc.ServiceError);
      }
    },

    GetUserProjectAccess: async (
      call: grpc.ServerUnaryCall<{ user_id: string; user_org_id: string; project_id: string }, unknown>,
      callback: grpc.sendUnaryData<unknown>,
    ) => {
      try {
        const { user_id, user_org_id, project_id } = call.request;
        const globalPool = router.postgres.getGlobalPool();
        // 1. Check cross-org collaborator registry first
        const collab = await globalPool.query(
          `SELECT owner_org_id, owner_shard_id, project_role_name, permission_flags, allocated_stage_ids
           FROM project_collaborators WHERE project_id = $1 AND user_id = $2`,
          [project_id, user_id],
        );
        if (collab.rows.length > 0) {
          const c = collab.rows[0];
          callback(null, {
            allowed: true,
            owner_org_id: c.owner_org_id,
            owner_shard_id: c.owner_shard_id,
            role_name: c.project_role_name,
            flags: c.permission_flags,
            allocated_stage_ids: c.allocated_stage_ids,
            is_external_collaborator: c.owner_org_id !== user_org_id,
          });
          return;
        }

        // 2. Otherwise verify home org ownership on user_org_id shard
        const ownerShardId = resolveShardFromOrgId(user_org_id);
        const shardPool = router.postgres.getReadPool(ownerShardId);
        const memberRes = await shardPool.query(
          `SELECT r.name, r.flags, m.allocated_stage_ids
           FROM org_members m
           JOIN roles r ON r.role_id = m.role_id
           JOIN projects p ON p.org_id = m.org_id
           WHERE m.org_id = $1 AND m.user_id = $2 AND p.project_id = $3 AND m.status = 'ACTIVE'`,
          [user_org_id, user_id, project_id],
        );

        if (memberRes.rows.length === 0) {
          callback(null, { allowed: false });
          return;
        }

        const row = memberRes.rows[0];
        callback(null, {
          allowed: true,
          owner_org_id: user_org_id,
          owner_shard_id: ownerShardId,
          role_name: row.name,
          flags: row.flags,
          allocated_stage_ids: row.allocated_stage_ids,
          is_external_collaborator: false,
        });
      } catch (err) {
        callback(err as grpc.ServiceError);
      }
    },
  });

  server.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), () => {
    console.log(`[identity] gRPC listening on :${GRPC_PORT}`);
  });
}

async function bootstrap() {
  await initRabbitMq();
  const app = createApp();
  app.listen(HTTP_PORT, () => console.log(`[identity] HTTP listening on :${HTTP_PORT}`));
  startGrpcServer();
}

bootstrap();
