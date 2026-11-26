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
import { emitProjectEvent } from '../ws/socketServer';

export interface WorkflowStatusDef {
  key: string;
  label: string;
  color: string;
  category: 'OPEN' | 'ACTIVE' | 'DONE';
  order: number;
}

export const DEFAULT_WORKFLOW_STATUSES: WorkflowStatusDef[] = [
  { key: 'TODO', label: 'To Do', color: '#71717a', category: 'OPEN', order: 1 },
  { key: 'IN_PROGRESS', label: 'In Progress', color: '#f59e0b', category: 'ACTIVE', order: 2 },
  { key: 'IN_REVIEW', label: 'In Review', color: '#f97316', category: 'ACTIVE', order: 3 },
  { key: 'DONE', label: 'Done', color: '#10b981', category: 'DONE', order: 4 },
];

function resolveStatuses(raw: unknown, orgRaw?: unknown): WorkflowStatusDef[] {
  if (Array.isArray(raw) && raw.length > 0) return raw as WorkflowStatusDef[];
  if (Array.isArray(orgRaw) && orgRaw.length > 0) return orgRaw as WorkflowStatusDef[];
  return DEFAULT_WORKFLOW_STATUSES;
}

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
      const orgCollab = await dataRouter.postgres.getGlobalPool().query(
        `SELECT owner_org_id, owner_shard_id, allocated_stage_ids
         FROM project_org_collaborations
         WHERE project_id = $1 AND partner_org_id = $2 AND status = 'ACCEPTED'`,
        [projectId, userOrgId],
      );
      if (orgCollab.rows.length > 0) {
        const c = orgCollab.rows[0];
        return {
          ownerOrgId: String(c.owner_org_id),
          ownerShardId: Number(c.owner_shard_id) as 1 | 2 | 3,
          roleCtx: {
            roleName: 'Partner Organization',
            flags: {
              [PERMISSION_FLAGS.STAGE_MANAGE_ALLOCATED_ONLY]: true,
              [PERMISSION_FLAGS.TASK_EXECUTE_OWN]: true,
              [PERMISSION_FLAGS.TASK_UPLOAD_EVIDENCE]: true,
              [PERMISSION_FLAGS.ORG_INVITE_PARTNER_ORGS]: true,
            },
            allocatedStageIds: Array.isArray(c.allocated_stage_ids) ? (c.allocated_stage_ids as string[]) : [],
            isExternalCollaborator: true,
          },
        };
      }
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

  async getMyContext(auth: AuthContext) {
    const roleCtx = await this.getOrgMemberRoleContext(auth.activeOrgId, auth.shardId, auth.userId);
    const pool = dataRouter.postgres.getReadPool(auth.shardId, true);
    const orgRes = await pool.query(`SELECT default_workflow_statuses FROM organizations WHERE org_id = $1`, [
      auth.activeOrgId,
    ]);
    return {
      userId: auth.userId,
      activeOrgId: auth.activeOrgId,
      roleName: roleCtx.roleName,
      flags: roleCtx.flags,
      allocatedStageIds: roleCtx.allocatedStageIds,
      defaultWorkflowStatuses: resolveStatuses(orgRes.rows[0]?.default_workflow_statuses),
    };
  },

  async getOrgWorkflowStatuses(auth: AuthContext) {
    const pool = dataRouter.postgres.getReadPool(auth.shardId, true);
    const res = await pool.query(`SELECT default_workflow_statuses FROM organizations WHERE org_id = $1`, [
      auth.activeOrgId,
    ]);
    return resolveStatuses(res.rows[0]?.default_workflow_statuses);
  },

  async updateOrgWorkflowStatuses(auth: AuthContext, statuses: WorkflowStatusDef[]) {
    const roleCtx = await this.getOrgMemberRoleContext(auth.activeOrgId, auth.shardId, auth.userId);
    if (!hasPermission(roleCtx, PERMISSION_FLAGS.ORG_MANAGE_SETTINGS)) {
      throw new AppError(403, 'Forbidden: requires org.manage_settings');
    }
    if (!Array.isArray(statuses) || statuses.length === 0) {
      throw new AppError(400, 'At least one workflow status is required');
    }
    await dataRouter.postgres
      .getPrimaryPool(auth.shardId)
      .query(`UPDATE organizations SET default_workflow_statuses = $1::jsonb WHERE org_id = $2`, [
        JSON.stringify(statuses),
        auth.activeOrgId,
      ]);
    return statuses;
  },

  async listProjects(auth: AuthContext) {
    const homePool = dataRouter.postgres.getReadPool(auth.shardId, true);
    const orgRow = await homePool.query(`SELECT default_workflow_statuses FROM organizations WHERE org_id = $1`, [
      auth.activeOrgId,
    ]);
    const orgStatuses = orgRow.rows[0]?.default_workflow_statuses;

    const homeProjects = await homePool.query(
      `SELECT p.project_id, p.org_id, p.title, p.description, p.status, p.manager_user_id, p.lead_brief, p.workflow_statuses, p.start_date, p.target_end_date, p.created_at,
              (SELECT COUNT(*)::int FROM stages s WHERE s.project_id = p.project_id) AS stages_count,
              (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.project_id) AS tasks_count,
              (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.project_id AND t.status IN ('DONE', 'COMPLETED', 'VERIFIED', 'SUBMITTED')) AS completed_tasks_count
       FROM projects p WHERE p.org_id = $1 ORDER BY p.created_at DESC`,
      [auth.activeOrgId],
    );
    const collabRows = await dataRouter.postgres
      .getGlobalPool()
      .query(
        `SELECT project_id, owner_org_id, owner_shard_id FROM project_collaborators WHERE user_id = $1
         UNION
         SELECT project_id, owner_org_id, owner_shard_id FROM project_org_collaborations WHERE partner_org_id = $2 AND status = 'ACCEPTED'`,
        [auth.userId, auth.activeOrgId],
      );

    const seenIds = new Set(homeProjects.rows.map((r) => r.project_id));
    const sharedProjects = await Promise.all(
      collabRows.rows
        .filter((c) => !seenIds.has(c.project_id))
        .map(async (c) => {
          const p = dataRouter.postgres.getReadPool(c.owner_shard_id, true);
          const r = await p.query(
            `SELECT p.project_id, p.org_id, p.title, p.description, p.status, p.manager_user_id, p.lead_brief, p.workflow_statuses, p.start_date, p.target_end_date, p.created_at,
                    (SELECT COUNT(*)::int FROM stages s WHERE s.project_id = p.project_id) AS stages_count,
                    (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.project_id) AS tasks_count,
                    (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.project_id AND t.status IN ('DONE', 'COMPLETED', 'VERIFIED', 'SUBMITTED')) AS completed_tasks_count
             FROM projects p WHERE p.project_id = $1`,
            [c.project_id],
          );
          return r.rows[0];
        }),
    );

    return [...homeProjects.rows, ...sharedProjects.filter(Boolean)].map((p) => ({
      projectId: p.project_id,
      orgId: p.org_id,
      title: p.title,
      description: p.description ?? '',
      status: p.status,
      managerUserId: p.manager_user_id ?? null,
      leadBrief: p.lead_brief ?? '',
      workflowStatuses: resolveStatuses(p.workflow_statuses, orgStatuses),
      startDate: p.start_date ? new Date(p.start_date).toISOString().slice(0, 10) : null,
      targetEndDate: p.target_end_date ? new Date(p.target_end_date).toISOString().slice(0, 10) : null,
      createdAt: p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString(),
      stagesCount: Number(p.stages_count ?? 0),
      tasksCount: Number(p.tasks_count ?? 0),
      completedTasksCount: Number(p.completed_tasks_count ?? 0),
      stages: [],
    }));
  },

  async getProjectTree(auth: AuthContext, projectId: string) {
    const { ownerOrgId, ownerShardId, roleCtx } = await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    const pool = dataRouter.postgres.getReadPool(ownerShardId, true);
    const orgRow = await pool.query(`SELECT default_workflow_statuses FROM organizations WHERE org_id = $1`, [ownerOrgId]);
    const pr = await pool.query(
      `SELECT project_id, org_id, title, description, status, manager_user_id, lead_brief, workflow_statuses, start_date, target_end_date, created_at
       FROM projects WHERE project_id = $1`,
      [projectId],
    );
    if (pr.rows.length === 0) return null;

    const stages = await pool.query(
      `SELECT stage_id, name, order_index, status, deadline FROM stages WHERE project_id = $1 ORDER BY order_index ASC`,
      [projectId],
    );
    const tasks = await pool.query(
      `SELECT t.task_id, t.stage_id, t.title, t.description, t.task_type, t.status, t.assigned_user_id, t.deadline, t.completed_at, t.checklist, t.file_requirements, t.text_inputs, s.overall_efficiency
       FROM tasks t LEFT JOIN task_efficiency_scores s ON s.task_id = t.task_id WHERE t.project_id = $1 ORDER BY t.created_at ASC`,
      [projectId],
    );

    const collabRes = await dataRouter.postgres
      .getGlobalPool()
      .query(
        `SELECT c.partner_org_id, c.user_id, c.project_role_name, c.allocated_stage_ids, u.full_name, u.email
         FROM project_collaborators c LEFT JOIN users u ON u.user_id = c.user_id WHERE c.project_id = $1`,
        [projectId],
      );

    const visibleStages = stages.rows.filter(
      (st) =>
        canAccessStage(roleCtx, st.stage_id) ||
        (!roleCtx.isExternalCollaborator &&
          tasks.rows.some((t) => t.stage_id === st.stage_id && t.assigned_user_id === auth.userId)),
    );

    const row = pr.rows[0];
    return {
      projectId: row.project_id,
      orgId: row.org_id,
      title: row.title,
      description: row.description ?? '',
      status: row.status,
      managerUserId: row.manager_user_id ?? null,
      leadBrief: row.lead_brief ?? '',
      workflowStatuses: resolveStatuses(row.workflow_statuses, orgRow.rows[0]?.default_workflow_statuses),
      startDate: row.start_date ? new Date(row.start_date).toISOString().slice(0, 10) : null,
      targetEndDate: row.target_end_date ? new Date(row.target_end_date).toISOString().slice(0, 10) : null,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      collaborators: collabRes.rows,
      stages: visibleStages.map((st) => ({
        stageId: st.stage_id,
        name: st.name,
        orderIndex: st.order_index,
        status: st.status,
        deadline: st.deadline ? new Date(st.deadline).toISOString().slice(0, 10) : null,
        tasks: tasks.rows
          .filter((t) => t.stage_id === st.stage_id)
          .map((t) => ({
            taskId: t.task_id,
            stageId: t.stage_id,
            projectId,
            title: t.title,
            description: t.description ?? '',
            taskType: t.task_type,
            status: t.status,
            assignedUserId: t.assigned_user_id,
            deadline: t.deadline ? new Date(t.deadline).toISOString() : null,
            completedAt: t.completed_at ? new Date(t.completed_at).toISOString() : null,
            efficiencyScore: t.overall_efficiency ? Number(t.overall_efficiency) : null,
            checklist: t.checklist ?? [],
            fileRequirements: t.file_requirements ?? [],
            textInputs: t.text_inputs ?? {},
          })),
      })),
    };
  },

  async createProject(
    auth: AuthContext,
    title: string,
    description?: string,
    options?: {
      managerUserId?: string;
      leadBrief?: string;
      startDate?: string;
      targetEndDate?: string;
      stages?: Array<{ name: string; deadline?: string }>;
      workflowStatuses?: WorkflowStatusDef[];
    },
  ) {
    const roleCtx = await this.getOrgMemberRoleContext(auth.activeOrgId, auth.shardId, auth.userId);
    if (!hasPermission(roleCtx, PERMISSION_FLAGS.PROJECT_CREATE)) {
      throw new AppError(403, 'Forbidden: requires project.create');
    }

    const pool = dataRouter.postgres.getPrimaryPool(auth.shardId);
    const orgRow = await pool.query(`SELECT default_workflow_statuses FROM organizations WHERE org_id = $1`, [
      auth.activeOrgId,
    ]);
    const initialStatuses = resolveStatuses(options?.workflowStatuses, orgRow.rows[0]?.default_workflow_statuses);
    const projectId = generatePrefixedId('PRJ');

    await pool.query(
      `INSERT INTO projects (project_id, org_id, title, description, status, manager_user_id, lead_brief, workflow_statuses, start_date, target_end_date, created_by)
       VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $6, $7::jsonb, $8, $9, $10)`,
      [
        projectId,
        auth.activeOrgId,
        title,
        description ?? null,
        options?.managerUserId || auth.userId,
        options?.leadBrief ?? null,
        JSON.stringify(initialStatuses),
        options?.startDate || null,
        options?.targetEndDate || null,
        auth.userId,
      ],
    );

    const createdStages: Array<{ stageId: string; name: string; orderIndex: number; status: string; tasks: unknown[] }> = [];
    const customStages = options?.stages ?? [];
    for (let i = 0; i < customStages.length; i++) {
      const s = customStages[i];
      if (!s.name?.trim()) continue;
      const stageId = generatePrefixedId('STG');
      await pool.query(
        `INSERT INTO stages (stage_id, project_id, org_id, name, order_index, deadline) VALUES ($1, $2, $3, $4, $5, $6)`,
        [stageId, projectId, auth.activeOrgId, s.name.trim(), i + 1, s.deadline || null],
      );
      createdStages.push({ stageId, name: s.name.trim(), orderIndex: i + 1, status: 'PENDING', tasks: [] });
    }

    emitProjectEvent(projectId, 'project:updated', { projectId, action: 'CREATED' });
    return {
      projectId,
      orgId: auth.activeOrgId,
      title,
      description: description ?? '',
      status: 'ACTIVE',
      managerUserId: options?.managerUserId || auth.userId,
      leadBrief: options?.leadBrief ?? '',
      workflowStatuses: initialStatuses,
      stages: createdStages,
    };
  },

  async updateProject(
    auth: AuthContext,
    projectId: string,
    updates: {
      title?: string;
      description?: string;
      status?: string;
      managerUserId?: string;
      leadBrief?: string;
      startDate?: string | null;
      targetEndDate?: string | null;
      workflowStatuses?: WorkflowStatusDef[];
    },
  ) {
    const { ownerShardId, roleCtx } = await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    if (!hasPermission(roleCtx, PERMISSION_FLAGS.PROJECT_MANAGE) && !hasPermission(roleCtx, PERMISSION_FLAGS.ORG_MANAGE_SETTINGS)) {
      throw new AppError(403, 'Forbidden: requires project.manage');
    }
    const pool = dataRouter.postgres.getPrimaryPool(ownerShardId);
    const res = await pool.query(
      `UPDATE projects
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           manager_user_id = COALESCE($4, manager_user_id),
           lead_brief = COALESCE($5, lead_brief),
           workflow_statuses = COALESCE($6::jsonb, workflow_statuses),
           start_date = COALESCE($7::date, start_date),
           target_end_date = COALESCE($8::date, target_end_date),
           updated_at = NOW()
       WHERE project_id = $9
       RETURNING project_id, title, description, status, manager_user_id, lead_brief, workflow_statuses`,
      [
        updates.title ?? null,
        updates.description ?? null,
        updates.status ?? null,
        updates.managerUserId ?? null,
        updates.leadBrief ?? null,
        updates.workflowStatuses ? JSON.stringify(updates.workflowStatuses) : null,
        updates.startDate ?? null,
        updates.targetEndDate ?? null,
        projectId,
      ],
    );
    if (res.rows.length === 0) throw new AppError(404, 'Project not found');
    emitProjectEvent(projectId, 'project:updated', { projectId, action: 'UPDATED' });
    return res.rows[0];
  },

  async deleteProject(auth: AuthContext, projectId: string) {
    const { ownerShardId, roleCtx } = await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    if (!hasPermission(roleCtx, PERMISSION_FLAGS.PROJECT_MANAGE)) {
      throw new AppError(403, 'Forbidden: requires project.manage');
    }
    await dataRouter.postgres.getPrimaryPool(ownerShardId).query(`DELETE FROM projects WHERE project_id = $1`, [projectId]);
    return { deleted: true, projectId };
  },

  async createStage(auth: AuthContext, projectId: string, name: string, orderIndex: number, deadline?: string) {
    const { ownerOrgId, ownerShardId, roleCtx } = await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    if (!hasPermission(roleCtx, PERMISSION_FLAGS.STAGE_MANAGE_ALL)) {
      throw new AppError(403, 'Forbidden: requires stage.manage_all');
    }
    const stageId = generatePrefixedId('STG');
    await dataRouter.postgres
      .getPrimaryPool(ownerShardId)
      .query(`INSERT INTO stages (stage_id, project_id, org_id, name, order_index, deadline) VALUES ($1, $2, $3, $4, $5, $6)`, [
        stageId,
        projectId,
        ownerOrgId,
        name,
        orderIndex,
        deadline || null,
      ]);
    emitProjectEvent(projectId, 'project:updated', { projectId, action: 'STAGE_CREATED', stageId });
    return { stageId, name, orderIndex, status: 'PENDING', deadline: deadline || null, tasks: [] };
  },

  async updateStage(
    auth: AuthContext,
    projectId: string,
    stageId: string,
    updates: { name?: string; status?: string; orderIndex?: number; deadline?: string | null },
  ) {
    const { ownerShardId, roleCtx } = await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    if (!hasPermission(roleCtx, PERMISSION_FLAGS.STAGE_MANAGE_ALL, stageId)) {
      throw new AppError(403, 'Forbidden: requires stage.manage_all');
    }
    const res = await dataRouter.postgres.getPrimaryPool(ownerShardId).query(
      `UPDATE stages
       SET name = COALESCE($1, name),
           status = COALESCE($2, status),
           order_index = COALESCE($3, order_index),
           deadline = COALESCE($4::timestamptz, deadline)
       WHERE stage_id = $5 AND project_id = $6
       RETURNING stage_id, name, order_index, status, deadline`,
      [updates.name ?? null, updates.status ?? null, updates.orderIndex ?? null, updates.deadline ?? null, stageId, projectId],
    );
    if (res.rows.length === 0) throw new AppError(404, 'Stage not found');
    emitProjectEvent(projectId, 'project:updated', { projectId, action: 'STAGE_UPDATED', stageId });
    return res.rows[0];
  },

  async deleteStage(auth: AuthContext, projectId: string, stageId: string) {
    const { ownerShardId, roleCtx } = await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    if (!hasPermission(roleCtx, PERMISSION_FLAGS.STAGE_MANAGE_ALL)) {
      throw new AppError(403, 'Forbidden: requires stage.manage_all');
    }
    await dataRouter.postgres
      .getPrimaryPool(ownerShardId)
      .query(`DELETE FROM stages WHERE stage_id = $1 AND project_id = $2`, [stageId, projectId]);
    emitProjectEvent(projectId, 'project:updated', { projectId, action: 'STAGE_DELETED', stageId });
    return { deleted: true, stageId };
  },

  async applyAiBlueprint(auth: AuthContext, projectId: string, leadBrief: string) {
    const { ownerOrgId, ownerShardId, roleCtx } = await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    if (!hasPermission(roleCtx, PERMISSION_FLAGS.PROJECT_MANAGE) && !hasPermission(roleCtx, PERMISSION_FLAGS.STAGE_MANAGE_ALL)) {
      throw new AppError(403, 'Forbidden: requires project.manage or stage.manage_all');
    }
    const pool = dataRouter.postgres.getPrimaryPool(ownerShardId);
    await pool.query(`UPDATE projects SET lead_brief = $1, updated_at = NOW() WHERE project_id = $2`, [
      leadBrief,
      projectId,
    ]);

    const plan = await this.generateAiPlan(auth, leadBrief, 'field_operations');
    const existingCountRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM stages WHERE project_id = $1`, [projectId]);
    let idxOffset = Number(existingCountRes.rows[0]?.cnt ?? 0);

    const createdStages: Array<{ stageId: string; name: string }> = [];
    for (const s of plan.stages) {
      idxOffset += 1;
      const stageId = generatePrefixedId('STG');
      await pool.query(
        `INSERT INTO stages (stage_id, project_id, org_id, name, order_index) VALUES ($1, $2, $3, $4, $5)`,
        [stageId, projectId, ownerOrgId, s.name, idxOffset],
      );
      createdStages.push({ stageId, name: s.name });
    }
    emitProjectEvent(projectId, 'project:updated', { projectId, action: 'BLUEPRINT_APPLIED' });
    return { leadBrief, plan, createdStages };
  },

  async listTasks(auth: AuthContext, filters: { projectId?: string; assignedToMe?: boolean }) {
    const pool = dataRouter.postgres.getReadPool(auth.shardId, true);
    const params: unknown[] = [auth.activeOrgId];
    let where = `t.org_id = $1`;
    if (filters.projectId) {
      params.push(filters.projectId);
      where += ` AND t.project_id = $${params.length}`;
    }
    if (filters.assignedToMe) {
      params.push(auth.userId);
      where += ` AND t.assigned_user_id = $${params.length}`;
    }

    const res = await pool.query(
      `SELECT t.task_id, t.stage_id, t.project_id, t.title, t.description, t.task_type, t.status,
              t.assigned_user_id, t.deadline, t.completed_at, t.checklist, t.file_requirements, t.text_inputs,
              s.name AS stage_name, p.title AS project_title, e.overall_efficiency
       FROM tasks t
       JOIN stages s ON s.stage_id = t.stage_id
       JOIN projects p ON p.project_id = t.project_id
       LEFT JOIN task_efficiency_scores e ON e.task_id = t.task_id
       WHERE ${where}
       ORDER BY t.created_at DESC`,
      params,
    );

    return res.rows.map((r) => ({
      taskId: r.task_id,
      stageId: r.stage_id,
      projectId: r.project_id,
      stageName: r.stage_name,
      projectTitle: r.project_title,
      title: r.title,
      description: r.description ?? '',
      taskType: r.task_type,
      status: r.status,
      assignedUserId: r.assigned_user_id,
      deadline: r.deadline ? new Date(r.deadline).toISOString() : null,
      completedAt: r.completed_at ? new Date(r.completed_at).toISOString() : null,
      efficiencyScore: r.overall_efficiency ? Number(r.overall_efficiency) : null,
      checklist: r.checklist ?? [],
      fileRequirements: r.file_requirements ?? [],
      textInputs: r.text_inputs ?? {},
    }));
  },

  async getTaskById(auth: AuthContext, taskId: string) {
    const pool = dataRouter.postgres.getReadPool(auth.shardId, true);
    const res = await pool.query(
      `SELECT t.*, s.name AS stage_name, p.title AS project_title, e.overall_efficiency
       FROM tasks t
       JOIN stages s ON s.stage_id = t.stage_id
       JOIN projects p ON p.project_id = t.project_id
       LEFT JOIN task_efficiency_scores e ON e.task_id = t.task_id
       WHERE t.task_id = $1 AND t.org_id = $2`,
      [taskId, auth.activeOrgId],
    );
    if (res.rows.length === 0) throw new AppError(404, 'Task not found');
    const r = res.rows[0];
    const transitions = await pool.query(
      `SELECT transition_id, from_status, to_status, actor_user_id, notes, created_at
       FROM workflow_transitions WHERE entity_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [taskId],
    );
    return {
      taskId: r.task_id,
      stageId: r.stage_id,
      projectId: r.project_id,
      stageName: r.stage_name,
      projectTitle: r.project_title,
      title: r.title,
      description: r.description ?? '',
      taskType: r.task_type,
      status: r.status,
      assignedUserId: r.assigned_user_id,
      deadline: r.deadline ? new Date(r.deadline).toISOString() : null,
      completedAt: r.completed_at ? new Date(r.completed_at).toISOString() : null,
      efficiencyScore: r.overall_efficiency ? Number(r.overall_efficiency) : null,
      checklist: r.checklist ?? [],
      fileRequirements: r.file_requirements ?? [],
      textInputs: r.text_inputs ?? {},
      transitions: transitions.rows,
    };
  },

  async createTask(
    auth: AuthContext,
    args: {
      projectId: string;
      stageId: string;
      title: string;
      description?: string;
      taskType?: string;
      assignedUserId?: string;
      deadline?: string;
      checklist?: Array<{ id: string; label: string; completed: boolean; required?: boolean }>;
      fileRequirements?: Array<{ id: string; label: string; fileType: string; required?: boolean }>;
    },
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
    const checklist = args.checklist ?? [];
    const fileRequirements = args.fileRequirements ?? [];

    await dataRouter.postgres.getPrimaryPool(ownerShardId).query(
      `INSERT INTO tasks (task_id, stage_id, project_id, org_id, title, description, task_type, assigned_user_id, deadline, checklist, file_requirements)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)`,
      [
        taskId,
        args.stageId,
        args.projectId,
        ownerOrgId,
        args.title,
        args.description ?? null,
        args.taskType ?? 'ON_FIELD',
        args.assignedUserId ?? null,
        args.deadline ?? null,
        JSON.stringify(checklist),
        JSON.stringify(fileRequirements),
      ],
    );

    emitProjectEvent(args.projectId, 'task:updated', { taskId, status: 'TODO', action: 'CREATED' });
    return {
      taskId,
      stageId: args.stageId,
      projectId: args.projectId,
      title: args.title,
      description: args.description ?? '',
      taskType: args.taskType ?? 'ON_FIELD',
      status: 'TODO',
      assignedUserId: args.assignedUserId ?? null,
      deadline: args.deadline ?? null,
      completedAt: null,
      checklist,
      fileRequirements,
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
      `SELECT t.task_id, t.stage_id, t.status, t.assigned_user_id, t.checklist, t.file_requirements, p.workflow_statuses
       FROM tasks t JOIN projects p ON p.project_id = t.project_id
       WHERE t.task_id = $1 AND t.project_id = $2`,
      [args.taskId, args.projectId],
    );
    if (taskRes.rows.length === 0) {
      throw new AppError(404, 'Task not found in project');
    }

    const task = taskRes.rows[0];
    const targetStatus = args.toStatus.toUpperCase();
    const isAssignee = task.assigned_user_id === auth.userId;
    const statuses = resolveStatuses(task.workflow_statuses);
    const targetDef = statuses.find((s) => s.key.toUpperCase() === targetStatus);
    const isDoneCategory =
      targetDef?.category === 'DONE' ||
      ['DONE', 'COMPLETED', 'SUBMITTED', 'VERIFIED'].includes(targetStatus);

    if (roleCtx.isExternalCollaborator && !canAccessStage(roleCtx, task.stage_id)) {
      throw new AppError(403, 'Forbidden: stage is not allocated to your partner role');
    }
    if (!roleCtx.isExternalCollaborator && !isAssignee && !canAccessStage(roleCtx, task.stage_id)) {
      throw new AppError(403, 'Forbidden: stage is not allocated to your role');
    }

    // Strict validation: cannot move to DONE/COMPLETED/SUBMITTED/VERIFIED if required checklist or file slots are incomplete
    if (isDoneCategory) {
      const checklistItems = Array.isArray(task.checklist) ? task.checklist : [];
      const unverified = checklistItems.filter((i: {
        completed?: boolean;
        required?: boolean;
        kind?: string;
        value?: unknown;
        selectedOptions?: unknown[];
        fileId?: string;
      }) => {
        if (i.required === false) return false;
        if (!i.completed) return true;
        const kind = (i.kind || 'CHECK').toUpperCase();
        if (['TEXT', 'SHORT_ANSWER', 'FILL_BLANK', 'LINK'].includes(kind)) {
          if (!String(i.value ?? '').trim()) return true;
        }
        if (kind === 'NUMBER') {
          if (i.value === undefined || i.value === null || String(i.value).trim() === '' || isNaN(Number(i.value))) return true;
        }
        if (kind === 'OPTIONS' || kind === 'DROPDOWN') {
          if (!String(i.value ?? '').trim()) return true;
        }
        if (kind === 'MULTI_SELECT') {
          if (!Array.isArray(i.selectedOptions) || i.selectedOptions.length === 0) return true;
        }
        if ((kind === 'FILE' || kind === 'MEDIA') && !i.fileId) return true;
        return false;
      });
      if (unverified.length > 0) {
        throw new AppError(400, `Cannot mark task ${targetStatus}: ${unverified.length} required checklist item(s) need completion/input first`);
      }

      const slots = Array.isArray(task.file_requirements) ? task.file_requirements : [];
      const missingSlots = slots.filter(
        (s: { required?: boolean; uploadedFiles?: unknown[]; fileId?: string }) =>
          s.required !== false && (!Array.isArray(s.uploadedFiles) || s.uploadedFiles.length === 0) && !s.fileId,
      );
      if (missingSlots.length > 0) {
        throw new AppError(400, `Cannot mark task ${targetStatus}: ${missingSlots.length} required file submission slot(s) are empty`);
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

    const updated = await pool.query(
      `UPDATE tasks
       SET status = $1,
           completed_at = CASE WHEN $2 THEN COALESCE(completed_at, NOW()) ELSE NULL END,
           updated_at = NOW()
       WHERE task_id = $3
       RETURNING task_id, stage_id, title, task_type, status, assigned_user_id, deadline, completed_at, checklist, file_requirements, text_inputs`,
      [targetStatus, isDoneCategory, args.taskId],
    );

    await pool.query(
      `INSERT INTO workflow_transitions (org_id, project_id, entity_type, entity_id, from_status, to_status, actor_user_id, notes)
       VALUES ($1, $2, 'TASK', $3, $4, $5, $6, $7)`,
      [ownerOrgId, args.projectId, args.taskId, task.status, targetStatus, auth.userId, args.notes ?? null],
    );

    emitProjectEvent(args.projectId, 'task:updated', { taskId: args.taskId, status: targetStatus });
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

  async updateTask(
    auth: AuthContext,
    projectId: string,
    taskId: string,
    updates: {
      title?: string;
      description?: string;
      assignedUserId?: string | null;
      deadline?: string | null;
      checklist?: unknown[];
      fileRequirements?: unknown[];
    },
  ) {
    const { ownerShardId, roleCtx } = await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    if (!hasPermission(roleCtx, PERMISSION_FLAGS.TASK_CREATE_ASSIGN) && !hasPermission(roleCtx, PERMISSION_FLAGS.STAGE_MANAGE_ALL)) {
      throw new AppError(403, 'Forbidden: requires task.create_assign');
    }
    const res = await dataRouter.postgres.getPrimaryPool(ownerShardId).query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           assigned_user_id = COALESCE($3, assigned_user_id),
           deadline = COALESCE($4::timestamptz, deadline),
           checklist = COALESCE($5::jsonb, checklist),
           file_requirements = COALESCE($6::jsonb, file_requirements),
           updated_at = NOW()
       WHERE task_id = $7 AND project_id = $8
       RETURNING task_id, stage_id, title, description, status, assigned_user_id, deadline, checklist, file_requirements`,
      [
        updates.title ?? null,
        updates.description ?? null,
        updates.assignedUserId ?? null,
        updates.deadline ?? null,
        updates.checklist ? JSON.stringify(updates.checklist) : null,
        updates.fileRequirements ? JSON.stringify(updates.fileRequirements) : null,
        taskId,
        projectId,
      ],
    );
    if (res.rows.length === 0) throw new AppError(404, 'Task not found');
    emitProjectEvent(projectId, 'task:updated', { taskId, action: 'UPDATED' });
    return res.rows[0];
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

  async getProjectAiReports(
    auth: AuthContext,
    projectId: string,
  ): Promise<{ latest: Record<string, unknown> | null; reports: Array<Record<string, unknown>> }> {
    const { ownerOrgId } = await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    try {
      const mongoConn = await dataRouter.mongo.getConnectionForOrg(ownerOrgId);
      const raw = await mongoConn
        .collection('project_ai_reports')
        .find({ projectId })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();
      const reports = raw.map((r) => ({ ...r, _id: String(r._id) }));
      return { latest: reports[0] ?? null, reports };
    } catch {
      return { latest: null, reports: [] };
    }
  },

  async listProjectTeam(auth: AuthContext, projectId: string) {
    const { ownerOrgId, ownerShardId } = await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    const ownerPool = dataRouter.postgres.getReadPool(ownerShardId, true);
    const [stagesRes, membersRes] = await Promise.all([
      ownerPool.query(`SELECT stage_id FROM stages WHERE project_id = $1`, [projectId]),
      ownerPool.query(
        `SELECT m.user_id, m.allocated_stage_ids, r.name AS role_name
         FROM org_members m
         LEFT JOIN roles r ON r.role_id = m.role_id
         WHERE m.org_id = $1 AND m.status = 'ACTIVE'`,
        [ownerOrgId],
      ),
    ]);
    const projectStageIds = new Set(stagesRes.rows.map((s) => String(s.stage_id)));
    const assignedRows = membersRes.rows.filter((m) => {
      const alloc = Array.isArray(m.allocated_stage_ids) ? (m.allocated_stage_ids as string[]) : [];
      return alloc.some((id) => projectStageIds.has(String(id)));
    });
    const userIds = assignedRows.map((m) => String(m.user_id));
    const usersRes = userIds.length
      ? await dataRouter.postgres
          .getGlobalPool()
          .query(`SELECT user_id, full_name, email FROM users WHERE user_id = ANY($1::text[])`, [userIds])
      : { rows: [] };
    const userMap = new Map(usersRes.rows.map((u) => [String(u.user_id), u]));

    return assignedRows.map((m) => {
      const u = userMap.get(String(m.user_id));
      const alloc = Array.isArray(m.allocated_stage_ids) ? (m.allocated_stage_ids as string[]) : [];
      return {
        userId: String(m.user_id),
        fullName: u?.full_name || u?.email || String(m.user_id),
        email: u?.email || '',
        roleName: String(m.role_name || 'Member'),
        allocatedStageIds: alloc.filter((id) => projectStageIds.has(String(id))),
      };
    });
  },

  async assignProjectTeamMember(
    auth: AuthContext,
    projectId: string,
    args: { userId: string; allocatedStageIds?: string[] },
  ) {
    const { ownerOrgId, ownerShardId, roleCtx } = await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    const pool = dataRouter.postgres.getPrimaryPool(ownerShardId);
    const projRes = await pool.query(`SELECT manager_user_id FROM projects WHERE project_id = $1`, [projectId]);
    const isAssignedPm = projRes.rows[0]?.manager_user_id === auth.userId;
    if (
      !isAssignedPm &&
      !hasPermission(roleCtx, PERMISSION_FLAGS.PROJECT_MANAGE) &&
      !hasPermission(roleCtx, PERMISSION_FLAGS.ORG_MANAGE_SETTINGS)
    ) {
      throw new AppError(403, 'Forbidden: requires Org Admin or assigned Project Manager');
    }

    const stagesRes = await pool.query(`SELECT stage_id FROM stages WHERE project_id = $1`, [projectId]);
    const allStageIds = stagesRes.rows.map((s) => String(s.stage_id));
    const targetStages = args.allocatedStageIds?.length ? args.allocatedStageIds : allStageIds;

    const memRes = await pool.query(
      `SELECT allocated_stage_ids FROM org_members WHERE org_id = $1 AND user_id = $2 AND status = 'ACTIVE'`,
      [ownerOrgId, args.userId],
    );
    if (memRes.rows.length === 0) {
      throw new AppError(404, 'User is not an active member of this organization');
    }
    const existing = Array.isArray(memRes.rows[0].allocated_stage_ids)
      ? (memRes.rows[0].allocated_stage_ids as string[])
      : [];
    const projSet = new Set(allStageIds);
    const merged = Array.from(new Set([...existing.filter((id) => !projSet.has(id)), ...targetStages]));

    await pool.query(`UPDATE org_members SET allocated_stage_ids = $1::jsonb WHERE org_id = $2 AND user_id = $3`, [
      JSON.stringify(merged),
      ownerOrgId,
      args.userId,
    ]);
    return { userId: args.userId, allocatedStageIds: targetStages };
  },

  async removeProjectTeamMember(auth: AuthContext, projectId: string, userId: string) {
    const { ownerOrgId, ownerShardId, roleCtx } = await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    const pool = dataRouter.postgres.getPrimaryPool(ownerShardId);
    const projRes = await pool.query(`SELECT manager_user_id FROM projects WHERE project_id = $1`, [projectId]);
    const isAssignedPm = projRes.rows[0]?.manager_user_id === auth.userId;
    if (
      !isAssignedPm &&
      !hasPermission(roleCtx, PERMISSION_FLAGS.PROJECT_MANAGE) &&
      !hasPermission(roleCtx, PERMISSION_FLAGS.ORG_MANAGE_SETTINGS)
    ) {
      throw new AppError(403, 'Forbidden: requires Org Admin or assigned Project Manager');
    }
    const stagesRes = await pool.query(`SELECT stage_id FROM stages WHERE project_id = $1`, [projectId]);
    const projSet = new Set(stagesRes.rows.map((s) => String(s.stage_id)));
    const memRes = await pool.query(`SELECT allocated_stage_ids FROM org_members WHERE org_id = $1 AND user_id = $2`, [
      ownerOrgId,
      userId,
    ]);
    const existing = Array.isArray(memRes.rows[0]?.allocated_stage_ids)
      ? (memRes.rows[0].allocated_stage_ids as string[])
      : [];
    const remaining = existing.filter((id) => !projSet.has(id));
    await pool.query(`UPDATE org_members SET allocated_stage_ids = $1::jsonb WHERE org_id = $2 AND user_id = $3`, [
      JSON.stringify(remaining),
      ownerOrgId,
      userId,
    ]);
    return { removed: true, userId };
  },

  async getTaskAiInsights(auth: AuthContext, projectId: string, taskId: string) {
    const { ownerOrgId, ownerShardId } = await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    const scoreRes = await dataRouter.postgres
      .getReadPool(ownerShardId, true)
      .query(
        `SELECT timeliness_score, evidence_completeness, overall_efficiency, ai_risk_flags, evaluated_at
         FROM task_efficiency_scores WHERE task_id = $1`,
        [taskId],
      );
    let analyses: Array<Record<string, unknown>> = [];
    try {
      const mongoConn = await dataRouter.mongo.getConnectionForOrg(ownerOrgId);
      analyses = await mongoConn
        .collection('ai_raw_analyses')
        .find({ projectId, taskId })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();
    } catch {
      // ignore if mongo unavailable
    }
    return {
      score: scoreRes.rows[0] ?? null,
      analyses: analyses.map((a) => ({
        fileId: a.fileId ?? null,
        mimeType: a.mimeType ?? '',
        textNote: a.textNote ?? '',
        audioTranscript: a.audioTranscript ?? '',
        aiSummary: a.aiSummary ?? '',
        identifiedLanguages: Array.isArray(a.identifiedLanguages) ? a.identifiedLanguages : [],
        overallEfficiency: a.overallEfficiency ?? null,
        riskFlags: Array.isArray(a.riskFlags) ? a.riskFlags : [],
        createdAt: a.createdAt ?? null,
      })),
    };
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

  async listOrgDirectory(auth: AuthContext, query?: string) {
    const q = (query || '').trim();
    const res = await dataRouter.postgres.getGlobalPool().query(
      `SELECT org_id, org_name, shard_id
       FROM org_directory
       WHERE org_id <> $1 AND ($2 = '' OR org_name ILIKE $3 OR org_id ILIKE $3)
       ORDER BY org_name ASC
       LIMIT 30`,
      [auth.activeOrgId, q, `%${q}%`],
    );
    return res.rows.map((r) => ({
      orgId: String(r.org_id),
      orgName: String(r.org_name),
      shardId: Number(r.shard_id),
    }));
  },

  async inviteOrgCollaboration(
    auth: AuthContext,
    args: { projectId: string; partnerOrgId: string; allocatedStageIds?: string[]; notes?: string },
  ) {
    const { ownerOrgId, ownerShardId, roleCtx } = await this.resolveAccess(
      auth.userId,
      auth.activeOrgId,
      args.projectId,
    );
    if (!hasPermission(roleCtx, PERMISSION_FLAGS.ORG_INVITE_PARTNER_ORGS)) {
      throw new AppError(403, 'Forbidden: requires org.invite_partner_orgs');
    }
    const partnerOrgId = args.partnerOrgId.trim().toUpperCase();
    if (!partnerOrgId || partnerOrgId === ownerOrgId) {
      throw new AppError(400, 'Select a valid partner organization distinct from the project owner');
    }

    const globalPool = dataRouter.postgres.getGlobalPool();
    const orgCheck = await globalPool.query(`SELECT org_id, org_name FROM org_directory WHERE org_id = $1`, [partnerOrgId]);
    if (orgCheck.rows.length === 0) {
      throw new AppError(404, `Partner organization ${partnerOrgId} not found`);
    }

    const projRes = await dataRouter.postgres
      .getReadPool(ownerShardId, true)
      .query(`SELECT title FROM projects WHERE project_id = $1`, [args.projectId]);
    const projectTitle = projRes.rows[0]?.title ?? args.projectId;
    const collabId = `CLB-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

    const res = await globalPool.query(
      `INSERT INTO project_org_collaborations
         (collab_id, project_id, project_title, owner_org_id, owner_shard_id, partner_org_id, status, invited_by, allocated_stage_ids, notes)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8::jsonb, $9)
       ON CONFLICT (project_id, partner_org_id) DO UPDATE SET
         status = CASE WHEN project_org_collaborations.status = 'REJECTED' THEN 'PENDING' ELSE project_org_collaborations.status END,
         allocated_stage_ids = EXCLUDED.allocated_stage_ids,
         notes = COALESCE(EXCLUDED.notes, project_org_collaborations.notes),
         invited_by = EXCLUDED.invited_by
       RETURNING *`,
      [
        collabId,
        args.projectId,
        projectTitle,
        ownerOrgId,
        ownerShardId,
        partnerOrgId,
        auth.userId,
        JSON.stringify(args.allocatedStageIds ?? []),
        args.notes ?? null,
      ],
    );
    return res.rows[0];
  },

  async listProjectCollaborations(auth: AuthContext, projectId: string) {
    await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    const globalPool = dataRouter.postgres.getGlobalPool();
    const [orgRes, memRes] = await Promise.all([
      globalPool.query(
        `SELECT c.*, d.org_name AS partner_org_name
         FROM project_org_collaborations c
         JOIN org_directory d ON d.org_id = c.partner_org_id
         WHERE c.project_id = $1
         ORDER BY c.created_at DESC`,
        [projectId],
      ),
      globalPool.query(
        `SELECT c.partner_org_id, d.org_name AS partner_org_name, c.user_id, c.project_role_name, c.allocated_stage_ids, u.full_name, u.email
         FROM project_collaborators c
         LEFT JOIN users u ON u.user_id = c.user_id
         LEFT JOIN org_directory d ON d.org_id = c.partner_org_id
         WHERE c.project_id = $1
         ORDER BY c.invited_at DESC`,
        [projectId],
      ),
    ]);
    return {
      orgCollaborations: orgRes.rows,
      memberCollaborators: memRes.rows,
    };
  },

  async listIncomingOrgCollaborations(auth: AuthContext) {
    const res = await dataRouter.postgres.getGlobalPool().query(
      `SELECT c.*, d.org_name AS owner_org_name
       FROM project_org_collaborations c
       JOIN org_directory d ON d.org_id = c.owner_org_id
       WHERE c.partner_org_id = $1
       ORDER BY c.created_at DESC`,
      [auth.activeOrgId],
    );
    return res.rows;
  },

  async respondToOrgCollaboration(
    auth: AuthContext,
    collabId: string,
    body: { status: 'ACCEPTED' | 'REJECTED'; assignedUserIds?: string[]; roleName?: string },
  ) {
    if (!['ACCEPTED', 'REJECTED'].includes(body.status)) {
      throw new AppError(400, 'status must be ACCEPTED or REJECTED');
    }
    const globalPool = dataRouter.postgres.getGlobalPool();
    const existing = await globalPool.query(`SELECT * FROM project_org_collaborations WHERE collab_id = $1`, [collabId]);
    if (existing.rows.length === 0) throw new AppError(404, 'Collaboration invitation not found');

    const collab = existing.rows[0];
    if (collab.partner_org_id !== auth.activeOrgId) {
      throw new AppError(403, 'Only the invited partner organization can respond to this invitation');
    }

    const updated = await globalPool.query(
      `UPDATE project_org_collaborations
       SET status = $1, accepted_by = $2, responded_at = NOW()
       WHERE collab_id = $3
       RETURNING *`,
      [body.status, auth.userId, collabId],
    );

    if (body.status === 'ACCEPTED') {
      const userIds = Array.from(new Set([...(body.assignedUserIds ?? []), auth.userId])).filter(Boolean);
      const partnerFlags = {
        [PERMISSION_FLAGS.STAGE_MANAGE_ALLOCATED_ONLY]: true,
        [PERMISSION_FLAGS.TASK_EXECUTE_OWN]: true,
        [PERMISSION_FLAGS.TASK_UPLOAD_EVIDENCE]: true,
      };
      for (const uid of userIds) {
        await globalPool.query(
          `INSERT INTO project_collaborators
             (project_id, owner_org_id, owner_shard_id, partner_org_id, user_id, project_role_name, permission_flags, allocated_stage_ids)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
           ON CONFLICT (project_id, user_id) DO UPDATE SET
             project_role_name = EXCLUDED.project_role_name,
             allocated_stage_ids = EXCLUDED.allocated_stage_ids`,
          [
            collab.project_id,
            collab.owner_org_id,
            collab.owner_shard_id,
            collab.partner_org_id,
            uid,
            body.roleName || 'Partner Specialist',
            JSON.stringify(partnerFlags),
            JSON.stringify(collab.allocated_stage_ids ?? []),
          ],
        );
      }
    }

    return updated.rows[0];
  },

  async assignPartnerMembers(
    auth: AuthContext,
    projectId: string,
    args: { partnerOrgId?: string; userIds: string[]; roleName?: string; allocatedStageIds?: string[] },
  ) {
    const { ownerOrgId, ownerShardId } = await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    const targetPartnerOrgId = (args.partnerOrgId || auth.activeOrgId).trim().toUpperCase();
    const globalPool = dataRouter.postgres.getGlobalPool();

    if (targetPartnerOrgId !== ownerOrgId) {
      const accepted = await globalPool.query(
        `SELECT allocated_stage_ids FROM project_org_collaborations
         WHERE project_id = $1 AND partner_org_id = $2 AND status = 'ACCEPTED'`,
        [projectId, targetPartnerOrgId],
      );
      if (accepted.rows.length === 0) {
        throw new AppError(400, `Organization ${targetPartnerOrgId} has not accepted collaboration on this project yet`);
      }
    }

    const partnerFlags = {
      [PERMISSION_FLAGS.STAGE_MANAGE_ALLOCATED_ONLY]: true,
      [PERMISSION_FLAGS.TASK_EXECUTE_OWN]: true,
      [PERMISSION_FLAGS.TASK_UPLOAD_EVIDENCE]: true,
    };

    for (const uid of args.userIds || []) {
      await globalPool.query(
        `INSERT INTO project_collaborators
           (project_id, owner_org_id, owner_shard_id, partner_org_id, user_id, project_role_name, permission_flags, allocated_stage_ids)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
         ON CONFLICT (project_id, user_id) DO UPDATE SET
           project_role_name = EXCLUDED.project_role_name,
           allocated_stage_ids = EXCLUDED.allocated_stage_ids`,
        [
          projectId,
          ownerOrgId,
          ownerShardId,
          targetPartnerOrgId,
          uid,
          args.roleName || 'Partner Specialist',
          JSON.stringify(partnerFlags),
          JSON.stringify(args.allocatedStageIds ?? []),
        ],
      );
    }
    return { assigned: (args.userIds || []).length };
  },

  async removePartnerMember(auth: AuthContext, projectId: string, userId: string) {
    await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    await dataRouter.postgres
      .getGlobalPool()
      .query(`DELETE FROM project_collaborators WHERE project_id = $1 AND user_id = $2`, [projectId, userId]);
    return { removed: true, userId };
  },

  async listProjectAssignees(auth: AuthContext, projectId: string) {
    const { ownerOrgId, ownerShardId } = await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    const globalPool = dataRouter.postgres.getGlobalPool();
    const ownerPool = dataRouter.postgres.getReadPool(ownerShardId, true);

    const [ownerMembersRes, ownerOrgRes, collabRes] = await Promise.all([
      ownerPool.query(
        `SELECT m.user_id, r.name AS role_name
         FROM org_members m
         LEFT JOIN roles r ON r.role_id = m.role_id
         WHERE m.org_id = $1 AND m.status = 'ACTIVE'`,
        [ownerOrgId],
      ),
      globalPool.query(`SELECT org_name FROM org_directory WHERE org_id = $1`, [ownerOrgId]),
      globalPool.query(
        `SELECT c.user_id, c.partner_org_id, d.org_name AS partner_org_name, c.project_role_name, u.full_name, u.email
         FROM project_collaborators c
         LEFT JOIN users u ON u.user_id = c.user_id
         LEFT JOIN org_directory d ON d.org_id = c.partner_org_id
         WHERE c.project_id = $1`,
        [projectId],
      ),
    ]);

    const ownerUserIds = ownerMembersRes.rows.map((r) => String(r.user_id));
    const usersRes = ownerUserIds.length
      ? await globalPool.query(`SELECT user_id, full_name, email FROM users WHERE user_id = ANY($1::text[])`, [ownerUserIds])
      : { rows: [] };
    const userMap = new Map(usersRes.rows.map((u) => [String(u.user_id), u]));
    const ownerOrgName = ownerOrgRes.rows[0]?.org_name ?? ownerOrgId;

    const assignees: Array<{
      userId: string;
      fullName: string;
      email: string;
      orgId: string;
      orgName: string;
      roleName: string;
      isExternal: boolean;
    }> = [];
    const seen = new Set<string>();

    for (const m of ownerMembersRes.rows) {
      const uid = String(m.user_id);
      if (seen.has(uid)) continue;
      seen.add(uid);
      const u = userMap.get(uid);
      assignees.push({
        userId: uid,
        fullName: u?.full_name || u?.email || uid,
        email: u?.email || '',
        orgId: ownerOrgId,
        orgName: String(ownerOrgName),
        roleName: String(m.role_name || 'Member'),
        isExternal: false,
      });
    }

    for (const c of collabRes.rows) {
      const uid = String(c.user_id);
      if (seen.has(uid)) continue;
      seen.add(uid);
      assignees.push({
        userId: uid,
        fullName: c.full_name || c.email || uid,
        email: c.email || '',
        orgId: String(c.partner_org_id),
        orgName: String(c.partner_org_name || c.partner_org_id),
        roleName: String(c.project_role_name || 'Collaborator'),
        isExternal: true,
      });
    }

    return assignees;
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
    body: { tags?: string; bucket?: string; textNote?: string; slotId?: string; checklistItemId?: string },
    file?: Express.Multer.File,
  ) {
    const { ownerOrgId, ownerShardId } = await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
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
      uploadedFile = (await storageResp.json().catch(() => ({}))) as Record<string, unknown>;
      if (!storageResp.ok) {
        throw new AppError(
          storageResp.status || 502,
          String(uploadedFile?.message || uploadedFile?.error || 'Storage upload failed'),
        );
      }

      // Bind uploaded file to specific named file slot or checklist item
      const pool = dataRouter.postgres.getPrimaryPool(ownerShardId);
      const tRes = await pool.query(`SELECT checklist, file_requirements FROM tasks WHERE task_id = $1`, [taskId]);
      if (tRes.rows.length > 0 && uploadedFile?.fileId) {
        let checklist = Array.isArray(tRes.rows[0].checklist) ? tRes.rows[0].checklist : [];
        let slots = Array.isArray(tRes.rows[0].file_requirements) ? tRes.rows[0].file_requirements : [];

        if (body.slotId) {
          slots = slots.map((s: Record<string, unknown>) => {
            if (s.id !== body.slotId) return s;
            const prev = Array.isArray(s.uploadedFiles) ? s.uploadedFiles : [];
            return {
              ...s,
              uploadedFiles: [
                ...prev,
                {
                  fileId: uploadedFile?.fileId,
                  fileName: file.originalname,
                  mimeType: file.mimetype,
                  uploadedBy: auth.userId,
                  uploadedAt: new Date().toISOString(),
                },
              ],
            };
          });
        }

        if (body.checklistItemId) {
          checklist = checklist.map((c: Record<string, unknown>) =>
            c.id === body.checklistItemId
              ? { ...c, fileId: uploadedFile?.fileId, fileName: file.originalname, completed: true }
              : c,
          );
        }

        await pool.query(`UPDATE tasks SET checklist = $1::jsonb, file_requirements = $2::jsonb, updated_at = NOW() WHERE task_id = $3`, [
          JSON.stringify(checklist),
          JSON.stringify(slots),
          taskId,
        ]);
        emitProjectEvent(projectId, 'task:updated', { taskId, action: 'EVIDENCE_UPLOADED' });
      }
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

  async deleteFile(auth: AuthContext, projectId: string, fileId: string) {
    const { ownerOrgId, roleCtx } = await this.resolveAccess(auth.userId, auth.activeOrgId, projectId);
    const pool = dataRouter.postgres.getReadPool(auth.shardId, true);
    const projCheck = await pool.query(`SELECT status FROM projects WHERE project_id = $1`, [projectId]);
    if (projCheck.rows[0]?.status === 'ARCHIVED') {
      throw new AppError(403, 'Cannot delete media from an archived project');
    }
    if (
      !hasPermission(roleCtx, PERMISSION_FLAGS.PROJECT_MANAGE) &&
      !hasPermission(roleCtx, PERMISSION_FLAGS.ORG_MANAGE_SETTINGS) &&
      !hasPermission(roleCtx, PERMISSION_FLAGS.TASK_UPLOAD_EVIDENCE)
    ) {
      throw new AppError(403, 'Forbidden: cannot delete file');
    }
    const resp = await fetch(`${gatewayEnv.storageHttpUrl}/api/v1/storage/internal/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'x-master-read-key': gatewayEnv.masterReadKey,
        'x-project-id': projectId,
        'x-org-id': ownerOrgId,
      },
    });
    if (!resp.ok) {
      const j = (await resp.json().catch(() => ({}))) as { error?: string };
      throw new AppError(resp.status, j.error || 'Failed to delete file');
    }
    return { deleted: true, fileId };
  },

  async listEvidence(auth: AuthContext, filters: { projectId?: string; type?: string }) {
    const pool = dataRouter.postgres.getReadPool(auth.shardId, true);
    const params: unknown[] = [auth.activeOrgId];
    let where = `m.org_id = $1`;
    if (filters.projectId) {
      params.push(filters.projectId);
      where += ` AND m.project_id = $${params.length}`;
    }
    if (filters.type && filters.type !== 'ALL') {
      if (filters.type === 'IMAGE') where += ` AND m.mime_type LIKE 'image/%'`;
      else if (filters.type === 'VIDEO') where += ` AND m.mime_type LIKE 'video/%'`;
      else if (filters.type === 'AUDIO') where += ` AND m.mime_type LIKE 'audio/%'`;
      else if (filters.type === 'DOCUMENT') where += ` AND m.mime_type NOT LIKE 'image/%' AND m.mime_type NOT LIKE 'video/%' AND m.mime_type NOT LIKE 'audio/%'`;
    }

    const [filesRes, quotaRes] = await Promise.all([
      pool.query(
        `SELECT m.*, p.title AS project_title, t.title AS task_title
         FROM media_assets m
         LEFT JOIN projects p ON p.project_id = m.project_id
         LEFT JOIN tasks t ON t.task_id = m.task_id
         WHERE ${where}
         ORDER BY m.created_at DESC`,
        params,
      ),
      pool.query(`SELECT COALESCE(SUM(size_bytes), 0)::bigint AS used_bytes FROM media_assets WHERE org_id = $1`, [
        auth.activeOrgId,
      ]),
    ]);

    let aiMap = new Map<string, { audioTranscript?: string; identifiedLanguages?: string[]; overallEfficiency?: number }>();
    try {
      const mongoConn = await dataRouter.mongo.getConnectionForOrg(auth.activeOrgId);
      const analyses = await mongoConn
        .collection('ai_raw_analyses')
        .find({ orgId: auth.activeOrgId })
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray();
      for (const a of analyses) {
        if (a.fileId && !aiMap.has(String(a.fileId))) {
          aiMap.set(String(a.fileId), {
            audioTranscript: a.audioTranscript ? String(a.audioTranscript) : undefined,
            identifiedLanguages: Array.isArray(a.identifiedLanguages) ? a.identifiedLanguages.map(String) : [],
            overallEfficiency: a.overallEfficiency ? Number(a.overallEfficiency) : undefined,
          });
        }
      }
    } catch {
      // ignore if mongo empty
    }

    const files = filesRes.rows.map((r) => {
      const ai = aiMap.get(r.file_id);
      return {
        fileId: r.file_id,
        projectId: r.project_id,
        projectTitle: r.project_title ?? r.project_id,
        taskId: r.task_id,
        taskTitle: r.task_title ?? null,
        bucket: r.bucket,
        objectKey: r.object_key,
        mimeType: r.mime_type,
        sizeBytes: Number(r.size_bytes ?? 0),
        tags: r.tags ?? [],
        uploadedBy: r.uploaded_by,
        createdAt: r.created_at,
        audioTranscript: ai?.audioTranscript ?? null,
        identifiedLanguages: ai?.identifiedLanguages ?? [],
        overallEfficiency: ai?.overallEfficiency ?? null,
      };
    });

    return {
      files,
      usedBytes: Number(quotaRes.rows[0]?.used_bytes ?? 0),
      quotaBytes: 50 * 1024 * 1024 * 1024,
    };
  },

  async getEfficiencyAnalytics(auth: AuthContext) {
    const pool = dataRouter.postgres.getReadPool(auth.shardId, true);
    const scoresRes = await pool.query(
      `SELECT e.*, t.title AS task_title, p.title AS project_title
       FROM task_efficiency_scores e
       LEFT JOIN tasks t ON t.task_id = e.task_id
       LEFT JOIN projects p ON p.project_id = e.project_id
       WHERE e.org_id = $1
       ORDER BY e.evaluated_at DESC LIMIT 100`,
      [auth.activeOrgId],
    );
    const rows = scoresRes.rows;
    const avgEfficiency =
      rows.length > 0 ? Number((rows.reduce((acc, r) => acc + Number(r.overall_efficiency), 0) / rows.length).toFixed(1)) : 0;
    const avgTimeliness =
      rows.length > 0 ? Number((rows.reduce((acc, r) => acc + Number(r.timeliness_score), 0) / rows.length).toFixed(1)) : 0;
    const avgEvidence =
      rows.length > 0 ? Number((rows.reduce((acc, r) => acc + Number(r.evidence_completeness), 0) / rows.length).toFixed(1)) : 0;

    return {
      avgEfficiency,
      avgTimeliness,
      avgEvidence,
      evaluatedCount: rows.length,
      scores: rows,
    };
  },

  async listActivity(auth: AuthContext) {
    const pool = dataRouter.postgres.getReadPool(auth.shardId, true);
    const res = await pool.query(
      `SELECT w.*, p.title AS project_title
       FROM workflow_transitions w
       LEFT JOIN projects p ON p.project_id = w.project_id
       WHERE w.org_id = $1
       ORDER BY w.created_at DESC LIMIT 60`,
      [auth.activeOrgId],
    );
    return res.rows;
  },

  async getInbox(auth: AuthContext) {
    const pool = dataRouter.postgres.getReadPool(auth.shardId, true);
    const [pendingTasks, overdueTasks, claims] = await Promise.all([
      pool.query(
        `SELECT t.task_id, t.project_id, t.title, t.status, t.deadline, p.title AS project_title
         FROM tasks t JOIN projects p ON p.project_id = t.project_id
         WHERE t.org_id = $1 AND t.status IN ('SUBMITTED', 'IN_REVIEW')
         ORDER BY t.updated_at DESC`,
        [auth.activeOrgId],
      ),
      pool.query(
        `SELECT t.task_id, t.project_id, t.title, t.status, t.deadline, p.title AS project_title
         FROM tasks t JOIN projects p ON p.project_id = t.project_id
         WHERE t.org_id = $1 AND t.deadline < NOW() AND t.status NOT IN ('DONE', 'COMPLETED', 'VERIFIED')
         ORDER BY t.deadline ASC`,
        [auth.activeOrgId],
      ),
      pool.query(
        `SELECT claim_id, title, amount_paise, status, created_at FROM reimbursement_claims WHERE org_id = $1 AND status = 'SUBMITTED'`,
        [auth.activeOrgId],
      ),
    ]);
    return {
      pendingVerifications: pendingTasks.rows,
      overdueTasks: overdueTasks.rows,
      pendingClaims: claims.rows,
    };
  },
};
