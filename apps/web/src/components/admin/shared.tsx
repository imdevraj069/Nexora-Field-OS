import React from 'react';

// Shared types for admin panel
export interface PlatformOverview {
  totalOrgs: number;
  shardOrgCounts: Record<string, number>;
  totalUsers: number;
  verifiedUsers: number;
  crossOrgCollaborations: number;
  totalProjects: number;
  totalStages: number;
  totalTasks: number;
  completedTasks: number;
  shards?: Array<{
    shardId: number;
    orgCount: number;
    projectCount: number;
    taskCount: number;
    avgEfficiency: number | null;
  }>;
}

export interface OrgRow {
  orgId: string;
  orgName: string;
  orgInitials: string;
  shardId: number;
  industryType: string;
  memberCount: number;
  projectCount: number;
  stageCount: number;
  taskCount: number;
  createdAt: string;
}

export interface OrgDetail {
  organization: { org_id: string; name: string; industry_type: string; shardId: number };
  roles: Array<{ role_id: string; name: string; is_system: boolean }>;
  members: Array<{
    userId: string;
    email: string | null;
    fullName: string | null;
    isVerified: boolean;
    status: 'ACTIVE' | 'SUSPENDED';
    roleNames: string[];
    roleIds: string[];
    allocatedStageIds: string[];
  }>;
  projects: Array<{
    projectId: string;
    title: string;
    description: string | null;
    status: string;
    createdAt: string;
    collaborators: Array<{
      userId: string;
      fullName: string | null;
      partnerOrgId: string;
      roleName: string;
    }>;
    stages: Array<{
      stageId: string;
      name: string;
      orderIndex: number;
      status: string;
      deadline: string | null;
      tasks: Array<{
        taskId: string;
        title: string;
        taskType: string;
        status: string;
        assignedUserId: string | null;
        deadline: string | null;
        completedAt: string | null;
        efficiencyScore: number | null;
      }>;
    }>;
  }>;
}

export interface GlobalUserRow {
  userId: string;
  email: string;
  fullName: string;
  isVerified: boolean;
  createdAt: string;
  organizations: Array<{ org_id: string; org_name: string; shard_id: number; is_active: boolean }>;
  collaborations: Array<{ project_id: string; owner_org_id: string; project_role_name: string }>;
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

export const TASK_STATUSES = ['TODO', 'IN_TRANSIT', 'ON_FIELD', 'SUBMITTED', 'COMPLETED', 'VERIFIED', 'REJECTED'];
export const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'];
export const STAGE_STATUSES = ['PENDING', 'ACTIVE', 'COMPLETED', 'SKIPPED'];

export function statusBadge(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    PLANNING: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    COMPLETED: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    VERIFIED: 'bg-orange-500/15 text-orange-200 border-orange-500/30',
    SUSPENDED: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    ON_HOLD: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    REJECTED: 'bg-red-500/15 text-red-300 border-red-500/30',
    ARCHIVED: 'bg-zinc-800 text-zinc-400 border-zinc-700/40',
    PENDING: 'bg-zinc-800 text-zinc-400 border-zinc-700/40',
    TODO: 'bg-zinc-800 text-zinc-400 border-zinc-700/40',
    IN_TRANSIT: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    ON_FIELD: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    SUBMITTED: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    SKIPPED: 'bg-zinc-800 text-zinc-500 border-zinc-700/40',
  };
  return map[status] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700/40';
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium font-mono tracking-wide ${statusBadge(status)}`}
    >
      {status}
    </span>
  );
}

export function ShardBadge({ shard }: { shard: number }) {
  const styles = [
    'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-200 border-orange-500/30',
    'bg-gradient-to-r from-red-500/20 to-rose-500/20 text-rose-200 border-rose-500/30',
    'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-200 border-amber-500/30',
  ];
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-mono font-medium ${styles[(shard - 1) % 3]}`}>
      S{shard}
    </span>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="inline-block animate-spin rounded-full border-2 border-white/10 border-t-orange-500"
    />
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-sm gap-2">
      <span className="text-2xl opacity-40">◦</span>
      {message}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-[#121215]/90 backdrop-blur-sm shadow-xl shadow-black/40 ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <Card className="p-5 relative overflow-hidden group hover:border-orange-500/30 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</p>
          <p className={`mt-2 font-display text-3xl font-bold tabular-nums tracking-tight ${accent ?? 'text-white'}`}>
            {value}
          </p>
          {sub && <p className="mt-1.5 text-xs text-zinc-400">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-white/[0.04] border border-white/[0.06]'}`}>
          <Icon size={19} className={accent ?? 'text-zinc-400'} />
        </div>
      </div>
    </Card>
  );
}
