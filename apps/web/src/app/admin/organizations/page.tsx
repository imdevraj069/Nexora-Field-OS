'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
import { useAdminAuth, getStoredAdminToken } from '../layout';
import { apiRequest } from '../../../services/nexoraClient';
import {
  OrgRow,
  PageHeader,
  ShardBadge,
  Spinner,
  EmptyState,
} from '../../../components/admin/shared';

export default function OrganizationsPage() {
  const { token: authContextToken } = useAdminAuth();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const token = authContextToken || getStoredAdminToken();
    if (!token) return;

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
  }, [authContextToken]);

  useEffect(() => {
    void load();
  }, [load]);

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
        subtitle={`${orgs.length} organizations managed across platform shards`}
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, ID, or industry…"
          className="w-full rounded-xl border border-white/[0.08] bg-[#121215] py-2.5 pl-9 pr-4 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/15 transition-all"
        />
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner size={24} />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-300">
          {error} —{' '}
          <button onClick={() => void load()} className="underline cursor-pointer hover:text-red-200 transition-colors">
            retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState message={search ? 'No organizations match your search.' : 'No organizations found.'} />
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((org, i) => (
            <motion.div
              key={org.orgId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
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
      className="group block rounded-2xl border border-white/[0.06] bg-[#121215]/90 p-5 hover:border-orange-500/35 hover:bg-[#151519] transition-all duration-200 cursor-pointer shadow-lg shadow-black/20"
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-red-600/20 via-orange-500/20 to-amber-500/10 border border-orange-500/30">
            <span className="font-display text-sm font-bold text-orange-300">
              {org.orgInitials || org.orgName.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold text-white leading-tight truncate max-w-[150px] group-hover:text-orange-300 transition-colors">
              {org.orgName}
            </p>
            <p className="text-[11px] font-mono text-zinc-500 truncate mt-0.5">{org.orgId}</p>
          </div>
        </div>
        <ShardBadge shard={org.shardId} />
      </div>

      {/* Industry */}
      {org.industryType && (
        <p className="mb-4 text-xs text-zinc-400 flex items-center gap-1.5">
          <Building2 size={12} className="text-zinc-500" />
          {org.industryType}
        </p>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-zinc-400 pt-3 border-t border-white/[0.04]">
        <span className="flex items-center gap-1.5">
          <Users size={12} className="text-zinc-500" />
          {org.memberCount}
        </span>
        <span className="flex items-center gap-1.5">
          <FolderKanban size={12} className="text-zinc-500" />
          {org.projectCount}
        </span>
        <span className="flex items-center gap-1.5">
          <CheckSquare size={12} className="text-zinc-500" />
          {org.taskCount}
        </span>
        <span className="ml-auto flex items-center gap-1 text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
          Manage <ArrowRight size={12} />
        </span>
      </div>
    </Link>
  );
}
