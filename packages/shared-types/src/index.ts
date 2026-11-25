export * from './org-id';
export * from './rbac';

export type ProjectStatus = 'LEAD' | 'PLANNING' | 'ACTIVE' | 'VERIFICATION' | 'FINALIZED' | 'ARCHIVED';
export type StageStatus = 'PENDING' | 'IN_PROGRESS' | 'AWAITING_VERIFICATION' | 'COMPLETED' | 'BLOCKED';
export type TaskStatus = 'TODO' | 'IN_TRANSIT' | 'ON_FIELD' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  activeOrgId: string;
  shardId: 1 | 2 | 3;
  roleId: string;
  isSuperadmin?: boolean;
}

export interface MediaUploadMetadata {
  projectId: string;
  orgId: string;
  stageId?: string;
  taskId?: string;
  tags?: string[];
}
