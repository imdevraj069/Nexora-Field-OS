import { ShardId, resolveShardFromOrgId } from '@nexora/shared-types';
import { dataRouter } from '../config/env';
import { AppError } from '../utils/http';

const SHARDS: ShardId[] = [1, 2, 3];

export const SuperadminService = {
  async getPlatformOverview() {
    const globalPool = dataRouter.postgres.getGlobalPool();
    const [orgRes, userRes, collabRes] = await Promise.all([
      globalPool.query(`SELECT shard_id, COUNT(*)::int AS cnt FROM org_directory GROUP BY shard_id`),
      globalPool.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_verified)::int AS verified FROM users`),
      globalPool.query(`SELECT COUNT(*)::int AS cnt FROM project_collaborators`),
    ]);

    const shardOrgCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    let totalOrgs = 0;
    for (const r of orgRes.rows) {
      shardOrgCounts[r.shard_id] = r.cnt;
      totalOrgs += r.cnt;
    }

    const shardStats = await Promise.all(
      SHARDS.map(async (shardId) => {
        const pool = dataRouter.postgres.getReadPool(shardId, true);
        const [prj, stg, tsk, eff] = await Promise.all([
          pool.query(`SELECT COUNT(*)::int AS cnt FROM projects`),
          pool.query(`SELECT COUNT(*)::int AS cnt FROM stages`),
          pool.query(
            `SELECT COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE status IN ('COMPLETED', 'VERIFIED'))::int AS done
             FROM tasks`,
          ),
          pool.query(`SELECT COALESCE(AVG(overall_efficiency), 0)::numeric(5,2) AS avg_eff FROM task_efficiency_scores`),
        ]);
        return {
          shardId,
          projects: prj.rows[0].cnt as number,
          stages: stg.rows[0].cnt as number,
          tasksTotal: tsk.rows[0].total as number,
          tasksDone: tsk.rows[0].done as number,
          avgEfficiency: Number(eff.rows[0].avg_eff),
        };
      }),
    );

    return {
      totalOrgs,
      shardOrgCounts,
      totalUsers: userRes.rows[0].total as number,
      verifiedUsers: userRes.rows[0].verified as number,
      crossOrgCollaborations: collabRes.rows[0].cnt as number,
      totalProjects: shardStats.reduce((a, b) => a + b.projects, 0),
      totalStages: shardStats.reduce((a, b) => a + b.stages, 0),
      totalTasks: shardStats.reduce((a, b) => a + b.tasksTotal, 0),
      completedTasks: shardStats.reduce((a, b) => a + b.tasksDone, 0),
      shards: shardStats,
    };
  },

  async listAllOrganizations() {
    const globalPool = dataRouter.postgres.getGlobalPool();
    const dirs = await globalPool.query(
      `SELECT org_id, org_name, org_initials, shard_id, created_by_user_id, created_at
       FROM org_directory ORDER BY created_at DESC`,
    );

    const perShardMaps = await Promise.all(
      SHARDS.map(async (shardId) => {
        const pool = dataRouter.postgres.getReadPool(shardId, true);
        const { rows } = await pool.query(`
          SELECT o.org_id, o.industry_type,
                 (SELECT COUNT(*)::int FROM org_members m WHERE m.org_id = o.org_id) AS member_count,
                 (SELECT COUNT(*)::int FROM projects p WHERE p.org_id = o.org_id) AS project_count,
                 (SELECT COUNT(*)::int FROM stages s WHERE s.org_id = o.org_id) AS stage_count,
                 (SELECT COUNT(*)::int FROM tasks t WHERE t.org_id = o.org_id) AS task_count
          FROM organizations o
        `);
        return rows;
      }),
    );

    const statsMap = new Map<string, Record<string, unknown>>();
    for (const row of perShardMaps.flat()) {
      statsMap.set(row.org_id, row);
    }

    return dirs.rows.map((d) => {
      const s = statsMap.get(d.org_id) ?? {};
      return {
        orgId: d.org_id,
        orgName: d.org_name,
        orgInitials: d.org_initials,
        shardId: d.shard_id,
        industryType: s.industry_type ?? 'general_field_ops',
        memberCount: s.member_count ?? 0,
        projectCount: s.project_count ?? 0,
        stageCount: s.stage_count ?? 0,
        taskCount: s.task_count ?? 0,
        createdAt: d.created_at,
      };
    });
  },

  async getOrganizationDetail(orgIdRaw: string) {
    const orgId = orgIdRaw.toUpperCase();
    const shardId = resolveShardFromOrgId(orgId);
    const shardPool = dataRouter.postgres.getReadPool(shardId, true);
    const globalPool = dataRouter.postgres.getGlobalPool();

    const orgRes = await shardPool.query(`SELECT org_id, name, industry_type, created_at FROM organizations WHERE org_id = $1`, [
      orgId,
    ]);
    if (orgRes.rows.length === 0) {
      throw new AppError(404, `Organization ${orgId} not found`);
    }

    const [rolesRes, membersRes, projectsRes, stagesRes, tasksRes, collabsRes] = await Promise.all([
      shardPool.query(`SELECT role_id, name, flags, is_system FROM roles WHERE org_id = $1 ORDER BY is_system DESC, name ASC`, [
        orgId,
      ]),
      shardPool.query(
        `SELECT m.user_id, m.status, m.allocated_stage_ids,
                COALESCE(array_agg(r.role_id) FILTER (WHERE r.role_id IS NOT NULL), '{}') AS role_ids,
                COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS role_names
         FROM org_members m
         LEFT JOIN org_member_roles omr ON omr.org_id = m.org_id AND omr.user_id = m.user_id
         LEFT JOIN roles r ON r.role_id = COALESCE(omr.role_id, m.role_id)
         WHERE m.org_id = $1
         GROUP BY m.user_id, m.status, m.allocated_stage_ids`,
        [orgId],
      ),
      shardPool.query(`SELECT project_id, title, description, status, created_by, created_at FROM projects WHERE org_id = $1 ORDER BY created_at DESC`, [
        orgId,
      ]),
      shardPool.query(`SELECT stage_id, project_id, name, order_index, status, deadline FROM stages WHERE org_id = $1 ORDER BY order_index ASC`, [
        orgId,
      ]),
      shardPool.query(
        `SELECT t.task_id, t.stage_id, t.project_id, t.title, t.task_type, t.status, t.assigned_user_id, t.deadline, t.completed_at,
                s.overall_efficiency
         FROM tasks t
         LEFT JOIN task_efficiency_scores s ON s.task_id = t.task_id
         WHERE t.org_id = $1
         ORDER BY t.created_at ASC`,
        [orgId],
      ),
      globalPool.query(
        `SELECT project_id, partner_org_id, user_id, project_role_name, allocated_stage_ids, invited_at
         FROM project_collaborators WHERE owner_org_id = $1`,
        [orgId],
      ),
    ]);

    const userIds = Array.from(
      new Set([
        ...membersRes.rows.map((m) => m.user_id),
        ...collabsRes.rows.map((c) => c.user_id),
      ]),
    );
    const userMap = new Map<string, { email: string; full_name: string; is_verified: boolean }>();
    if (userIds.length > 0) {
      const users = await globalPool.query(
        `SELECT user_id, email, full_name, is_verified FROM users WHERE user_id = ANY($1)`,
        [userIds],
      );
      for (const u of users.rows) userMap.set(u.user_id, u);
    }

    return {
      organization: { ...orgRes.rows[0], shardId },
      roles: rolesRes.rows,
      members: membersRes.rows.map((m) => ({
        userId: m.user_id,
        email: userMap.get(m.user_id)?.email ?? null,
        fullName: userMap.get(m.user_id)?.full_name ?? null,
        isVerified: userMap.get(m.user_id)?.is_verified ?? false,
        status: m.status,
        roleIds: m.role_ids,
        roleNames: m.role_names,
        allocatedStageIds: m.allocated_stage_ids,
      })),
      projects: projectsRes.rows.map((p) => ({
        projectId: p.project_id,
        title: p.title,
        description: p.description,
        status: p.status,
        createdAt: p.created_at,
        collaborators: collabsRes.rows
          .filter((c) => c.project_id === p.project_id)
          .map((c) => ({
            userId: c.user_id,
            email: userMap.get(c.user_id)?.email ?? null,
            fullName: userMap.get(c.user_id)?.full_name ?? null,
            partnerOrgId: c.partner_org_id,
            roleName: c.project_role_name,
            allocatedStageIds: c.allocated_stage_ids,
          })),
        stages: stagesRes.rows
          .filter((s) => s.project_id === p.project_id)
          .map((s) => ({
            stageId: s.stage_id,
            name: s.name,
            orderIndex: s.order_index,
            status: s.status,
            deadline: s.deadline,
            tasks: tasksRes.rows
              .filter((t) => t.stage_id === s.stage_id)
              .map((t) => ({
                taskId: t.task_id,
                title: t.title,
                taskType: t.task_type,
                status: t.status,
                assignedUserId: t.assigned_user_id,
                deadline: t.deadline,
                completedAt: t.completed_at,
                efficiencyScore: t.overall_efficiency ? Number(t.overall_efficiency) : null,
              })),
          })),
      })),
    };
  },

  async listAllUsers() {
    const globalPool = dataRouter.postgres.getGlobalPool();
    const [usersRes, memRes, collabRes] = await Promise.all([
      globalPool.query(`SELECT user_id, email, full_name, is_verified, created_at FROM users ORDER BY created_at DESC`),
      globalPool.query(
        `SELECT m.user_id, m.org_id, m.role_id, m.is_active, d.org_name, d.shard_id
         FROM user_org_memberships m JOIN org_directory d ON d.org_id = m.org_id`,
      ),
      globalPool.query(`SELECT user_id, project_id, owner_org_id, project_role_name FROM project_collaborators`),
    ]);

    return usersRes.rows.map((u) => ({
      userId: u.user_id,
      email: u.email,
      fullName: u.full_name,
      isVerified: u.is_verified,
      createdAt: u.created_at,
      organizations: memRes.rows.filter((m) => m.user_id === u.user_id),
      collaborations: collabRes.rows.filter((c) => c.user_id === u.user_id),
    }));
  },

  async updateOrgMemberStatus(orgIdRaw: string, userId: string, status: 'ACTIVE' | 'SUSPENDED') {
    const orgId = orgIdRaw.toUpperCase();
    const shardId = resolveShardFromOrgId(orgId);
    const pool = dataRouter.postgres.getPrimaryPool(shardId);
    const { rowCount } = await pool.query(
      `UPDATE org_members SET status = $1 WHERE org_id = $2 AND user_id = $3`,
      [status, orgId, userId],
    );
    if (!rowCount) throw new AppError(404, 'Organization member not found');

    await dataRouter.postgres
      .getGlobalPool()
      .query(`UPDATE user_org_memberships SET is_active = $1 WHERE org_id = $2 AND user_id = $3`, [
        status === 'ACTIVE',
        orgId,
        userId,
      ]);
    await dataRouter.redis.invalidate(orgId, 'rbac', userId);
    return { orgId, userId, status };
  },

  async overrideProjectStatus(orgIdRaw: string, projectId: string, status: string) {
    const orgId = orgIdRaw.toUpperCase();
    const shardId = resolveShardFromOrgId(orgId);
    const pool = dataRouter.postgres.getPrimaryPool(shardId);
    const { rows } = await pool.query(
      `UPDATE projects SET status = $1, updated_at = NOW() WHERE project_id = $2 AND org_id = $3
       RETURNING project_id, status`,
      [status.toUpperCase(), projectId, orgId],
    );
    if (rows.length === 0) throw new AppError(404, 'Project not found');
    await pool.query(
      `INSERT INTO workflow_transitions (org_id, project_id, entity_type, entity_id, to_status, actor_user_id, notes)
       VALUES ($1, $2, 'PROJECT', $2, $3, 'SUPERADMIN-DEVRAJ', 'Superadmin governance override')`,
      [orgId, projectId, status.toUpperCase()],
    );
    return rows[0];
  },

  async overrideStageStatus(orgIdRaw: string, stageId: string, status: string) {
    const orgId = orgIdRaw.toUpperCase();
    const shardId = resolveShardFromOrgId(orgId);
    const pool = dataRouter.postgres.getPrimaryPool(shardId);
    const { rows } = await pool.query(
      `UPDATE stages SET status = $1 WHERE stage_id = $2 AND org_id = $3 RETURNING stage_id, project_id, status`,
      [status.toUpperCase(), stageId, orgId],
    );
    if (rows.length === 0) throw new AppError(404, 'Stage not found');
    await pool.query(
      `INSERT INTO workflow_transitions (org_id, project_id, entity_type, entity_id, to_status, actor_user_id, notes)
       VALUES ($1, $2, 'STAGE', $3, $4, 'SUPERADMIN-DEVRAJ', 'Superadmin governance override')`,
      [orgId, rows[0].project_id, stageId, status.toUpperCase()],
    );
    return rows[0];
  },

  async overrideTask(orgIdRaw: string, taskId: string, body: { status?: string; assignedUserId?: string }) {
    const orgId = orgIdRaw.toUpperCase();
    const shardId = resolveShardFromOrgId(orgId);
    const pool = dataRouter.postgres.getPrimaryPool(shardId);
    const nextStatus = body.status?.toUpperCase() ?? null;
    const isDone = nextStatus === 'COMPLETED' || nextStatus === 'VERIFIED' || nextStatus === 'SUBMITTED';

    const { rows } = await pool.query(
      `UPDATE tasks
       SET status = COALESCE($1, status),
           assigned_user_id = COALESCE($2, assigned_user_id),
           completed_at = CASE WHEN $3 THEN COALESCE(completed_at, NOW()) ELSE completed_at END,
           updated_at = NOW()
       WHERE task_id = $4 AND org_id = $5
       RETURNING task_id, project_id, status, assigned_user_id, completed_at`,
      [nextStatus, body.assignedUserId ?? null, isDone, taskId, orgId],
    );
    if (rows.length === 0) throw new AppError(404, 'Task not found');

    if (nextStatus) {
      await pool.query(
        `INSERT INTO workflow_transitions (org_id, project_id, entity_type, entity_id, to_status, actor_user_id, notes)
         VALUES ($1, $2, 'TASK', $3, $4, 'SUPERADMIN-DEVRAJ', 'Superadmin governance override')`,
        [orgId, rows[0].project_id, taskId, nextStatus],
      );
    }
    return rows[0];
  },
};
