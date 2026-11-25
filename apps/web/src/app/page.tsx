'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  Zap,
  Layers,
  ArrowRight,
  CheckCircle2,
  Lock,
  Globe2,
  Smartphone,
  Cpu,
  Sparkles,
  ChevronRight,
  Database,
  Users,
} from 'lucide-react';
import { NexoraMark } from '../components/svg/NexoraMark';
import { FadeIn } from '../components/ui/motion';

export default function MarketingLandingPage() {
  const [activeTaskStep, setActiveTaskStep] = useState(2); // 0: TODO, 1: IN_TRANSIT, 2: ON_FIELD, 3: SUBMITTED, 4: VERIFIED

  const taskSteps = [
    { label: 'Dispatch', status: 'TODO', time: '09:15 AM', desc: 'Task assigned to Field Engineer' },
    { label: 'Transit', status: 'IN_TRANSIT', time: '09:42 AM', desc: 'GPS telematics geo-check passed' },
    { label: 'On-Field', status: 'ON_FIELD', time: '10:05 AM', desc: 'Arrived at site: Foundation Stage 2' },
    { label: 'Proof', status: 'SUBMITTED', time: '10:48 AM', desc: 'Photo proof & sensor logs uploaded' },
    { label: 'AI Validated', status: 'VERIFIED', time: '10:50 AM', desc: 'AI Governance scored 98.4% efficiency' },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-orange-500/20 selection:text-orange-300">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-gradient-to-b from-rose-600/10 via-orange-500/10 to-transparent blur-3xl opacity-80" />
        <div className="absolute top-1/3 -left-48 h-[500px] w-[500px] rounded-full bg-orange-600/5 blur-3xl" />
        <div className="absolute bottom-10 -right-48 h-[600px] w-[600px] rounded-full bg-rose-600/5 blur-3xl" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-red-600/20 via-orange-500/20 to-amber-500/10 border border-orange-500/30 shadow-inner group-hover:border-orange-500/50 transition-all">
              <NexoraMark className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <span className="font-display text-base font-bold tracking-tight text-white">Nexora</span>
              <span className="ml-1 text-[10px] font-mono text-orange-400 uppercase tracking-widest font-semibold">Field OS</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Architecture</a>
            <a href="#collaboration" className="hover:text-white transition-colors">Cross-Tenant</a>
            <a href="#pwa" className="hover:text-white transition-colors">Field PWA</a>
            <a href="#pricing" className="hover:text-white transition-colors">Security</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            >
              Launch Workspace
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 md:pt-32 md:pb-36 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Release Badge */}
          <FadeIn delay={0.05} className="inline-flex items-center justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-mono font-medium text-orange-300 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
              Nexora Field OS v2.4 Live · PostgreSQL Sharding Engine
            </div>
          </FadeIn>

          {/* Heading */}
          <FadeIn delay={0.1}>
            <h1 className="mt-6 font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-[1.08]">
              The Operations Platform for <span className="bg-gradient-to-r from-red-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">Distributed Field Teams</span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.15}>
            <p className="mt-6 text-base sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Shard-routed tenant isolation, stage-scoped cross-organization collaboration, and real-time AI governance for mission-critical infrastructure projects.
            </p>
          </FadeIn>

          {/* CTA Buttons */}
          <FadeIn delay={0.2} className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-6 py-3.5 text-base font-semibold text-white shadow-xl shadow-orange-950/50 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            >
              Start Free Workspace
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#121215] px-6 py-3.5 text-base font-medium text-zinc-300 hover:border-orange-500/40 hover:text-white transition-all cursor-pointer"
            >
              <ShieldCheck size={16} className="text-orange-400" />
              Platform Admin Portal
            </Link>
          </FadeIn>

          {/* Live Field Task Telemetry Simulator */}
          <FadeIn delay={0.28} className="mt-16 sm:mt-20">
            <div className="relative mx-auto max-w-4xl rounded-2xl border border-white/[0.08] bg-[#121215]/90 p-4 sm:p-7 shadow-2xl backdrop-blur-2xl">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 font-mono text-xs text-zinc-400">Live Field Lifecycle Simulator</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-lg">
                  <Zap size={12} /> Stage: Foundation Survey · Shard S2
                </div>
              </div>

              {/* Step Navigation Pill */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
                {taskSteps.map((step, idx) => (
                  <button
                    key={step.label}
                    onClick={() => setActiveTaskStep(idx)}
                    className={`rounded-xl p-3 text-left transition-all border cursor-pointer ${
                      activeTaskStep === idx
                        ? 'border-orange-500/50 bg-gradient-to-b from-orange-500/15 to-transparent text-white shadow-lg'
                        : 'border-white/[0.04] bg-[#18181b]/50 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-zinc-500">{step.time}</span>
                      {activeTaskStep >= idx && <CheckCircle2 size={12} className="text-orange-400" />}
                    </div>
                    <p className="font-display font-semibold text-xs mt-1">{step.label}</p>
                    <p className="font-mono text-[10px] mt-0.5 text-orange-300/80">{step.status}</p>
                  </button>
                ))}
              </div>

              {/* Active Step Panel */}
              <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-5 text-left flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Current Execution State</span>
                  <h4 className="font-display text-lg font-bold text-white mt-1">
                    {taskSteps[activeTaskStep].desc}
                  </h4>
                  <p className="text-xs text-zinc-400 font-mono mt-1">
                    Event emitted to RabbitMQ: <span className="text-orange-400">task.status.updated</span> → Worker dispatched
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-3 py-1 text-xs font-mono font-medium">
                    <Sparkles size={12} /> AI Verified (98.4%)
                  </span>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Bento Grid Architecture Showcase */}
      <section id="features" className="py-20 border-t border-white/[0.06] relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono font-semibold text-orange-400 uppercase tracking-widest">Enterprise Architecture</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white mt-2">
              Engineered for Massive Field Operations
            </h2>
            <p className="text-zinc-400 text-base mt-3">
              Built on PostgreSQL logical replication, MongoDB time-series telemetry, and sub-millisecond shard routing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Bento Card 1 */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#121215]/90 p-7 shadow-xl hover:border-orange-500/30 transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20 mb-5">
                <Database size={22} className="text-orange-400" />
              </div>
              <h3 className="font-display text-xl font-bold text-white">Shard-Routed Isolation</h3>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                Organizations are partitioned across independent PostgreSQL physical shards (`S1`, `S2`, `S3`) with continuous logical replication to a read-only disaster backup node.
              </p>
            </div>

            {/* Bento Card 2 */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#121215]/90 p-7 shadow-xl hover:border-orange-500/30 transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 mb-5">
                <Users size={22} className="text-rose-400" />
              </div>
              <h3 className="font-display text-xl font-bold text-white">Stage-Scoped Collaboration</h3>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                Invite partner contractors into specific milestone stages without exposing other project stages, tenant credentials, or unrelated organization data.
              </p>
            </div>

            {/* Bento Card 3 */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#121215]/90 p-7 shadow-xl hover:border-orange-500/30 transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 mb-5">
                <Smartphone size={22} className="text-amber-400" />
              </div>
              <h3 className="font-display text-xl font-bold text-white">Installable Field PWA</h3>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                Zero app store delays. Technicians install directly to Android & iOS home screens with full offline task caching, photo proof capture, and immediate background sync.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="border-t border-white/[0.06] bg-[#0c0c0e] py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <NexoraMark className="h-6 w-6 text-orange-400" />
            <span className="font-display text-sm font-semibold text-white">Nexora Field OS</span>
            <span className="text-xs text-zinc-500">© 2026 Nexora Platform. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-zinc-400">
            <Link href="/admin" className="hover:text-orange-400 transition-colors">Admin Gateway</Link>
            <Link href="/login" className="hover:text-orange-400 transition-colors">Tenant Login</Link>
            <Link href="/register" className="hover:text-orange-400 transition-colors">Create Org</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
