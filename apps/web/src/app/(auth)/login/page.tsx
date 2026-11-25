'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Eye, EyeOff, AlertCircle, ArrowRight, Building2, CheckCircle2 } from 'lucide-react';
import { NexoraMark } from '@/components/svg/NexoraMark';
import { apiRequest } from '@/services/nexoraClient';
import { useWorkspaceAuth, ActiveOrg, UserSession } from '@/hooks/useWorkspaceAuth';

interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: UserSession;
  activeOrg: ActiveOrg;
  userOrgs?: ActiveOrg[];
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useWorkspaceAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiRequest<LoginResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      login(res.accessToken, res.user, res.activeOrg, res.userOrgs || [res.activeOrg], res.refreshToken || null);
      // Immediate reliable browser redirection
      window.location.href = '/dashboard';
    } catch (err) {
      setError((err as Error).message || 'Invalid credentials or organization not found.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#09090b] p-4 text-zinc-100">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[550px] w-[550px] rounded-full bg-gradient-to-tr from-rose-600/10 via-orange-500/10 to-transparent blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="rounded-2xl border border-white/[0.08] bg-[#121215]/95 p-8 shadow-2xl backdrop-blur-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <div className="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600/20 via-orange-500/20 to-amber-500/10 border border-orange-500/30 shadow-inner">
                <NexoraMark className="h-6 w-6 text-orange-400" />
              </div>
            </Link>
            <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-white">Welcome Back</h1>
            <p className="mt-1 text-sm text-zinc-400">Sign in to your organization field workspace</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-300"
            >
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Work Email</label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tech@tenant.com"
                className="w-full rounded-xl border border-white/[0.08] bg-[#18181b] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#18181b] px-3.5 py-2.5 pr-10 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Authenticating…
                </>
              ) : (
                <>
                  Sign In to Workspace
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-white/[0.06] pt-5 text-center text-xs text-zinc-400">
            Need an organization?{' '}
            <Link href="/register" className="font-semibold text-orange-400 hover:text-orange-300 transition-colors">
              Create an organization
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
