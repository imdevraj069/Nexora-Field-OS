import {
  PERMISSION_FLAGS,
  RolePermissionContext,
  generatePrefixedId,
  hasPermission,
} from '@nexora/shared-types';
import { dataRouter, gatewayEnv, getGatewayMqChannel } from '../config/env';
import { AuthContext } from '../middlewares/auth';
import { aiClient, grpcCall, identityClient, storageClient } from '../grpc/clients';
import { AppError } from '../utils/http';

export const ProjectService = {
  async resolveAccess(userId: string, userOrgId: string, projectId: string) {
    const access = await grpcCall(identityClient.GetUserProjectAccess.bind(identityClient), {
      user_id: userId,
      user_org_id: userOrgId,
      project_id: projectId,
    });
    if (!access.allowed) {
      throw new AppError(403, 'Forbidden: no access to requested project');
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
  },

  async listProjects(auth: AuthContext) {
    const homePool = dataRouter.postgres.getReadPool(auth.shardId);
    const homeProjects = await homePool.query(
      `SELECT project_id, org_id, title, status FROM projects WHERE org_id = $1 ORDER BY created_at DESC`,
      [auth.activeOrgId],
    );
    const collabRows = await dataRouter.postgres
      .getGlobalPool()
      .query(`SELECT project_id, owner_org_id, owner_shard_id FROM project_collaborators WHERE user_id = $1`, [
        auth.userId,
      ]);

    const sharedProjects = await Promise.all(
      collabRows.rows.map(async (c) => {
        const p = dataRouter.postgres.getReadPool(c.owner_shard_id);
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

  async getProjectTree(auth: AuthContext, projectId: string) {
    const { ownerShardId } = await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    const pool = dataRouter.postgres.getReadPool(ownerShardId);
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
       FROM tasks t LEFT JOIN task_efficiency_scores s ON s.task_id = t.task_id WHERE t.project_id = $1`,
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

  async createProject(auth: AuthContext, title: string, description?: string) {
    const pool = dataRouter.postgres.getPrimaryPool(auth.shardId);
    const projectId = generatePrefixedId('PRJ');
    await pool.query(
      `INSERT INTO projects (project_id, org_id, title, description, status, created_by)
       VALUES ($1, $2, $3, $4, 'ACTIVE', $5)`,
      [projectId, auth.activeOrgId, title, description ?? null, auth.userId],
    );
    return { projectId, orgId: auth.activeOrgId, title, status: 'ACTIVE', stages: [] };
  },

  async createStage(auth: AuthContext, projectId: string, name: string, orderIndex: number) {
    const { ownerOrgId, ownerShardId, roleCtx } = await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    if (!hasPermission(roleCtx, PERMISSION_FLAGS.STAGE_MANAGE_ALL)) {
      throw new AppError(403, 'Forbidden: requires stage.manage_all');
    }
    const stageId = generatePrefixedId('STG');
    await dataRouter.postgres
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

  async createTask(
    auth: AuthContext,
    args: { projectId: string; stageId: string; title: string; taskType?: string; assignedUserId?: string; deadline?: string },
  ) {
    const { ownerOrgId, ownerShardId, roleCtx } = await this.resolveAccess(
      auth.userId,
      auth.activeOrgId,
      args.projectId,
    );
    if (!hasPermission(roleCtx, PERMISSION_FLAGS.TASK_CREATE_ASSIGN, args.stageId)) {
      throw new AppError(403, 'Forbidden: requires task.create_assign');
    }
    const taskId = generatePrefixedId('TSK');
    await dataRouter.postgres.getPrimaryPool(ownerShardId).query(
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

  async invitePartnerOrg(
    auth: AuthContext,
    args: { projectId: string; partnerOrgId: string; userId: string; roleName: string; allocatedStageIds: string[] },
  ) {
    const { ownerOrgId, ownerShardId, roleCtx } = await this.resolveAccess(
      auth.userId,
      auth.activeOrgId,
      args.projectId,
    );
    if (!hasPermission(roleCtx, PERMISSION_FLAGS.ORG_INVITE_PARTNER_ORGS)) {
      throw new AppError(403, 'Forbidden: requires org.invite_partner_orgs');
    }
    const partnerFlags = {
      [PERMISSION_FLAGS.STAGE_MANAGE_ALLOCATED_ONLY]: true,
      [PERMISSION_FLAGS.TASK_EXECUTE_OWN]: true,
      [PERMISSION_FLAGS.TASK_UPLOAD_EVIDENCE]: true,
    };
    await dataRouter.postgres.getGlobalPool().query(
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

  async generateAiPlan(auth: AuthContext, prompt: string, industryHint?: string) {
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
    return { suggestedTitle: String(res.suggested_title), summary: String(res.summary), stages };
  },

  async upsertRole(auth: AuthContext, name: string, flags: Record<string, boolean>) {
    const roleId = `ROLE-${auth.activeOrgId}-${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
    await dataRouter.postgres
      .getPrimaryPool(auth.shardId)
      .query(
        `INSERT INTO roles (role_id, org_id, name, flags) VALUES ($1, $2, $3, $4::jsonb)
         ON CONFLICT (org_id, name) DO UPDATE SET flags = EXCLUDED.flags`,
        [roleId, auth.activeOrgId, name, JSON.stringify(flags)],
      );
    await dataRouter.redis.invalidate(auth.activeOrgId, 'rbac', auth.userId);
    return { roleId, name, flags };
  },

  async listRoles(auth: AuthContext) {
    const { rows } = await dataRouter.postgres
      .getReadPool(auth.shardId)
      .query(`SELECT role_id, name, flags, is_system FROM roles WHERE org_id = $1 ORDER BY is_system DESC, name ASC`, [
        auth.activeOrgId,
      ]);
    return rows;
  },

  async submitEvidence(
    auth: AuthContext,
    projectId: string,
    taskId: string,
    body: { tags?: string; bucket?: string; textNote?: string },
    file?: Express.Multer.File,
  ) {
    const { ownerOrgId } = await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    let uploadedFile: Record<string, unknown> | null = null;

    if (file) {
      const form = new FormData();
      form.append('file', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);
      form.append('projectId', projectId);
      form.append('orgId', ownerOrgId);
      form.append('taskId', taskId);
      form.append('uploadedBy', auth.userId);
      form.append('tags', body.tags ?? '["field-evidence"]');

      const storageResp = await fetch(`${gatewayEnv.storageHttpUrl}/api/v1/storage/upload`, {
        method: 'POST',
        headers: {
          'x-master-storage-key': gatewayEnv.masterStorageKey,
          'x-bucket-name': body.bucket ?? 'nexora-media',
        },
        body: form,
      });
      uploadedFile = (await storageResp.json()) as Record<string, unknown>;
    }

    const mqChannel = getGatewayMqChannel();
    if (mqChannel) {
      mqChannel.sendToQueue(
        'ai_jobs',
        Buffer.from(
          JSON.stringify({
            orgId: ownerOrgId,
            projectId,
            taskId,
            userId: auth.userId,
            textNote: body.textNote ?? '',
            fileId: uploadedFile?.fileId ?? null,
            mimeType: file?.mimetype ?? 'text/plain',
          }),
        ),
        { persistent: true },
      );
    }

    return { accepted: true, file: uploadedFile, aiQueued: Boolean(mqChannel) };
  },

  async mintSignedFileUrl(auth: AuthContext, projectId: string, fileId: string) {
    const { ownerOrgId } = await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    return grpcCall(storageClient.MintSignedClientUrl.bind(storageClient), {
      file_id: fileId,
      org_id: ownerOrgId,
      project_id: projectId,
      user_id: auth.userId,
      ttl_seconds: 600,
    });
  },
};
