'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import {
  Building2,
  Users,
  FolderKanban,
  CheckSquare,
  Link2,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  Database,
} from 'lucide-react';
import { useAdminAuth, getStoredAdminToken } from '../layout';
import { apiRequest } from '../../../services/nexoraClient';
import {
  PlatformOverview,
  OrgRow,
  StatCard,
  Card,
  PageHeader,
  ShardBadge,
  StatusBadge,
  Spinner,
} from '../../../components/admin/shared';

export default function DashboardPage() {
  const { token: authContextToken } = useAdminAuth();
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [recentOrgs, setRecentOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const token = authContextToken || getStoredAdminToken();
    if (!token) return;

    setLoading(true);
    setError('');
    try {
      const [ov, orgRes] = await Promise.all([
        apiRequest<PlatformOverview>('/api/v1/superadmin/overview', {}, token),
        apiRequest<{ organizations: OrgRow[] }>('/api/v1/superadmin/organizations', {}, token),
      ]);
      setOverview(ov);
      const sorted = [...orgRes.organizations].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setRecentOrgs(sorted.slice(0, 5));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [authContextToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const completionRate =
    overview && overview.totalTasks > 0
      ? Math.round((overview.completedTasks / overview.totalTasks) * 100)
      : 0;

  const verifiedRate =
    overview && overview.totalUsers > 0
      ? Math.round((overview.verifiedUsers / overview.totalUsers) * 100)
      : 0;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-300">
        {error} —{' '}
        <button onClick={() => void load()} className="underline cursor-pointer hover:text-red-200 transition-colors">
          retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Dashboard"
        subtitle="Real-time telemetry and overview across all active shards"
        action={
          <button
            onClick={() => void load()}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#121215] px-3.5 py-2 text-xs font-medium text-zinc-300 hover:border-orange-500/40 hover:text-orange-300 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        }
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Organizations',
            value: overview?.totalOrgs ?? 0,
            sub: `Across ${Object.keys(overview?.shardOrgCounts ?? {}).length} shards`,
            icon: Building2,
            accent: 'text-orange-400',
          },
          {
            label: 'Platform Users',
            value: overview?.totalUsers ?? 0,
            sub: `${verifiedRate}% verified accounts`,
            icon: Users,
            accent: 'text-zinc-100',
          },
          {
            label: 'Active Projects',
            value: overview?.totalProjects ?? 0,
            sub: `${overview?.totalStages ?? 0} milestones tracked`,
            icon: FolderKanban,
            accent: 'text-zinc-100',
          },
          {
            label: 'Task Completion',
            value: `${completionRate}%`,
            sub: `${overview?.completedTasks ?? 0} / ${overview?.totalTasks ?? 0} finished`,
            icon: CheckSquare,
            accent: completionRate >= 70 ? 'text-orange-400' : completionRate >= 40 ? 'text-amber-400' : 'text-rose-400',
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-2 gap-3.5">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <StatCard
            label="Cross-Org Collaborations"
            value={overview?.crossOrgCollaborations ?? 0}
            sub="Inter-organizational partnerships"
            icon={Link2}
            accent="text-rose-400"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <StatCard
            label="Verified Users"
            value={overview?.verifiedUsers ?? 0}
            sub={`${verifiedRate}% identity validation rate`}
            icon={TrendingUp}
            accent="text-amber-400"
          />
        </motion.div>
      </div>

      {/* Shard distribution */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Card>
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
            <Database size={16} className="text-orange-400" />
            <h2 className="font-display text-sm font-semibold text-white">Postgres Shard Distribution</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.05] text-xs text-zinc-500">
                  <th className="px-5 py-3 text-left">Shard</th>
                  <th className="px-5 py-3 text-left">Organizations</th>
                  <th className="px-5 py-3 text-left">Cluster Share</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {Object.entries(overview?.shardOrgCounts ?? {}).map(([shardId, count]) => {
                  const pct = overview?.totalOrgs
                    ? Math.round((count / overview.totalOrgs) * 100)
                    : 0;
                  return (
                    <tr key={shardId} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5">
                        <ShardBadge shard={Number(shardId)} />
                      </td>
                      <td className="px-5 py-3.5 font-mono text-zinc-100">{count}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-28 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-zinc-400">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status="ACTIVE" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* Recent orgs */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card>
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div className="flex items-center gap-3">
              <Building2 size={16} className="text-orange-400" />
              <h2 className="font-display text-sm font-semibold text-white">Recently Registered Organizations</h2>
            </div>
            <Link
              href="/admin/organizations"
              className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors cursor-pointer"
            >
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {recentOrgs.map((org) => (
              <Link
                key={org.orgId}
                href={`/admin/organizations/${org.orgId}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer group"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-red-600/20 via-orange-500/20 to-amber-500/10 border border-orange-500/25">
                  <span className="font-display text-xs font-bold text-orange-300">
                    {org.orgInitials || org.orgName.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-100 truncate group-hover:text-orange-300 transition-colors">{org.orgName}</p>
                  <p className="text-xs text-zinc-500 truncate font-mono">{org.orgId}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400 shrink-0">
                  <ShardBadge shard={org.shardId} />
                  <span>{org.memberCount} members</span>
                  <span>{org.projectCount} projects</span>
                  <ArrowRight size={13} className="text-zinc-600 group-hover:text-orange-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
