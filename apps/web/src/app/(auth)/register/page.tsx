'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { AlertCircle, ArrowRight, Building2, CheckCircle2, Shield, User } from 'lucide-react';
import { NexoraMark } from '@/components/svg/NexoraMark';
import { apiRequest } from '@/services/nexoraClient';
import { useWorkspaceAuth, ActiveOrg, UserSession } from '@/hooks/useWorkspaceAuth';

interface RegisterResponse {
  accessToken: string;
  user: UserSession;
  organization: {
    org_id: string;
    name: string;
    shardId: number;
  };
  roleId: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useWorkspaceAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [orgName, setOrgName] = useState('');
  const [industryType, setIndustryType] = useState('Renewable Energy & Infrastructure');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiRequest<RegisterResponse>('/api/v1/auth/register-org', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          email,
          password,
          orgName,
          industryType,
        }),
      });

      const activeOrg: ActiveOrg = {
        org_id: res.organization.org_id,
        org_name: res.organization.name,
        role_id: res.roleId,
        shard_id: res.organization.shardId,
      };

      login(res.accessToken, res.user, activeOrg, [activeOrg]);
      window.location.href = '/dashboard';
    } catch (err) {
      setError((err as Error).message || 'Failed to create organization.');
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
        className="relative w-full max-w-lg"
      >
        <div className="rounded-2xl border border-white/[0.08] bg-[#121215]/95 p-8 shadow-2xl backdrop-blur-2xl">
          <div className="text-center mb-6">
            <Link href="/" className="inline-block">
              <div className="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600/20 via-orange-500/20 to-amber-500/10 border border-orange-500/30 shadow-inner">
                <NexoraMark className="h-6 w-6 text-orange-400" />
              </div>
            </Link>
            <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-white">Create Your Organization</h1>
            <p className="mt-1 text-sm text-zinc-400">Establish your shard-isolated tenant operations environment</p>
          </div>

          {/* Stepper indicator */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border ${
              step === 1 ? 'border-orange-500/50 bg-orange-500/10 text-orange-300' : 'border-white/[0.06] text-zinc-500'
            }`}>
              1. Administrator Account
            </span>
            <span className="text-zinc-600">→</span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border ${
              step === 2 ? 'border-orange-500/50 bg-orange-500/10 text-orange-300' : 'border-white/[0.06] text-zinc-500'
            }`}>
              2. Organization Details
            </span>
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

          <form onSubmit={handleRegister}>
            {step === 1 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full rounded-xl border border-white/[0.08] bg-[#18181b] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Work Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@acme-corp.com"
                    className="w-full rounded-xl border border-white/[0.08] bg-[#18181b] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-white/[0.08] bg-[#18181b] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                <button
                  type="button"
                  disabled={!fullName || !email || password.length < 6}
                  onClick={() => setStep(2)}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  Continue to Organization Info
                  <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Organization / Company Name</label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="SolarEdge Solutions"
                    className="w-full rounded-xl border border-white/[0.08] bg-[#18181b] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Industry Sector</label>
                  <select
                    value={industryType}
                    onChange={(e) => setIndustryType(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#18181b] px-3.5 py-2.5 text-sm text-zinc-100 outline-none focus:border-orange-500/60 cursor-pointer"
                  >
                    <option value="Renewable Energy & Infrastructure">Renewable Energy & Infrastructure</option>
                    <option value="Telecom & Tower Operations">Telecom & Tower Operations</option>
                    <option value="Civil Construction & Engineering">Civil Construction & Engineering</option>
                    <option value="Utility & Electrical Grid">Utility & Electrical Grid</option>
                    <option value="Logistics & Field Service">Logistics & Field Service</option>
                  </select>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-[#18181b] p-3 text-xs text-zinc-400 flex items-start gap-2.5">
                  <Shield size={16} className="text-orange-400 mt-0.5 shrink-0" />
                  <span>
                    Your tenant will be provisioned on a dedicated PostgreSQL shard with tenant-level RBAC and automatic logical replication.
                  </span>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 rounded-xl border border-white/[0.08] bg-[#18181b] px-3 py-2.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !orgName}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Provisioning Tenant…
                      </>
                    ) : (
                      <>
                        Create Organization
                        <CheckCircle2 size={15} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          <div className="mt-6 border-t border-white/[0.06] pt-5 text-center text-xs text-zinc-400">
            Already registered?{' '}
            <Link href="/login" className="font-semibold text-orange-400 hover:text-orange-300 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
