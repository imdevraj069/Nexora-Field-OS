'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { NexoraMark } from '../../components/svg/NexoraMark';
import { apiRequest } from '../../services/nexoraClient';
import { useAdminAuth } from './layout';

export default function AdminLoginPage() {
  const { setToken } = useAdminAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest<{ accessToken: string }>('/api/v1/auth/superadmin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setToken(res.accessToken);
    } catch (err) {
      setError((err as Error).message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090b] p-4">
      {/* Background radial glow - smooth cherry orange */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[650px] w-[650px] rounded-full bg-gradient-to-tr from-rose-600/10 via-orange-500/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:24px_24px]" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm"
      >
        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#121215]/90 p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-500/30 bg-gradient-to-tr from-red-600/20 via-orange-500/20 to-amber-500/10 shadow-inner">
              <NexoraMark className="h-7 w-7 text-orange-400" />
            </div>
            <h1 className="font-display text-xl font-bold tracking-tight text-white">Platform Admin</h1>
            <p className="mt-1 text-sm text-zinc-400">Restricted access — authorized personnel only</p>
          </div>

          {/* Error */}
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

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-xs font-medium text-zinc-300">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="devraj"
                required
                className="w-full rounded-xl border border-white/[0.08] bg-[#18181b] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-zinc-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-white/[0.08] bg-[#18181b] px-3.5 py-2.5 pr-10 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-950/40 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Authenticating…
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Sign in to Admin
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] text-zinc-500">
            Nexora Field OS · Operations Command Center
          </p>
        </div>
      </motion.div>
    </div>
  );
}
