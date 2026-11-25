import {
  PERMISSION_FLAGS,
  RolePermissionContext,
  canAccessStage,
  generatePrefixedId,
  hasPermission,
} from '@nexora/shared-types';
import { dataRouter, gatewayEnv, getGatewayMqChannel } from '../config/env';
import { AuthContext } from '../middlewares/auth';
import { aiClient, grpcCall, identityClient, storageClient } from '../grpc/clients';
import { AppError } from '../utils/http';

export const ProjectService = {
  async getOrgMemberRoleContext(orgId: string, shardId: 1 | 2 | 3, userId: string): Promise<RolePermissionContext> {
    const pool = dataRouter.postgres.getReadPool(shardId, true);
    const res = await pool.query(
      `SELECT m.allocated_stage_ids, r.name, r.flags
       FROM org_members m
       LEFT JOIN org_member_roles omr ON omr.org_id = m.org_id AND omr.user_id = m.user_id
       JOIN roles r ON r.role_id = COALESCE(omr.role_id, m.role_id)
       WHERE m.org_id = $1 AND m.user_id = $2 AND m.status = 'ACTIVE'`,
      [orgId, userId],
    );
    if (res.rows.length === 0) {
      throw new AppError(403, 'User is not an active member of this organization');
    }
    const mergedFlags: Record<string, boolean> = {};
    for (const row of res.rows) {
      for (const [k, v] of Object.entries((row.flags as Record<string, boolean>) ?? {})) {
        if (v === true) mergedFlags[k] = true;
      }
    }
    return {
      roleName: res.rows.map((r) => r.name).join(', '),
      flags: mergedFlags,
      allocatedStageIds: res.rows[0].allocated_stage_ids ?? [],
      isExternalCollaborator: false,
    };
  },

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
    const homePool = dataRouter.postgres.getReadPool(auth.shardId, true);
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
        const p = dataRouter.postgres.getReadPool(c.owner_shard_id, true);
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
    const { ownerShardId, roleCtx } = await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    const pool = dataRouter.postgres.getReadPool(ownerShardId, true);
    const pr = await pool.query(`SELECT project_id, org_id, title, status FROM projects WHERE project_id = $1`, [
      projectId,
    ]);
    if (pr.rows.length === 0) return null;

    const stages = await pool.query(
      `SELECT stage_id, name, order_index, status FROM stages WHERE project_id = $1 ORDER BY order_index ASC`,
      [projectId],
    );
    const tasks = await pool.query(
      `SELECT t.task_id, t.stage_id, t.title, t.task_type, t.status, t.assigned_user_id, t.deadline, t.completed_at, s.overall_efficiency
       FROM tasks t LEFT JOIN task_efficiency_scores s ON s.task_id = t.task_id WHERE t.project_id = $1`,
      [projectId],
    );

    const visibleStages = stages.rows.filter(
      (st) =>
        canAccessStage(roleCtx, st.stage_id) ||
        (!roleCtx.isExternalCollaborator &&
          tasks.rows.some((t) => t.stage_id === st.stage_id && t.assigned_user_id === auth.userId)),
    );

    return {
      projectId: pr.rows[0].project_id,
      orgId: pr.rows[0].org_id,
      title: pr.rows[0].title,
      status: pr.rows[0].status,
      stages: visibleStages.map((st) => ({
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
            completedAt: t.completed_at ? new Date(t.completed_at).toISOString() : null,
            efficiencyScore: t.overall_efficiency ? Number(t.overall_efficiency) : null,
          })),
      })),
    };
  },

  async createProject(auth: AuthContext, title: string, description?: string) {
    const roleCtx = await this.getOrgMemberRoleContext(auth.activeOrgId, auth.shardId, auth.userId);
    if (!hasPermission(roleCtx, PERMISSION_FLAGS.PROJECT_CREATE)) {
      throw new AppError(403, 'Forbidden: requires project.create');
    }

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

    if (args.assignedUserId) {
      const homeCheck = await dataRouter.postgres
        .getReadPool(ownerShardId, true)
        .query(`SELECT 1 FROM org_members WHERE org_id = $1 AND user_id = $2 AND status = 'ACTIVE'`, [
          ownerOrgId,
          args.assignedUserId,
        ]);
      if (homeCheck.rows.length === 0) {
        const collabCheck = await dataRouter.postgres
          .getGlobalPool()
          .query(`SELECT 1 FROM project_collaborators WHERE project_id = $1 AND user_id = $2`, [
            args.projectId,
            args.assignedUserId,
          ]);
        if (collabCheck.rows.length === 0) {
          throw new AppError(400, `User ${args.assignedUserId} is not a member or project collaborator`);
        }
      }
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
      completedAt: null,
    };
  },

  async updateTaskStatus(
    auth: AuthContext,
    args: { projectId: string; taskId: string; toStatus: string; notes?: string },
  ) {
    const { ownerOrgId, ownerShardId, roleCtx } = await this.resolveAccess(
      auth.userId,
      auth.activeOrgId,
      args.projectId,
    );
    const pool = dataRouter.postgres.getPrimaryPool(ownerShardId);
    const taskRes = await pool.query(
      `SELECT task_id, stage_id, status, assigned_user_id, checklist FROM tasks WHERE task_id = $1 AND project_id = $2`,
      [args.taskId, args.projectId],
    );
    if (taskRes.rows.length === 0) {
      throw new AppError(404, 'Task not found in project');
    }

    const task = taskRes.rows[0];
    const targetStatus = args.toStatus.toUpperCase();
    const isAssignee = task.assigned_user_id === auth.userId;

    if (roleCtx.isExternalCollaborator && !canAccessStage(roleCtx, task.stage_id)) {
      throw new AppError(403, 'Forbidden: stage is not allocated to your partner role');
    }
    if (!roleCtx.isExternalCollaborator && !isAssignee && !canAccessStage(roleCtx, task.stage_id)) {
      throw new AppError(403, 'Forbidden: stage is not allocated to your role');
    }

    // Strict validation: cannot complete task if checklist items are incomplete
    if (targetStatus === 'COMPLETED' || targetStatus === 'SUBMITTED' || targetStatus === 'VERIFIED') {
      const checklistItems = Array.isArray(task.checklist) ? task.checklist : [];
      const unverified = checklistItems.filter((i: { completed?: boolean; label?: string }) => !i.completed);
      if (unverified.length > 0) {
        throw new AppError(400, `Cannot mark task ${targetStatus}: ${unverified.length} checklist item(s) must be verified and checked first`);
      }
    }

    if (targetStatus === 'VERIFIED' || targetStatus === 'REJECTED') {
      if (!hasPermission(roleCtx, PERMISSION_FLAGS.TASK_VERIFY_APPROVE)) {
        throw new AppError(403, 'Forbidden: requires task.verify_approve');
      }
    } else {
      const canManageStage = hasPermission(roleCtx, PERMISSION_FLAGS.STAGE_MANAGE_ALL, task.stage_id);
      const canExecute = hasPermission(roleCtx, PERMISSION_FLAGS.TASK_EXECUTE_OWN) && isAssignee;
      if (!canManageStage && !canExecute) {
        throw new AppError(403, 'Forbidden: only the assigned user or stage manager can update this task');
      }
    }

    const isDone = targetStatus === 'COMPLETED' || targetStatus === 'SUBMITTED' || targetStatus === 'VERIFIED';
    const updated = await pool.query(
      `UPDATE tasks
       SET status = $1,
           completed_at = CASE WHEN $2 THEN COALESCE(completed_at, NOW()) ELSE completed_at END,
           updated_at = NOW()
       WHERE task_id = $3
       RETURNING task_id, stage_id, title, task_type, status, assigned_user_id, deadline, completed_at, checklist, file_requirements, text_inputs`,
      [targetStatus, isDone, args.taskId],
    );

    await pool.query(
      `INSERT INTO workflow_transitions (org_id, project_id, entity_type, entity_id, from_status, to_status, actor_user_id, notes)
       VALUES ($1, $2, 'TASK', $3, $4, $5, $6, $7)`,
      [ownerOrgId, args.projectId, args.taskId, task.status, targetStatus, auth.userId, args.notes ?? null],
    );

    const row = updated.rows[0];
    return {
      taskId: row.task_id,
      stageId: row.stage_id,
      title: row.title,
      taskType: row.task_type,
      status: row.status,
      assignedUserId: row.assigned_user_id,
      deadline: row.deadline ? new Date(row.deadline).toISOString() : null,
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
      checklist: row.checklist,
      fileRequirements: row.file_requirements,
      textInputs: row.text_inputs,
    };
  },

  async updateTaskChecklist(
    auth: AuthContext,
    args: {
      projectId: string;
      taskId: string;
      checklist?: Array<{ id: string; label: string; completed: boolean; required?: boolean }>;
      fileRequirements?: Array<{ id: string; label: string; required?: boolean; fileType?: string; fileId?: string }>;
      textInputs?: Record<string, string>;
    },
  ) {
    const { ownerShardId } = await this.resolveAccess(auth.userId, auth.activeOrgId, args.projectId);
    const pool = dataRouter.postgres.getPrimaryPool(ownerShardId);

    const res = await pool.query(
      `UPDATE tasks
       SET checklist = COALESCE($1::jsonb, checklist),
           file_requirements = COALESCE($2::jsonb, file_requirements),
           text_inputs = COALESCE($3::jsonb, text_inputs),
           updated_at = NOW()
       WHERE task_id = $4 AND project_id = $5
       RETURNING task_id, stage_id, title, status, checklist, file_requirements, text_inputs`,
      [
        args.checklist ? JSON.stringify(args.checklist) : null,
        args.fileRequirements ? JSON.stringify(args.fileRequirements) : null,
        args.textInputs ? JSON.stringify(args.textInputs) : null,
        args.taskId,
        args.projectId,
      ],
    );

    if (res.rows.length === 0) {
      throw new AppError(404, 'Task not found in project');
    }
    const r = res.rows[0];
    return {
      taskId: r.task_id,
      stageId: r.stage_id,
      title: r.title,
      status: r.status,
      checklist: r.checklist,
      fileRequirements: r.file_requirements,
      textInputs: r.text_inputs,
    };
  },

  async analyzeProjectProgress(auth: AuthContext, projectId: string) {
    const { ownerOrgId } = await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    const result = await grpcCall(aiClient.AnalyzeProjectProgress.bind(aiClient), {
      org_id: ownerOrgId,
      project_id: projectId,
      user_id: auth.userId,
    });
    return result;
  },

  async invitePartnerOrg(
    auth: AuthContext,
    args: {
      projectId: string;
      partnerOrgId: string;
      userId: string;
      roleName: string;
      allocatedStageIds: string[];
    },
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
    const roleCtx = await this.getOrgMemberRoleContext(auth.activeOrgId, auth.shardId, auth.userId);
    if (!hasPermission(roleCtx, PERMISSION_FLAGS.ORG_MANAGE_ROLES)) {
      throw new AppError(403, 'Forbidden: requires org.manage_roles');
    }
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
      .getReadPool(auth.shardId, true)
      .query(`SELECT role_id, name, flags, is_system FROM roles WHERE org_id = $1 ORDER BY is_system DESC, name ASC`, [
        auth.activeOrgId,
      ]);
    return rows;
  },

  async listOrgMembers(auth: AuthContext) {
    const shardPool = dataRouter.postgres.getReadPool(auth.shardId, true);
    const { rows } = await shardPool.query(
      `SELECT m.user_id, m.status, m.allocated_stage_ids,
              COALESCE(array_agg(r.role_id) FILTER (WHERE r.role_id IS NOT NULL), '{}') AS role_ids,
              COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS role_names
       FROM org_members m
       LEFT JOIN org_member_roles omr ON omr.org_id = m.org_id AND omr.user_id = m.user_id
       LEFT JOIN roles r ON r.role_id = COALESCE(omr.role_id, m.role_id)
       WHERE m.org_id = $1
       GROUP BY m.user_id, m.status, m.allocated_stage_ids`,
      [auth.activeOrgId],
    );

    const userIds = rows.map((r) => r.user_id);
    if (userIds.length === 0) return [];
    const userRes = await dataRouter.postgres
      .getGlobalPool()
      .query(`SELECT user_id, email, full_name, is_verified FROM users WHERE user_id = ANY($1)`, [userIds]);
    const userMap = new Map(userRes.rows.map((u) => [u.user_id, u]));

    return rows.map((r) => ({
      userId: r.user_id,
      email: userMap.get(r.user_id)?.email ?? null,
      fullName: userMap.get(r.user_id)?.full_name ?? null,
      status: r.status,
      roleIds: r.role_ids,
      roleNames: r.role_names,
      allocatedStageIds: r.allocated_stage_ids,
    }));
  },

  async assignRolesToMember(
    auth: AuthContext,
    targetUserId: string,
    roleIds: string[],
    allocatedStageIds?: string[],
  ) {
    const roleCtx = await this.getOrgMemberRoleContext(auth.activeOrgId, auth.shardId, auth.userId);
    if (!hasPermission(roleCtx, PERMISSION_FLAGS.ORG_MANAGE_ROLES)) {
      throw new AppError(403, 'Forbidden: requires org.manage_roles');
    }
    if (!roleIds || roleIds.length === 0) {
      throw new AppError(400, 'At least one roleId must be provided');
    }

    const pool = dataRouter.postgres.getPrimaryPool(auth.shardId);
    const validRoles = await pool.query(
      `SELECT role_id FROM roles WHERE org_id = $1 AND role_id = ANY($2)`,
      [auth.activeOrgId, roleIds],
    );
    if (validRoles.rows.length !== roleIds.length) {
      throw new AppError(400, 'One or more roleIds do not belong to this organization');
    }

    await pool.query(
      `UPDATE org_members
       SET role_id = $1,
           allocated_stage_ids = COALESCE($2::jsonb, allocated_stage_ids)
       WHERE org_id = $3 AND user_id = $4`,
      [roleIds[0], allocatedStageIds ? JSON.stringify(allocatedStageIds) : null, auth.activeOrgId, targetUserId],
    );
    await pool.query(`DELETE FROM org_member_roles WHERE org_id = $1 AND user_id = $2`, [
      auth.activeOrgId,
      targetUserId,
    ]);
    for (const rId of roleIds) {
      await pool.query(
        `INSERT INTO org_member_roles (org_id, user_id, role_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [auth.activeOrgId, targetUserId, rId],
      );
    }

    await dataRouter.redis.invalidate(auth.activeOrgId, 'rbac', targetUserId);
    return { userId: targetUserId, orgId: auth.activeOrgId, roleIds, allocatedStageIds: allocatedStageIds ?? [] };
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
