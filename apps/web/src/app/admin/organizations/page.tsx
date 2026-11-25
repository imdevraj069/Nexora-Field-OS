'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import {
  Building2,
  Search,
  ArrowRight,
  Users,
  FolderKanban,
  CheckSquare,
  RefreshCw,
} from 'lucide-react';
import { useAdminAuth } from '../layout';
import { apiRequest } from '../../../services/nexoraClient';
import {
  OrgRow,
  Card,
  PageHeader,
  ShardBadge,
  Spinner,
  EmptyState,
} from '../../../components/admin/shared';

export default function OrganizationsPage() {
  const { token } = useAdminAuth();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<{ organizations: OrgRow[] }>('/api/v1/superadmin/organizations', {}, token);
      setOrgs(res.organizations);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (token) void load(); }, [token]);

  const filtered = orgs.filter(
    (o) =>
      o.orgName.toLowerCase().includes(search.toLowerCase()) ||
      o.orgId.toLowerCase().includes(search.toLowerCase()) ||
      o.industryType?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        subtitle={`${orgs.length} organizations across the platform`}
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, ID, industry…"
          className="w-full rounded-xl border border-white/[0.08] bg-[#0e121a] py-2.5 pl-9 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/15 transition-all"
        />
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner size={24} />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-300">
          {error} —{' '}
          <button onClick={load} className="underline cursor-pointer hover:text-red-200 transition-colors">
            retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState message={search ? 'No organizations match your search.' : 'No organizations found.'} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((org, i) => (
            <motion.div
              key={org.orgId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <OrgCard org={org} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrgCard({ org }: { org: OrgRow }) {
  return (
    <Link
      href={`/admin/organizations/${org.orgId}`}
      className="group block rounded-2xl border border-white/[0.07] bg-[#0e121a] p-5 hover:border-emerald-500/25 hover:bg-[#0e121a]/80 transition-all duration-200 cursor-pointer"
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/20">
            <span className="font-display text-sm font-bold text-emerald-400">
              {org.orgInitials || org.orgName.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold text-white leading-tight truncate max-w-[140px]">
              {org.orgName}
            </p>
            <p className="text-[11px] font-mono text-slate-500 truncate">{org.orgId}</p>
          </div>
        </div>
        <ShardBadge shard={org.shardId} />
      </div>

      {/* Industry */}
      {org.industryType && (
        <p className="mb-4 text-xs text-slate-400 flex items-center gap-1.5">
          <Building2 size={11} />
          {org.industryType}
        </p>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Users size={11} className="text-slate-600" />
          {org.memberCount}
        </span>
        <span className="flex items-center gap-1.5">
          <FolderKanban size={11} className="text-slate-600" />
          {org.projectCount}
        </span>
        <span className="flex items-center gap-1.5">
          <CheckSquare size={11} className="text-slate-600" />
          {org.taskCount}
        </span>
        <span className="ml-auto flex items-center gap-1 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
          View <ArrowRight size={12} />
        </span>
      </div>
    </Link>
  );
}
