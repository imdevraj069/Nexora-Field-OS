'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import { CheckCircle2, AlertCircle, ArrowRight, Link2, Building2, Shield } from 'lucide-react';
import { apiRequest } from '@/services/nexoraClient';
import { useWorkspaceAuth, ActiveOrg, UserSession } from '@/hooks/useWorkspaceAuth';
import { MARLO_EASE } from '@/components/ui/motion';

interface InvitePreview {
  inviteId: string;
  orgId: string;
  orgName: string;
  email: string;
  roleName: string;
  invitedBy: string;
  requiresOnboarding: boolean;
}

export default function InviteAcceptPage() {
  const params = useParams();
  const token = params?.token as string;
  const { login } = useWorkspaceAuth();

  const [details, setDetails] = useState<InvitePreview | null>(null);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiRequest<InvitePreview>(`/api/v1/auth/invites/${token}`)
      .then((res) => setDetails(res))
      .catch((err) => setError((err as Error).message || 'Invalid or expired invitation.'))
      .finally(() => setFetching(false));
  }, [token]);

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<{
        accessToken: string;
        user: UserSession;
        activeOrg: ActiveOrg;
        userOrgs?: ActiveOrg[];
      }>('/api/v1/auth/accept-invite', {
        method: 'POST',
        body: JSON.stringify({
          token,
          fullName: details?.requiresOnboarding ? fullName : undefined,
          password: details?.requiresOnboarding ? password : undefined,
        }),
      });
      login(res.accessToken, res.user, res.activeOrg, res.userOrgs || [res.activeOrg]);
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 900);
    } catch (err) {
      setError((err as Error).message || 'Failed to accept invitation.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#09090b] p-4 text-zinc-100">
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[550px] w-[550px] rounded-full bg-gradient-to-tr from-rose-600/10 via-orange-500/10 to-transparent blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: MARLO_EASE }}
        className="relative w-full max-w-md"
      >
        <div className="rounded-[28px] border border-white/[0.08] bg-[#141417]/95 p-8 shadow-2xl backdrop-blur-2xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600/20 via-orange-500/20 to-amber-500/10 border border-orange-500/30 shadow-inner mb-4">
            <Link2 className="h-6 w-6 text-orange-400" />
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-white text-center">
            Workspace Invitation
          </h1>

          {fetching ? (
            <p className="mt-4 text-center text-xs text-zinc-400">Verifying invitation token…</p>
          ) : details ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-white/[0.06] bg-[#1a1a1f] p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 flex items-center gap-1.5"><Building2 size={13} /> Organization</span>
                  <span className="font-semibold text-white">{details.orgName} ({details.orgId})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 flex items-center gap-1.5"><Shield size={13} /> Role</span>
                  <span className="font-mono text-orange-300">{details.roleName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Invitee Email</span>
                  <span className="font-mono text-zinc-300">{details.email}</span>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-xs text-red-300">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} /> Joined {details.orgName}! Launching workspace…
                </div>
              ) : (
                <form onSubmit={handleAccept} className="space-y-3">
                  {details.requiresOnboarding && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">Full Name</label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Alex Verma"
                          className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">Create Password</label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-orange-500"
                        />
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 transition-all cursor-pointer"
                  >
                    {loading ? 'Joining Workspace…' : 'Accept & Launch Workspace'}
                    <ArrowRight size={15} />
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-xs text-red-300">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error || 'Invitation not found.'}</span>
            </div>
          )}

          <div className="mt-6 border-t border-white/[0.06] pt-5 text-center text-xs text-zinc-400">
            <Link href="/login" className="hover:text-white transition-colors">
              Return to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
