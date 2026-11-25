'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Link2,
  Building2,
} from 'lucide-react';
import { useAdminAuth, getStoredAdminToken } from '../layout';
import { apiRequest } from '../../../services/nexoraClient';
import {
  GlobalUserRow,
  Card,
  PageHeader,
  ShardBadge,
  Spinner,
  EmptyState,
} from '../../../components/admin/shared';

export default function UsersPage() {
  const { token: authContextToken } = useAdminAuth();
  const [users, setUsers] = useState<GlobalUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const token = authContextToken || getStoredAdminToken();
    if (!token) return;

    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<{ users: GlobalUserRow[] }>('/api/v1/superadmin/users', {}, token);
      setUsers(res.users);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [authContextToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = users.filter(
    (u) =>
      u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.userId?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Users"
        subtitle={`${users.length} registered user profiles across all active tenant shards`}
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
          placeholder="Search by name, email, or ID…"
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
          <button onClick={() => void load()} className="underline cursor-pointer hover:text-red-200">
            retry
          </button>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] text-zinc-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5 text-left">User</th>
                  <th className="px-5 py-3.5 text-left">Validation</th>
                  <th className="px-5 py-3.5 text-left">Home Organizations</th>
                  <th className="px-5 py-3.5 text-left">Partner Collaborations</th>
                  <th className="px-5 py-3.5 text-left">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState message="No users match your search criteria." />
                    </td>
                  </tr>
                ) : (
                  filtered.map((u, i) => (
                    <motion.tr
                      key={u.userId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* User */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 border border-white/[0.08]">
                            <span className="text-xs font-semibold text-zinc-300">
                              {u.fullName?.[0]?.toUpperCase() ?? '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-zinc-100">{u.fullName || '—'}</p>
                            <p className="font-mono text-[11px] text-zinc-500">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Verified */}
                      <td className="px-5 py-3.5">
                        {u.isVerified ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 border border-orange-500/25 px-2.5 py-0.5 text-[11px] font-medium text-orange-300">
                            <CheckCircle2 size={11} className="text-orange-400" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 border border-zinc-700/40 px-2.5 py-0.5 text-[11px] font-medium text-zinc-400">
                            <XCircle size={11} className="text-zinc-500" />
                            Unverified
                          </span>
                        )}
                      </td>

                      {/* Organizations */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {u.organizations.length === 0 ? (
                            <span className="text-xs text-zinc-600">None</span>
                          ) : (
                            u.organizations.map((o) => (
                              <span
                                key={o.org_id}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#18181b] border border-white/[0.06] px-2 py-0.5 text-[11px] font-mono text-zinc-300"
                              >
                                <Building2 size={10} className="text-zinc-500" />
                                {o.org_name || o.org_id}
                                <ShardBadge shard={o.shard_id} />
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Collaborations */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {u.collaborations.length === 0 ? (
                            <span className="text-xs text-zinc-600">None</span>
                          ) : (
                            u.collaborations.map((c) => (
                              <span
                                key={`${c.project_id}-${c.owner_org_id}`}
                                className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[11px] font-mono text-rose-300"
                              >
                                <Link2 size={10} />
                                {c.project_role_name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Joined */}
                      <td className="px-5 py-3.5 text-xs text-zinc-400 font-mono whitespace-nowrap">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
