'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowRight,
  LogOut,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { NexoraMark } from '../components/svg/NexoraMark';
import { useAuthStore } from '../stores/useAuthStore';
import { RotatingWords } from '../components/landing/RotatingWords';
import { CountUpMetric } from '../components/landing/CountUpMetric';
import { ProjectJourneyScroll } from '../components/landing/ProjectJourneyScroll';
import { InteractiveProductShowcase } from '../components/landing/InteractiveProductShowcase';
import { WhyUsComparison } from '../components/landing/WhyUsComparison';
import { FaqSection } from '../components/landing/FaqSection';

const NebulaParticleHero = dynamic(
  () => import('../components/landing/NebulaParticleHero').then((m) => m.NebulaParticleHero),
  { ssr: false }
);

const HeroProductStage = dynamic(
  () => import('../components/landing/HeroProductStage').then((m) => m.HeroProductStage),
  { ssr: false }
);

export default function MarketingLandingPage() {
  const { isAuthenticated, user, activeOrg, isHydrated, logout } = useAuthStore();

  return (
    <div
      data-surface="dark"
      className="min-h-screen overflow-x-hidden bg-[#05060a] text-zinc-100 selection:bg-orange-500/30 selection:text-orange-200"
    >
      {/* Floating Translucent Nebula Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#05060a]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 cursor-pointer">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#ff3b30] to-[#f97316] text-white shadow-lg shadow-orange-500/25">
              <NexoraMark className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display text-lg font-bold tracking-tight text-white">
                Nexora
              </span>
              <span className="ml-1.5 text-[10px] uppercase tracking-widest font-bold text-orange-400">
                Field OS
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">
              Real-Time OS
            </a>
            <a href="#journey" className="hover:text-white transition-colors">
              Project Journey
            </a>
            <a href="#why-us" className="hover:text-white transition-colors">
              Why Us
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            {isHydrated && isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.05] text-xs font-semibold text-zinc-200"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {activeOrg?.org_name || user?.fullName || 'Workspace'}
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ff3b30] to-[#f97316] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-orange-500/25 hover:brightness-110 transition-all"
                >
                  Open Dashboard
                  <ArrowRight size={14} />
                </Link>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="rounded-full p-2 text-zinc-400 hover:text-red-400 cursor-pointer"
                >
                  <LogOut size={15} />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full px-3.5 py-2 text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ff3b30] to-[#f97316] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-orange-500/25 hover:brightness-110 transition-all"
                >
                  Launch Workspace
                  <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Full-Viewport Cinematic WebGL Nebula Hero */}
      <section className="relative min-h-[88vh] flex flex-col justify-center pt-14 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <NebulaParticleHero />

        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="text-center max-w-4xl mx-auto space-y-6 mb-14"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-bold text-orange-300 backdrop-blur-md">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              Real-Time Field Execution · Shard-Routed · Gemini 2.5 AI
            </div>

            <h1 className="font-display text-4xl sm:text-6xl lg:text-[68px] font-bold tracking-[-0.03em] leading-[1.04] text-white">
              Orchestrate <RotatingWords /> <br className="hidden sm:block" />
              in Real Time.
            </h1>

            <p className="text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed">
              Project-scoped Kanban, typed checklists, 50 GB MinIO evidence vaults, mixed-language voice-to-text, and project finance—streamed live across web and mobile PWA.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href={isHydrated && isAuthenticated ? '/dashboard' : '/register'}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff3b30] to-[#f97316] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_32px_rgba(249,115,22,0.4)] hover:brightness-110 transition-all"
              >
                <Sparkles size={16} />
                {isHydrated && isAuthenticated ? 'Go to Dashboard' : 'Launch Free Workspace'}
                <ArrowRight size={16} />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] backdrop-blur-md px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/[0.12] transition-all"
              >
                Explore Live Architecture
              </a>
            </div>
          </motion.div>

          {/* Counting Telemetry Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
            <CountUpMetric target={50} suffix=" GB" label="MinIO Media Vault" sublabel="Per organization quota" />
            <CountUpMetric target={3} suffix="x" label="Postgres Shards" sublabel="S1 / S2 / S3 isolated" />
            <CountUpMetric target={14} suffix="+" label="Voice Dialects" sublabel="Gemini 2.5 transcription" />
            <CountUpMetric target={120} prefix="<" suffix="ms" label="Gateway Ping" sublabel="Real-time WebSocket sync" />
          </div>

          {/* 3D Perspective Product Stage */}
          <HeroProductStage />
        </div>
      </section>

      {/* Interactive Product Showcase */}
      <InteractiveProductShowcase />

      {/* Scroll-Driven Journey of a Project */}
      <ProjectJourneyScroll />

      {/* Us vs Legacy Comparison */}
      <WhyUsComparison />

      {/* FAQ Accordion */}
      <FaqSection />

      {/* Closing Nebula CTA & Footer */}
      <footer className="border-t border-white/10 bg-[#05060a] pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-6 pb-16 border-b border-white/10">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3.5 py-1 text-xs font-bold text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            Production-Ready Multi-Tenant Field OS
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white">
            Turn every field site into live, verifiable truth.
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
            Launch your isolated organization shard in under 60 seconds with custom Kanban workflows, MinIO storage, and real-time financial tracking.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href={isHydrated && isAuthenticated ? '/dashboard' : '/register'}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff3b30] to-[#f97316] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_28px_rgba(249,115,22,0.35)] hover:brightness-110 transition-all"
            >
              {isHydrated && isAuthenticated ? 'Open Workspace' : 'Create Your Workspace'}
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/[0.12] transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <span>© 2026 Nexora Field OS. All rights reserved.</span>
          <span>Real-Time Sharded Execution · MinIO + Gemini 2.5</span>
        </div>
      </footer>
    </div>
  );
}
