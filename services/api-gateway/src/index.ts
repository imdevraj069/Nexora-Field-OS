import http from 'node:http';
import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { buildSchema } from 'graphql';
import { createHandler } from 'graphql-http/lib/use/express';
import amqplib, { Channel } from 'amqplib';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { AI_PROTO_PATH, IDENTITY_PROTO_PATH, STORAGE_PROTO_PATH } from '@nexora/proto';
import { createShardRouterFromEnv } from '@nexora/shard-router';
import {
  PERMISSION_FLAGS,
  RolePermissionContext,
  generatePrefixedId,
  hasPermission,
  resolveShardFromOrgId,
} from '@nexora/shared-types';

const PORT = Number(process.env.API_GATEWAY_PORT ?? 4000);
const STORAGE_HTTP_URL = process.env.STORAGE_HTTP_URL ?? 'http://storage:4002';
const MASTER_STORAGE_KEY = process.env.MASTER_STORAGE_KEY ?? 'dev-master-storage-key';

const router = createShardRouterFromEnv();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 90 * 1024 * 1024 } });
let mqChannel: Channel | null = null;

function loadGrpcClient<T>(protoPath: string, pkgPath: string[], address: string): T {
  const pkgDef = protoLoader.loadSync(protoPath, { keepCase: true, longs: String, enums: String });
  let cur = grpc.loadPackageDefinition(pkgDef) as Record<string, unknown>;
  for (const part of pkgPath) {
    cur = cur[part] as Record<string, unknown>;
  }
  const ClientCtor = cur as unknown as new (addr: string, creds: grpc.ChannelCredentials) => T;
  return new ClientCtor(address, grpc.credentials.createInsecure());
}

const identityClient = loadGrpcClient<{
  VerifyAccessToken: (req: { token: string }, cb: grpc.sendUnaryData<Record<string, unknown>>) => void;
  GetUserProjectAccess: (
    req: { user_id: string; user_org_id: string; project_id: string },
    cb: grpc.sendUnaryData<Record<string, unknown>>,
  ) => void;
}>(IDENTITY_PROTO_PATH, ['nexora', 'identity', 'IdentityService'], process.env.IDENTITY_GRPC_URL ?? 'identity:50051');

const storageClient = loadGrpcClient<{
  MintSignedClientUrl: (
    req: { file_id: string; org_id: string; project_id: string; user_id: string; ttl_seconds?: number },
    cb: grpc.sendUnaryData<{ signed_url: string; expires_at: number }>,
  ) => void;
}>(STORAGE_PROTO_PATH, ['nexora', 'storage', 'StorageService'], process.env.STORAGE_GRPC_URL ?? 'storage:50052');

const aiClient = loadGrpcClient<{
  GenerateProjectBlueprint: (
    req: { org_id: string; prompt: string; industry_hint: string },
    cb: grpc.sendUnaryData<Record<string, unknown>>,
  ) => void;
}>(AI_PROTO_PATH, ['nexora', 'ai', 'AiGovernanceService'], process.env.AI_GRPC_URL ?? 'ai-governance:50053');

function grpcCall<TReq, TRes>(fn: (req: TReq, cb: grpc.sendUnaryData<TRes>) => void, req: TReq): Promise<TRes> {
  return new Promise((resolve, reject) => {
    fn(req, (err, res) => (err ? reject(err) : resolve(res as TRes)));
  });
}

interface AuthedRequest extends Request {
  auth?: {
    userId: string;
    email: string;
    activeOrgId: string;
    shardId: 1 | 2 | 3;
    roleId: string;
  };
}

async function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
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

async function resolveProjectAccess(userId: string, userOrgId: string, projectId: string) {
  const access = await grpcCall(identityClient.GetUserProjectAccess.bind(identityClient), {
    user_id: userId,
    user_org_id: userOrgId,
    project_id: projectId,
  });
  if (!access.allowed) {
    throw new Error('Forbidden: no access to requested project');
  }
  const roleCtx: RolePermissionContext = {
    roleName: String(access.role_name),
    flags: (access.flags as Record<string, boolean>) ?? {},
    allocatedStageIds: (access.allocated_stage_ids as string[]) ?? [],
    isExternalCollaborator: Boolean(access.is_external_collaborator),
  };
  return {
    ownerOrgId: String(access.owner_org_id),
    ownerShardId: Number(access.owner_shard_id) as 1 | 2 | 3,
    roleCtx,
  };
}

const schema = buildSchema(`
  type TaskSummary {
    taskId: ID!
    stageId: ID!
    title: String!
    taskType: String!
    status: String!
    assignedUserId: String
    deadline: String
    efficiencyScore: Float
  }

  type StageSummary {
    stageId: ID!
    name: String!
    orderIndex: Int!
    status: String!
    tasks: [TaskSummary!]!
  }

  type ProjectSummary {
    projectId: ID!
    orgId: String!
    title: String!
    status: String!
    stages: [StageSummary!]!
  }

  type AiStageSuggestion {
    name: String!
    orderIndex: Int!
    recommendedRole: String!
  }

  type AiBlueprint {
    suggestedTitle: String!
    summary: String!
    stages: [AiStageSuggestion!]!
  }

  type Query {
    projects: [ProjectSummary!]!
    project(projectId: ID!): ProjectSummary
  }

  type Mutation {
    createProject(title: String!, description: String): ProjectSummary!
    createStage(projectId: ID!, name: String!, orderIndex: Int!): StageSummary!
    createTask(projectId: ID!, stageId: ID!, title: String!, taskType: String, assignedUserId: String, deadline: String): TaskSummary!
    invitePartnerOrg(projectId: ID!, partnerOrgId: String!, userId: String!, roleName: String!, allocatedStageIds: [String!]!): Boolean!
    generateAiProjectPlan(prompt: String!, industryHint: String): AiBlueprint!
  }
`);

async function bootstrap() {
  if (process.env.RABBITMQ_URL) {
    try {
      const conn = await amqplib.connect(process.env.RABBITMQ_URL);
      mqChannel = await conn.createChannel();
      await mqChannel.assertQueue('ai_jobs', { durable: true });
      await mqChannel.assertQueue('email_tasks', { durable: true });
    } catch (err) {
      console.warn('[api-gateway] RabbitMQ unavailable:', (err as Error).message);
    }
  }

  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'api-gateway' });
  });

  // GraphQL API (Protected)
  app.all('/graphql', authMiddleware, (req: AuthedRequest, res: Response, next: NextFunction) => {
    const auth = req.auth!;
    const rootValue = {
      projects: async () => {
        const homePool = router.postgres.getReadPool(auth.shardId);
        const homeProjects = await homePool.query(
          `SELECT project_id, org_id, title, status FROM projects WHERE org_id = $1 ORDER BY created_at DESC`,
          [auth.activeOrgId],
        );
        const collabRows = await router.postgres
          .getGlobalPool()
          .query(`SELECT project_id, owner_org_id, owner_shard_id FROM project_collaborators WHERE user_id = $1`, [
            auth.userId,
          ]);

        const sharedProjects = await Promise.all(
          collabRows.rows.map(async (c) => {
            const p = router.postgres.getReadPool(c.owner_shard_id);
            const r = await p.query(`SELECT project_id, org_id, title, status FROM projects WHERE project_id = $1`, [
              c.project_id,
            ]);
            return r.rows[0];
          }),
        );

        return [...homeProjects.rows, ...sharedProjects.filter(Boolean)].map((p) => ({
          projectId: p.project_id,
          orgId: p.org_id,
          title: p.title,
          status: p.status,
          stages: [],
        }));
      },

      project: async ({ projectId }: { projectId: string }) => {
        const { ownerShardId } = await resolveProjectAccess(auth.userId, auth.activeOrgId, projectId);
        const pool = router.postgres.getReadPool(ownerShardId);
        const pr = await pool.query(`SELECT project_id, org_id, title, status FROM projects WHERE project_id = $1`, [
          projectId,
        ]);
        if (pr.rows.length === 0) return null;
        const stages = await pool.query(
          `SELECT stage_id, name, order_index, status FROM stages WHERE project_id = $1 ORDER BY order_index ASC`,
          [projectId],
        );
        const tasks = await pool.query(
          `SELECT t.task_id, t.stage_id, t.title, t.task_type, t.status, t.assigned_user_id, t.deadline, s.overall_efficiency
           FROM tasks t LEFT JOIN task_efficiency_scores s ON s.task_id = t.task_id
           WHERE t.project_id = $1`,
          [projectId],
        );

        return {
          projectId: pr.rows[0].project_id,
          orgId: pr.rows[0].org_id,
          title: pr.rows[0].title,
          status: pr.rows[0].status,
          stages: stages.rows.map((st) => ({
            stageId: st.stage_id,
            name: st.name,
            orderIndex: st.order_index,
            status: st.status,
            tasks: tasks.rows
              .filter((t) => t.stage_id === st.stage_id)
              .map((t) => ({
                taskId: t.task_id,
                stageId: t.stage_id,
                title: t.title,
                taskType: t.task_type,
                status: t.status,
                assignedUserId: t.assigned_user_id,
                deadline: t.deadline ? new Date(t.deadline).toISOString() : null,
                efficiencyScore: t.overall_efficiency ? Number(t.overall_efficiency) : null,
              })),
          })),
        };
      },

      createProject: async ({ title, description }: { title: string; description?: string }) => {
        const pool = router.postgres.getPrimaryPool(auth.shardId);
        const projectId = generatePrefixedId('PRJ');
        await pool.query(
          `INSERT INTO projects (project_id, org_id, title, description, status, created_by)
           VALUES ($1, $2, $3, $4, 'ACTIVE', $5)`,
          [projectId, auth.activeOrgId, title, description ?? null, auth.userId],
        );
        return { projectId, orgId: auth.activeOrgId, title, status: 'ACTIVE', stages: [] };
      },

      createStage: async ({ projectId, name, orderIndex }: { projectId: string; name: string; orderIndex: number }) => {
        const { ownerOrgId, ownerShardId, roleCtx } = await resolveProjectAccess(
          auth.userId,
          auth.activeOrgId,
          projectId,
        );
        if (!hasPermission(roleCtx, PERMISSION_FLAGS.STAGE_MANAGE_ALL)) {
          throw new Error('Forbidden: requires stage.manage_all');
        }
        const stageId = generatePrefixedId('STG');
        await router.postgres
          .getPrimaryPool(ownerShardId)
          .query(`INSERT INTO stages (stage_id, project_id, org_id, name, order_index) VALUES ($1, $2, $3, $4, $5)`, [
            stageId,
            projectId,
            ownerOrgId,
            name,
            orderIndex,
          ]);
        return { stageId, name, orderIndex, status: 'PENDING', tasks: [] };
      },

      createTask: async (args: {
        projectId: string;
        stageId: string;
        title: string;
        taskType?: string;
        assignedUserId?: string;
        deadline?: string;
      }) => {
        const { ownerOrgId, ownerShardId, roleCtx } = await resolveProjectAccess(
          auth.userId,
          auth.activeOrgId,
          args.projectId,
        );
        if (!hasPermission(roleCtx, PERMISSION_FLAGS.TASK_CREATE_ASSIGN, args.stageId)) {
          throw new Error('Forbidden: requires task.create_assign');
        }
        const taskId = generatePrefixedId('TSK');
        await router.postgres.getPrimaryPool(ownerShardId).query(
          `INSERT INTO tasks (task_id, stage_id, project_id, org_id, title, task_type, assigned_user_id, deadline)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            taskId,
            args.stageId,
            args.projectId,
            ownerOrgId,
            args.title,
            args.taskType ?? 'ON_FIELD',
            args.assignedUserId ?? null,
            args.deadline ?? null,
          ],
        );
        return {
          taskId,
          stageId: args.stageId,
          title: args.title,
          taskType: args.taskType ?? 'ON_FIELD',
          status: 'TODO',
          assignedUserId: args.assignedUserId ?? null,
          deadline: args.deadline ?? null,
        };
      },

      invitePartnerOrg: async (args: {
        projectId: string;
        partnerOrgId: string;
        userId: string;
        roleName: string;
        allocatedStageIds: string[];
      }) => {
        const { ownerOrgId, ownerShardId, roleCtx } = await resolveProjectAccess(
          auth.userId,
          auth.activeOrgId,
          args.projectId,
        );
        if (!hasPermission(roleCtx, PERMISSION_FLAGS.ORG_INVITE_PARTNER_ORGS)) {
          throw new Error('Forbidden: requires org.invite_partner_orgs');
        }
        const partnerFlags = {
          [PERMISSION_FLAGS.STAGE_MANAGE_ALLOCATED_ONLY]: true,
          [PERMISSION_FLAGS.TASK_EXECUTE_OWN]: true,
          [PERMISSION_FLAGS.TASK_UPLOAD_EVIDENCE]: true,
        };
        await router.postgres.getGlobalPool().query(
          `INSERT INTO project_collaborators
             (project_id, owner_org_id, owner_shard_id, partner_org_id, user_id, project_role_name, permission_flags, allocated_stage_ids)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
           ON CONFLICT (project_id, user_id) DO UPDATE SET
             project_role_name = EXCLUDED.project_role_name,
             allocated_stage_ids = EXCLUDED.allocated_stage_ids`,
          [
            args.projectId,
            ownerOrgId,
            ownerShardId,
            args.partnerOrgId.toUpperCase(),
            args.userId,
            args.roleName,
            JSON.stringify(partnerFlags),
            JSON.stringify(args.allocatedStageIds),
          ],
        );
        return true;
      },

      generateAiProjectPlan: async ({ prompt, industryHint }: { prompt: string; industryHint?: string }) => {
        const res = await grpcCall(aiClient.GenerateProjectBlueprint.bind(aiClient), {
          org_id: auth.activeOrgId,
          prompt,
          industry_hint: industryHint ?? 'general_field_ops',
        });
        const stages = ((res.stages as Array<Record<string, unknown>>) ?? []).map((s) => ({
          name: String(s.name),
          orderIndex: Number(s.order_index),
          recommendedRole: String(s.recommended_role),
        }));
        return {
          suggestedTitle: String(res.suggested_title),
          summary: String(res.summary),
          stages,
        };
      },
    };

    return createHandler({ schema, rootValue })(req, res, next);
  });

  // Dynamic Custom Roles with Permission Flags
  app.post('/api/v1/roles', authMiddleware, async (req: AuthedRequest, res: Response) => {
    const auth = req.auth!;
    const { name, flags } = req.body as { name: string; flags: Record<string, boolean> };
    const roleId = `ROLE-${auth.activeOrgId}-${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
    await router.postgres
      .getPrimaryPool(auth.shardId)
      .query(
        `INSERT INTO roles (role_id, org_id, name, flags) VALUES ($1, $2, $3, $4::jsonb)
         ON CONFLICT (org_id, name) DO UPDATE SET flags = EXCLUDED.flags`,
        [roleId, auth.activeOrgId, name, JSON.stringify(flags)],
      );
    await router.redis.invalidate(auth.activeOrgId, 'rbac', auth.userId);
    res.status(201).json({ roleId, name, flags });
  });

  // Field Evidence Upload (forwards to Storage Service with Master Key + dispatches AI analysis)
  app.post(
    '/api/v1/projects/:projectId/tasks/:taskId/evidence',
    authMiddleware,
    upload.single('file'),
    async (req: AuthedRequest, res: Response) => {
      const auth = req.auth!;
      const projectId = String(req.params.projectId);
      const taskId = String(req.params.taskId);
      const { ownerOrgId } = await resolveProjectAccess(auth.userId, auth.activeOrgId, projectId);

      let uploadedFile: Record<string, unknown> | null = null;
      if (req.file) {
        const form = new FormData();
        form.append(
          'file',
          new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype }),
          req.file.originalname,
        );
        form.append('projectId', projectId);
        form.append('orgId', ownerOrgId);
        form.append('taskId', taskId);
        form.append('uploadedBy', auth.userId);
        form.append('tags', req.body.tags ?? '["field-evidence"]');

        const storageResp = await fetch(`${STORAGE_HTTP_URL}/api/v1/storage/upload`, {
          method: 'POST',
          headers: {
            'x-master-storage-key': MASTER_STORAGE_KEY,
            'x-bucket-name': req.body.bucket ?? 'nexora-media',
          },
          body: form,
        });
        uploadedFile = (await storageResp.json()) as Record<string, unknown>;
      }

      if (mqChannel) {
        mqChannel.sendToQueue(
          'ai_jobs',
          Buffer.from(
            JSON.stringify({
              orgId: ownerOrgId,
              projectId,
              taskId,
              userId: auth.userId,
              textNote: req.body.textNote ?? '',
              fileId: uploadedFile?.fileId ?? null,
              mimeType: req.file?.mimetype ?? 'text/plain',
            }),
          ),
          { persistent: true },
        );
      }

      res.status(202).json({ accepted: true, file: uploadedFile, aiQueued: Boolean(mqChannel) });
    },
  );

  // Client-safe Signed File URL
  app.get('/api/v1/projects/:projectId/files/:fileId/signed-url', authMiddleware, async (req: AuthedRequest, res) => {
    const auth = req.auth!;
    const projectId = String(req.params.projectId);
    const fileId = String(req.params.fileId);
    const { ownerOrgId } = await resolveProjectAccess(auth.userId, auth.activeOrgId, projectId);
    const result = await grpcCall(storageClient.MintSignedClientUrl.bind(storageClient), {
      file_id: fileId,
      org_id: ownerOrgId,
      project_id: projectId,
      user_id: auth.userId,
      ttl_seconds: 600,
    });
    res.json(result);
  });

  const server = http.createServer(app);
  const io = new SocketIOServer(server, { cors: { origin: '*' } });

  try {
    const pubClient = router.redis.getGlobalClient();
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
  } catch {
    console.warn('[api-gateway] Redis Socket.IO adapter unavailable, running single-node WS');
  }

  io.on('connection', (socket) => {
    socket.on('join:project', ({ projectId }: { projectId: string }) => {
      socket.join(`project:${projectId}`);
    });
    socket.on('transit:ping', (payload: { projectId: string; taskId: string; lat: number; lng: number }) => {
      io.to(`project:${payload.projectId}`).emit('transit:update', { ...payload, ts: Date.now() });
    });
  });

  server.listen(PORT, () => console.log(`[api-gateway] GraphQL + REST + WS listening on :${PORT}`));
}

bootstrap();
