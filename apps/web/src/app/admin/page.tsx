'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  ShieldAlert,
  Building2,
  Users,
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Search,
  RefreshCw,
  ArrowLeft,
  Layers,
} from 'lucide-react';
import { NexoraMark } from '../../components/svg/NexoraMark';
import { apiRequest } from '../../services/nexoraClient';

interface PlatformOverview {
  totalOrgs: number;
  shardOrgCounts: Record<string, number>;
  totalUsers: number;
  verifiedUsers: number;
  crossOrgCollaborations: number;
  totalProjects: number;
  totalStages: number;
  totalTasks: number;
  completedTasks: number;
}

interface OrgRow {
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

interface OrgDetail {
  organization: { org_id: string; name: string; industry_type: string; shardId: number };
  roles: Array<{ role_id: string; name: string; is_system: boolean }>;
  members: Array<{
    userId: string;
    email: string | null;
    fullName: string | null;
    isVerified: boolean;
    status: 'ACTIVE' | 'SUSPENDED';
    roleNames: string[];
  }>;
  projects: Array<{
    projectId: string;
    title: string;
    status: string;
    collaborators: Array<{ userId: string; fullName: string | null; partnerOrgId: string; roleName: string }>;
    stages: Array<{
      stageId: string;
      name: string;
      orderIndex: number;
      status: string;
      tasks: Array<{
        taskId: string;
        title: string;
        taskType: string;
        status: string;
        assignedUserId: string | null;
        efficiencyScore: number | null;
      }>;
    }>;
  }>;
}

interface GlobalUserRow {
  userId: string;
  email: string;
  fullName: string;
  isVerified: boolean;
  organizations: Array<{ org_id: string; org_name: string; shard_id: number; is_active: boolean }>;
  collaborations: Array<{ project_id: string; owner_org_id: string; project_role_name: string }>;
}

const TOKEN_KEY = 'nexora_superadmin_token';

export default function SuperadminPanelPage() {
  const [token, setToken] = useState<string>('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<'orgs' | 'users'>('orgs');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [users, setUsers] = useState<GlobalUserRow[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<OrgDetail | null>(null);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (saved) {
      setToken(saved);
    }
  }, []);

  useEffect(() => {
    if (token) {
      void refreshAll(token);
    }
  }, [token]);

  const notify = (kind: 'ok' | 'err', text: string) => setToast({ kind, text });

  async function refreshAll(activeToken = token) {
    try {
      const [ov, orgRes, usrRes] = await Promise.all([
        apiRequest<PlatformOverview>('/api/v1/superadmin/overview', {}, activeToken),
        apiRequest<{ organizations: OrgRow[] }>('/api/v1/superadmin/organizations', {}, activeToken),
        apiRequest<{ users: GlobalUserRow[] }>('/api/v1/superadmin/users', {}, activeToken),
      ]);
      setOverview(ov);
      setOrgs(orgRes.organizations);
      setUsers(usrRes.users);
      if (selectedOrg) {
        await loadOrgDetail(selectedOrg.organization.org_id, activeToken);
      } else if (orgRes.organizations[0]) {
        await loadOrgDetail(orgRes.organizations[0].orgId, activeToken);
      }
    } catch (err) {
      notify('err', (err as Error).message);
    }
  }

  async function loadOrgDetail(orgId: string, activeToken = token) {
    try {
      const detail = await apiRequest<OrgDetail>(`/api/v1/superadmin/organizations/${orgId}`, {}, activeToken);
      setSelectedOrg(detail);
    } catch (err) {
      notify('err', (err as Error).message);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await apiRequest<{ accessToken: string }>('/api/v1/auth/superadmin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      sessionStorage.setItem(TOKEN_KEY, res.accessToken);
      setToken(res.accessToken);
      setPassword('');
      notify('ok', 'Authenticated as Platform Superadmin (devraj).');
    } catch (err) {
      notify('err', (err as Error).message);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken('');
    setSelectedOrg(null);
    setOverview(null);
  }

  async function toggleMemberStatus(orgId: string, userId: string, current: 'ACTIVE' | 'SUSPENDED') {
    const next = current === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await apiRequest(
        `/api/v1/superadmin/organizations/${orgId}/users/${userId}/status`,
        { method: 'PATCH', body: JSON.stringify({ status: next }) },
        token,
      );
      notify('ok', `Updated ${userId} status to ${next}.`);
      await loadOrgDetail(orgId);
    } catch (err) {
      notify('err', (err as Error).message);
    }
  }

  async function updateProjectStatus(orgId: string, projectId: string, status: string) {
    try {
      await apiRequest(
        `/api/v1/superadmin/organizations/${orgId}/projects/${projectId}/status`,
        { method: 'PATCH', body: JSON.stringify({ status }) },
        token,
      );
      notify('ok', `Project ${projectId} → ${status}`);
      await refreshAll();
    } catch (err) {
      notify('err', (err as Error).message);
    }
  }

  async function updateStageStatus(orgId: string, stageId: string, status: string) {
    try {
      await apiRequest(
        `/api/v1/superadmin/organizations/${orgId}/stages/${stageId}/status`,
        { method: 'PATCH', body: JSON.stringify({ status }) },
        token,
      );
      notify('ok', `Milestone ${stageId} → ${status}`);
      await loadOrgDetail(orgId);
    } catch (err) {
      notify('err', (err as Error).message);
    }
  }

  async function updateTaskStatus(orgId: string, taskId: string, status: string) {
    try {
      await apiRequest(
        `/api/v1/superadmin/organizations/${orgId}/tasks/${taskId}`,
        { method: 'PATCH', body: JSON.stringify({ status }) },
        token,
      );
      notify('ok', `Task ${taskId} → ${status}`);
      await refreshAll();
    } catch (err) {
      notify('err', (err as Error).message);
    }
  }

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080a0f] px-4 text-slate-100">
        <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0e121a] p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <NexoraMark className="h-8 w-8" />
              <div>
                <h1 className="font-display text-lg font-bold">Platform Governance</h1>
                <p className="text-xs text-slate-400">Restricted Root Superadmin Console</p>
              </div>
            </div>
            <ShieldAlert className="h-5 w-5 text-amber-400" />
          </div>

          {toast && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{toast.text}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">Superadmin Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="devraj"
                autoComplete="username"
                required
                className="w-full rounded-lg border border-white/10 bg-[#080a0f] px-3.5 py-2.5 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-white/10 bg-[#080a0f] px-3.5 py-2.5 text-sm text-slate-100"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Unlock Global Governance Panel
            </button>
          </form>

          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Organization Portal
          </Link>
        </div>
      </main>
    );
  }

  const filteredOrgs = orgs.filter(
    (o) =>
      o.orgId.toLowerCase().includes(search.toLowerCase()) ||
      o.orgName.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.userId.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-[#080a0f] text-slate-100">
      <header className="border-b border-white/[0.08] bg-[#0e121a]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <NexoraMark className="h-8 w-8" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg font-bold">Nexora Root Governance</h1>
                <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[11px] text-amber-300">
                  SUPERADMIN: devraj
                </span>
              </div>
              <p className="text-xs text-slate-400">Cross-Shard Oversight across Shards 1, 2 &amp; 3</p>
            </div>
          </div>

          <nav className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#080a0f] p-1">
            {[
              { id: 'orgs' as const, label: 'Organizations & Projects', icon: Building2 },
              { id: 'users' as const, label: 'Global Users', icon: Users },
            ].map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className="relative flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-white"
                >
                  {active && (
                    <motion.div
                      layoutId="superadmin-tab-pill"
                      className="absolute inset-0 rounded-full bg-emerald-600"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="relative z-10 h-3.5 w-3.5" />
                  <span className={`relative z-10 ${active ? 'text-white font-semibold' : ''}`}>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refreshAll()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#131924] px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {toast && (
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs ${
              toast.kind === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
            }`}
          >
            {toast.kind === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <span>{toast.text}</span>
          </div>
        )}

        {overview && (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 tabular-nums">
            <div className="rounded-xl border border-white/[0.08] bg-[#0e121a] p-4">
              <div className="text-xs text-slate-400">Organizations (S1/S2/S3)</div>
              <div className="mt-1 font-display text-2xl font-bold">{overview.totalOrgs}</div>
              <div className="mt-1 font-mono text-[11px] text-emerald-400">
                S1:{overview.shardOrgCounts['1'] ?? 0} • S2:{overview.shardOrgCounts['2'] ?? 0} • S3:{overview.shardOrgCounts['3'] ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0e121a] p-4">
              <div className="text-xs text-slate-400">Global Users</div>
              <div className="mt-1 font-display text-2xl font-bold">{overview.totalUsers}</div>
              <div className="mt-1 text-[11px] text-slate-400">{overview.verifiedUsers} email verified</div>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0e121a] p-4">
              <div className="text-xs text-slate-400">Projects</div>
              <div className="mt-1 font-display text-2xl font-bold">{overview.totalProjects}</div>
              <div className="mt-1 text-[11px] text-amber-400">{overview.crossOrgCollaborations} cross-org links</div>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0e121a] p-4">
              <div className="text-xs text-slate-400">Milestones / Stages</div>
              <div className="mt-1 font-display text-2xl font-bold">{overview.totalStages}</div>
              <div className="mt-1 text-[11px] text-slate-400">Across all projects</div>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0e121a] p-4">
              <div className="text-xs text-slate-400">Tasks Completed</div>
              <div className="mt-1 font-display text-2xl font-bold">
                {overview.completedTasks}/{overview.totalTasks}
              </div>
              <div className="mt-1 text-[11px] text-emerald-400">
                {overview.totalTasks ? Math.round((overview.completedTasks / overview.totalTasks) * 100) : 0}% completion
              </div>
            </div>
          </section>
        )}

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by Org ID, Name, User Email..."
            className="w-full rounded-lg border border-white/10 bg-[#0e121a] py-2 pl-9 pr-3 text-sm text-slate-100"
          />
        </div>

        {tab === 'orgs' && (
          <div className="grid gap-6 lg:grid-cols-12">
            <aside className="lg:col-span-4 space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                All Organizations ({filteredOrgs.length})
              </h2>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {filteredOrgs.map((org) => {
                  const isSelected = selectedOrg?.organization.org_id === org.orgId;
                  return (
                    <button
                      key={org.orgId}
                      type="button"
                      onClick={() => loadOrgDetail(org.orgId)}
                      className={`w-full rounded-xl border p-3.5 text-left transition-colors ${
                        isSelected
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : 'border-white/[0.08] bg-[#0e121a] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-xs">
                        <span className="text-emerald-400">{org.orgId}</span>
                        <span className="rounded bg-[#131924] px-1.5 py-0.5 text-[11px] text-slate-300">
                          Shard {org.shardId}
                        </span>
                      </div>
                      <div className="mt-1 font-display text-sm font-semibold">{org.orgName}</div>
                      <div className="mt-2 flex gap-3 text-[11px] text-slate-400 tabular-nums">
                        <span>{org.memberCount} users</span>
                        <span>{org.projectCount} projects</span>
                        <span>{org.stageCount} stages</span>
                        <span>{org.taskCount} tasks</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="lg:col-span-8 space-y-6">
              {selectedOrg ? (
                <>
                  <div className="rounded-2xl border border-white/[0.08] bg-[#0e121a] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="font-display text-lg font-bold">{selectedOrg.organization.name}</h2>
                        <p className="font-mono text-xs text-slate-400">
                          {selectedOrg.organization.org_id} • Shard {selectedOrg.organization.shardId} •{' '}
                          {selectedOrg.roles.length} roles
                        </p>
                      </div>
                    </div>

                    <h3 className="mt-5 mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <Users className="h-3.5 w-3.5" /> Organization Users ({selectedOrg.members.length})
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-white/10 text-slate-400">
                          <tr>
                            <th className="py-2 pr-3">User</th>
                            <th className="py-2 pr-3">Roles</th>
                            <th className="py-2 pr-3">Status</th>
                            <th className="py-2 text-right">Governance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06]">
                          {selectedOrg.members.map((m) => (
                            <tr key={m.userId}>
                              <td className="py-2.5 pr-3">
                                <div className="font-medium text-slate-100">{m.fullName ?? m.userId}</div>
                                <div className="font-mono text-[11px] text-slate-400">{m.email}</div>
                              </td>
                              <td className="py-2.5 pr-3">
                                <div className="flex flex-wrap gap-1">
                                  {m.roleNames.map((rn) => (
                                    <span
                                      key={rn}
                                      className="rounded bg-[#131924] px-2 py-0.5 font-mono text-[11px] text-emerald-300"
                                    >
                                      {rn}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-2.5 pr-3 font-mono">
                                <span className={m.status === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400'}>
                                  {m.status}
                                </span>
                              </td>
                              <td className="py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleMemberStatus(selectedOrg.organization.org_id, m.userId, m.status)
                                  }
                                  className="rounded border border-white/15 bg-[#131924] px-2.5 py-1 text-[11px] hover:bg-white/10"
                                >
                                  {m.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <FolderKanban className="h-3.5 w-3.5" /> Projects, Milestones &amp; Tasks ({selectedOrg.projects.length})
                    </h3>
                    {selectedOrg.projects.map((p) => (
                      <div key={p.projectId} className="rounded-2xl border border-white/[0.08] bg-[#0e121a] p-5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="font-mono text-xs text-emerald-400">{p.projectId}</div>
                            <div className="font-display text-base font-semibold">{p.title}</div>
                          </div>
                          <select
                            aria-label={`Project status for ${p.projectId}`}
                            value={p.status}
                            onChange={(e) =>
                              updateProjectStatus(selectedOrg.organization.org_id, p.projectId, e.target.value)
                            }
                            className="rounded-lg border border-white/15 bg-[#080a0f] px-2.5 py-1.5 font-mono text-xs text-slate-100"
                          >
                            {['LEAD', 'PLANNING', 'ACTIVE', 'VERIFICATION', 'FINALIZED', 'ARCHIVED'].map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>

                        {p.collaborators.length > 0 && (
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            {p.collaborators.map((c) => (
                              <span
                                key={c.userId}
                                className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-amber-300"
                              >
                                Partner {c.partnerOrgId}: {c.fullName ?? c.userId} ({c.roleName})
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="space-y-3">
                          {p.stages.map((st) => (
                            <div key={st.stageId} className="rounded-xl border border-white/[0.06] bg-[#080a0f] p-3.5 space-y-2.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-xs font-semibold">
                                  <Layers className="h-3.5 w-3.5 text-emerald-400" />
                                  <span>
                                    {st.orderIndex}. {st.name}
                                  </span>
                                  <span className="font-mono text-[11px] text-slate-500">{st.stageId}</span>
                                </div>
                                <select
                                  aria-label={`Stage status for ${st.stageId}`}
                                  value={st.status}
                                  onChange={(e) =>
                                    updateStageStatus(selectedOrg.organization.org_id, st.stageId, e.target.value)
                                  }
                                  className="rounded border border-white/10 bg-[#131924] px-2 py-1 font-mono text-[11px] text-slate-200"
                                >
                                  {['PENDING', 'IN_PROGRESS', 'AWAITING_VERIFICATION', 'COMPLETED', 'BLOCKED'].map((s) => (
                                    <option key={s} value={s}>
                                      {s}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {st.tasks.length > 0 && (
                                <div className="space-y-1.5 pl-4">
                                  {st.tasks.map((t) => (
                                    <div
                                      key={t.taskId}
                                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#131924]/70 px-3 py-2 text-xs"
                                    >
                                      <div>
                                        <span className="font-medium text-slate-100">{t.title}</span>
                                        <span className="ml-2 font-mono text-[11px] text-slate-400">
                                          {t.taskId} • {t.taskType}
                                          {t.assignedUserId ? ` • Assignee: ${t.assignedUserId}` : ''}
                                          {t.efficiencyScore !== null ? ` • AI: ${t.efficiencyScore}%` : ''}
                                        </span>
                                      </div>
                                      <select
                                        aria-label={`Task status for ${t.taskId}`}
                                        value={t.status}
                                        onChange={(e) =>
                                          updateTaskStatus(selectedOrg.organization.org_id, t.taskId, e.target.value)
                                        }
                                        className="rounded border border-white/10 bg-[#080a0f] px-2 py-1 font-mono text-[11px] text-emerald-300"
                                      >
                                        {['TODO', 'IN_TRANSIT', 'ON_FIELD', 'SUBMITTED', 'COMPLETED', 'VERIFIED', 'REJECTED'].map(
                                          (ts) => (
                                            <option key={ts} value={ts}>
                                              {ts}
                                            </option>
                                          ),
                                        )}
                                      </select>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-white/[0.08] bg-[#0e121a] p-8 text-sm text-slate-400">
                  Select an organization on the left to inspect and govern its users, projects, milestones, and tasks.
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'users' && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#0e121a] p-5 overflow-x-auto">
            <h2 className="mb-3 font-display text-base font-semibold">
              Global Platform Users ({filteredUsers.length})
            </h2>
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-slate-400">
                <tr>
                  <th className="py-2 pr-3">User ID</th>
                  <th className="py-2 pr-3">Name / Email</th>
                  <th className="py-2 pr-3">Organizations</th>
                  <th className="py-2">Cross-Org Collaborations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredUsers.map((u) => (
                  <tr key={u.userId}>
                    <td className="py-2.5 pr-3 font-mono text-emerald-400">{u.userId}</td>
                    <td className="py-2.5 pr-3">
                      <div className="font-medium text-slate-100">{u.fullName}</div>
                      <div className="font-mono text-[11px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex flex-wrap gap-1">
                        {u.organizations.map((o) => (
                          <span key={o.org_id} className="rounded bg-[#131924] px-2 py-0.5 font-mono text-[11px]">
                            {o.org_id} (S{o.shard_id})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {u.collaborations.map((c) => (
                          <span
                            key={`${c.project_id}-${c.owner_org_id}`}
                            className="rounded bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] text-amber-300"
                          >
                            {c.project_id} ({c.owner_org_id})
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
