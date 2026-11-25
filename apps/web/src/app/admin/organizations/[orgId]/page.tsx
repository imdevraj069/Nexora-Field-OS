'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Users,
  FolderKanban,
  Shield,
  RefreshCw,
  ArrowRight,
  UserCheck,
  UserX,
  CheckSquare,
  Layers,
  Link2,
  Building2,
  ArrowLeft,
} from 'lucide-react';
import { useAdminAuth } from '../../layout';
import { apiRequest } from '../../../../services/nexoraClient';
import {
  OrgDetail,
  Card,
  ShardBadge,
  StatusBadge,
  Spinner,
  EmptyState,
} from '../../../../components/admin/shared';

type TabId = 'members' | 'projects' | 'roles';

export default function OrgDetailPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { token } = useAdminAuth();
  const [detail, setDetail] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabId>('members');
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const d = await apiRequest<OrgDetail>(`/api/v1/superadmin/organizations/${orgId}`, {}, token);
      setDetail(d);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (token && orgId) void load(); }, [token, orgId]);

  function notify(kind: 'ok' | 'err', text: string) {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 3000);
  }

  async function toggleUserStatus(userId: string, current: 'ACTIVE' | 'SUSPENDED') {
    const newStatus = current === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await apiRequest(
        `/api/v1/superadmin/organizations/${orgId}/users/${userId}/status`,
        { method: 'PATCH', body: JSON.stringify({ status: newStatus }) },
        token,
      );
      notify('ok', `User ${newStatus.toLowerCase()}`);
      await load();
    } catch (err) {
      notify('err', (err as Error).message);
    }
  }

  async function updateProjectStatus(projectId: string, status: string) {
    try {
      await apiRequest(
        `/api/v1/superadmin/organizations/${orgId}/projects/${projectId}/status`,
        { method: 'PATCH', body: JSON.stringify({ status }) },
        token,
      );
      notify('ok', 'Project status updated');
      await load();
    } catch (err) {
      notify('err', (err as Error).message);
    }
  }

  const org = detail?.organization;

  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur-md
              ${toast.kind === 'ok'
                ? 'border-orange-500/40 bg-orange-950/80 text-orange-200'
                : 'border-red-500/40 bg-red-950/80 text-red-200'
              }`}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      <Link
        href="/admin/organizations"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-orange-400 transition-colors cursor-pointer"
      >
        <ArrowLeft size={13} /> Back to Organizations
      </Link>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size={28} />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-300">
          {error} —{' '}
          <button onClick={load} className="underline cursor-pointer hover:text-red-200">
            retry
          </button>
        </div>
      ) : detail && org ? (
        <>
          {/* Header card */}
          <Card className="p-6">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600/20 via-orange-500/20 to-amber-500/10 border border-orange-500/30">
                <span className="font-display text-lg font-bold text-orange-300">
                  {org.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5 mb-1">
                  <h1 className="font-display text-xl font-bold tracking-tight text-white">{org.name}</h1>
                  <ShardBadge shard={org.shardId} />
                </div>
                <p className="font-mono text-xs text-zinc-500">{org.org_id}</p>
                {org.industry_type && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-400">
                    <Building2 size={12} className="text-zinc-500" />
                    {org.industry_type}
                  </p>
                )}
              </div>
              {/* Quick metrics */}
              <div className="flex gap-7 text-center ml-auto">
                {[
                  { label: 'Members', value: detail.members.length, icon: Users },
                  { label: 'Projects', value: detail.projects.length, icon: FolderKanban },
                  { label: 'Roles', value: detail.roles.length, icon: Shield },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label}>
                    <p className="font-display text-2xl font-bold tracking-tight text-white">{value}</p>
                    <p className="text-[11px] text-zinc-500 flex items-center gap-1 justify-center mt-1">
                      <Icon size={11} /> {label}
                    </p>
                  </div>
                ))}
              </div>
              <button
                onClick={load}
                className="flex items-center gap-1.5 self-start rounded-xl border border-white/[0.08] bg-transparent px-3 py-2 text-xs text-zinc-400 hover:text-orange-300 hover:border-orange-500/40 transition-all cursor-pointer"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
          </Card>

          {/* Navigation tabs */}
          <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-[#121215] p-1 w-fit shadow-inner">
            {(['members', 'projects', 'roles'] as TabId[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative rounded-lg px-4 py-2 text-sm font-medium capitalize transition-all cursor-pointer ${
                  tab === t ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab === t && (
                  <motion.div
                    layoutId="org-tab"
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-red-500/20 via-orange-500/20 to-orange-500/10 border border-orange-500/30"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{t}</span>
              </button>
            ))}
          </div>

          {/* Tab contents */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {tab === 'members' && <MembersTab detail={detail} onToggle={toggleUserStatus} />}
              {tab === 'projects' && <ProjectsTab detail={detail} orgId={orgId} onStatusChange={updateProjectStatus} />}
              {tab === 'roles' && <RolesTab detail={detail} />}
            </motion.div>
          </AnimatePresence>
        </>
      ) : null}
    </div>
  );
}

// ─── Members Tab ──────────────────────────────────────────────────────────────
function MembersTab({
  detail,
  onToggle,
}: {
  detail: OrgDetail;
  onToggle: (userId: string, current: 'ACTIVE' | 'SUSPENDED') => void;
}) {
  const [pending, setPending] = useState<string | null>(null);

  async function handleToggle(userId: string, status: 'ACTIVE' | 'SUSPENDED') {
    setPending(userId);
    await onToggle(userId, status);
    setPending(null);
  }

  if (detail.members.length === 0) return <EmptyState message="No members found in this organization." />;

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[11px] text-zinc-500 uppercase tracking-wider">
              <th className="px-5 py-3.5 text-left">Member</th>
              <th className="px-5 py-3.5 text-left">Roles</th>
              <th className="px-5 py-3.5 text-left">Status</th>
              <th className="px-5 py-3.5 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {detail.members.map((m) => (
              <tr key={m.userId} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 border border-white/[0.08]">
                      <span className="text-xs font-semibold text-zinc-300">
                        {(m.fullName ?? m.email ?? '?')[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-zinc-100">{m.fullName || '—'}</p>
                      <p className="font-mono text-[11px] text-zinc-500">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-1.5">
                    {m.roleNames.length === 0 ? (
                      <span className="text-xs text-zinc-600">No roles</span>
                    ) : (
                      m.roleNames.map((r) => (
                        <span
                          key={r}
                          className="rounded-full bg-zinc-800/80 border border-white/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-zinc-300"
                        >
                          {r}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={m.status} />
                </td>
                <td className="px-5 py-3.5">
                  <button
                    onClick={() => void handleToggle(m.userId, m.status)}
                    disabled={pending === m.userId}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all cursor-pointer disabled:opacity-50
                      ${m.status === 'ACTIVE'
                        ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        : 'border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                      }`}
                  >
                    {pending === m.userId ? (
                      <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                    ) : m.status === 'ACTIVE' ? (
                      <UserX size={12} />
                    ) : (
                      <UserCheck size={12} />
                    )}
                    {m.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── Projects Tab ─────────────────────────────────────────────────────────────
const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'];

function ProjectsTab({
  detail,
  orgId,
  onStatusChange,
}: {
  detail: OrgDetail;
  orgId: string;
  onStatusChange: (projectId: string, status: string) => void;
}) {
  if (detail.projects.length === 0) return <EmptyState message="No projects in this organization." />;

  return (
    <div className="grid gap-3.5 sm:grid-cols-2">
      {detail.projects.map((p, i) => (
        <motion.div
          key={p.projectId}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
        >
          <Card className="p-5 hover:border-orange-500/30 transition-all duration-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-sm font-semibold text-white leading-tight truncate">
                  {p.title}
                </h3>
                <p className="font-mono text-[11px] text-zinc-500 mt-0.5">{p.projectId}</p>
              </div>
              <StatusBadge status={p.status} />
            </div>

            <div className="flex gap-4 text-xs text-zinc-400 mb-4">
              <span className="flex items-center gap-1">
                <Layers size={12} className="text-zinc-500" /> {p.stages.length} stages
              </span>
              <span className="flex items-center gap-1">
                <CheckSquare size={12} className="text-zinc-500" /> {p.stages.reduce((a, s) => a + s.tasks.length, 0)} tasks
              </span>
              {p.collaborators.length > 0 && (
                <span className="flex items-center gap-1 text-rose-400">
                  <Link2 size={12} /> {p.collaborators.length} collab
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/[0.04]">
              <select
                aria-label={`Status for project ${p.projectId}`}
                value={p.status}
                onChange={(e) => onStatusChange(p.projectId, e.target.value)}
                className="rounded-lg border border-white/[0.08] bg-[#18181b] px-2.5 py-1.5 text-[11px] font-mono text-zinc-300 outline-none focus:border-orange-500/50 cursor-pointer"
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <Link
                href={`/admin/organizations/${orgId}/projects/${p.projectId}`}
                className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 font-medium transition-colors cursor-pointer"
              >
                Inspect Project <ArrowRight size={13} />
              </Link>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Roles Tab ────────────────────────────────────────────────────────────────
function RolesTab({ detail }: { detail: OrgDetail }) {
  if (detail.roles.length === 0) return <EmptyState message="No roles configured." />;

  return (
    <Card>
      <div className="divide-y divide-white/[0.04]">
        {detail.roles.map((r) => (
          <div key={r.role_id} className="flex items-center gap-4 px-5 py-3.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20">
              <Shield size={14} className="text-orange-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-100">{r.name}</p>
              <p className="font-mono text-[11px] text-zinc-500">{r.role_id}</p>
            </div>
            {r.is_system && (
              <span className="rounded-full bg-zinc-800 border border-white/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-zinc-300">
                System Role
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
