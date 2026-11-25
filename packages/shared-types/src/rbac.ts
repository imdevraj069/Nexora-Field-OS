export const PERMISSION_FLAGS = {
  // Organization scope
  ORG_MANAGE_SETTINGS: 'org.manage_settings',
  ORG_MANAGE_ROLES: 'org.manage_roles',
  ORG_INVITE_MEMBERS: 'org.invite_members',
  ORG_INVITE_PARTNER_ORGS: 'org.invite_partner_orgs',
  PROJECT_CREATE: 'project.create',
  PROJECT_VIEW_ALL: 'project.view_all',

  // Project & Stage scope
  PROJECT_MANAGE: 'project.manage',
  STAGE_MANAGE_ALL: 'stage.manage_all',
  STAGE_MANAGE_ALLOCATED_ONLY: 'stage.manage_allocated_only',
  STAGE_VIEW_ONLY: 'stage.view_only',

  // Task & Field execution scope
  TASK_CREATE_ASSIGN: 'task.create_assign',
  TASK_EXECUTE_OWN: 'task.execute_own',
  TASK_UPLOAD_EVIDENCE: 'task.upload_evidence',
  TASK_VERIFY_APPROVE: 'task.verify_approve',
  TASK_OVERRIDE_DEADLINE: 'task.override_deadline',

  // AI Governance scope
  AI_GENERATE_PLAN: 'ai.generate_plan',
  AI_VIEW_EFFICIENCY_REPORTS: 'ai.view_efficiency_reports',
  AI_OVERRIDE_AI_FLAG: 'ai.override_ai_flag',
} as const;

export type PermissionFlag = (typeof PERMISSION_FLAGS)[keyof typeof PERMISSION_FLAGS];

export interface RolePermissionContext {
  roleName: string;
  flags: Record<string, boolean>;
  allocatedStageIds?: string[];
  isExternalCollaborator?: boolean;
}

/**
 * Checks whether a dynamic role context permits an action, enforcing stage-scoped boundaries
 * for `stage.manage_allocated_only` and cross-org partner isolation.
 */
export function hasPermission(
  ctx: RolePermissionContext,
  requiredFlag: PermissionFlag,
  targetStageId?: string,
): boolean {
  if (ctx.isExternalCollaborator && requiredFlag.startsWith('org.')) {
    return false;
  }

  if (ctx.flags[requiredFlag] === true) {
    return true;
  }

  // Fallback for stage-allocated management when full stage management is unchecked
  if (
    requiredFlag === PERMISSION_FLAGS.STAGE_MANAGE_ALL &&
    ctx.flags[PERMISSION_FLAGS.STAGE_MANAGE_ALLOCATED_ONLY] === true &&
    targetStageId
  ) {
    return Boolean(ctx.allocatedStageIds?.includes(targetStageId));
  }

  return false;
}

export function canAccessStage(ctx: RolePermissionContext, stageId: string): boolean {
  if (
    ctx.flags[PERMISSION_FLAGS.PROJECT_MANAGE] ||
    ctx.flags[PERMISSION_FLAGS.STAGE_MANAGE_ALL] ||
    ctx.flags[PERMISSION_FLAGS.PROJECT_VIEW_ALL]
  ) {
    return true;
  }
  if (ctx.flags[PERMISSION_FLAGS.STAGE_MANAGE_ALLOCATED_ONLY] || ctx.flags[PERMISSION_FLAGS.STAGE_VIEW_ONLY]) {
    return Boolean(ctx.allocatedStageIds?.includes(stageId));
  }
  return Boolean(ctx.allocatedStageIds?.includes(stageId));
}
