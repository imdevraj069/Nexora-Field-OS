'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { CheckCircle2, AlertCircle, ArrowRight, Link2, Shield } from 'lucide-react';
import { NexoraMark } from '@/components/svg/NexoraMark';
import { apiRequest } from '@/services/nexoraClient';
import { useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;
  const { user } = useWorkspaceAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleAccept() {
    setLoading(true);
    setError('');
    try {
      await apiRequest('/api/v1/auth/accept-invite', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err) {
      setError((err as Error).message || 'Invalid or expired invitation token.');
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
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="rounded-2xl border border-white/[0.08] bg-[#121215]/95 p-8 shadow-2xl backdrop-blur-2xl text-center">
          <div className="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600/20 via-orange-500/20 to-amber-500/10 border border-orange-500/30 shadow-inner mb-4">
            <Link2 className="h-6 w-6 text-orange-400" />
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-white">Project Collaboration Invite</h1>
          <p className="mt-1 text-sm text-zinc-400">
            You have been invited to participate in a stage-scoped milestone.
          </p>

          <div className="my-6 rounded-xl border border-white/[0.06] bg-[#18181b] p-4 text-xs text-zinc-300 font-mono break-all">
            Token: {token}
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-300 text-left">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-center justify-center gap-2">
              <CheckCircle2 size={16} /> Invitation accepted! Redirecting…
            </div>
          ) : (
            <button
              onClick={handleAccept}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Accepting…
                </>
              ) : (
                <>
                  Accept Collaboration Invitation
                  <ArrowRight size={15} />
                </>
              )}
            </button>
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
