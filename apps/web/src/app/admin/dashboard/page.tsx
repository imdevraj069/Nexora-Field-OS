'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import {
  Building2,
  Users,
  FolderKanban,
  CheckSquare,
  Link2,
  Layers,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  Database,
} from 'lucide-react';
import { useAdminAuth } from '../layout';
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
  const { token } = useAdminAuth();
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [recentOrgs, setRecentOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [ov, orgRes] = await Promise.all([
        apiRequest<PlatformOverview>('/api/v1/superadmin/overview', {}, token),
        apiRequest<{ organizations: OrgRow[] }>('/api/v1/superadmin/organizations', {}, token),
      ]);
      setOverview(ov);
      // Sort by createdAt desc for recent
      const sorted = [...orgRes.organizations].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setRecentOrgs(sorted.slice(0, 5));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (token) void load(); }, [token]);

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
        <button onClick={load} className="underline cursor-pointer hover:text-red-200 transition-colors">
          retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Dashboard"
        subtitle="Real-time overview of all Nexora Field OS operations"
        action={
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0e121a] px-3.5 py-2 text-xs font-medium text-slate-300 hover:border-emerald-500/30 hover:text-emerald-300 transition-all cursor-pointer"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        }
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Organizations',
            value: overview?.totalOrgs ?? 0,
            sub: `Across ${Object.keys(overview?.shardOrgCounts ?? {}).length} shards`,
            icon: Building2,
            accent: 'text-emerald-400',
          },
          {
            label: 'Platform Users',
            value: overview?.totalUsers ?? 0,
            sub: `${verifiedRate}% verified`,
            icon: Users,
            accent: undefined,
          },
          {
            label: 'Active Projects',
            value: overview?.totalProjects ?? 0,
            sub: `${overview?.totalStages ?? 0} stages total`,
            icon: FolderKanban,
            accent: undefined,
          },
          {
            label: 'Task Completion',
            value: `${completionRate}%`,
            sub: `${overview?.completedTasks ?? 0} / ${overview?.totalTasks ?? 0} tasks`,
            icon: CheckSquare,
            accent: completionRate >= 70 ? 'text-emerald-400' : completionRate >= 40 ? 'text-amber-400' : 'text-red-400',
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
          <StatCard
            label="Cross-Org Collaborations"
            value={overview?.crossOrgCollaborations ?? 0}
            sub="Active partner links"
            icon={Link2}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
          <StatCard
            label="Verified Users"
            value={overview?.verifiedUsers ?? 0}
            sub={`${verifiedRate}% of total`}
            icon={TrendingUp}
          />
        </motion.div>
      </div>

      {/* Shard distribution */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card>
          <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
            <Database size={15} className="text-emerald-400" />
            <h2 className="font-display text-sm font-semibold text-white">Shard Distribution</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.05] text-xs text-slate-500">
                  <th className="px-5 py-3 text-left">Shard</th>
                  <th className="px-5 py-3 text-left">Organizations</th>
                  <th className="px-5 py-3 text-left">Load Share</th>
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
                      <td className="px-5 py-3.5 font-mono text-slate-100">{count}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-24 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-slate-400">{pct}%</span>
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
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}>
        <Card>
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
            <div className="flex items-center gap-3">
              <Layers size={15} className="text-emerald-400" />
              <h2 className="font-display text-sm font-semibold text-white">Recent Organizations</h2>
            </div>
            <Link
              href="/admin/organizations"
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {recentOrgs.map((org) => (
              <Link
                key={org.orgId}
                href={`/admin/organizations/${org.orgId}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer group"
              >
                {/* Initials avatar */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/20">
                  <span className="font-display text-xs font-bold text-emerald-400">
                    {org.orgInitials || org.orgName.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-100 truncate">{org.orgName}</p>
                  <p className="text-xs text-slate-500 truncate font-mono">{org.orgId}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                  <ShardBadge shard={org.shardId} />
                  <span>{org.memberCount} members</span>
                  <span>{org.projectCount} projects</span>
                  <ArrowRight size={13} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
