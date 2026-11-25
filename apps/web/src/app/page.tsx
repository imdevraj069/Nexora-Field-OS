'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  ArrowRight,
  LogOut,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-react';
import { NexoraMark } from '../components/svg/NexoraMark';
import { useAuthStore } from '../stores/useAuthStore';
import { useThemeStore } from '../stores/useThemeStore';
import { RotatingWords } from '../components/landing/RotatingWords';
import { CountUpMetric } from '../components/landing/CountUpMetric';
import { ProjectJourneyScroll } from '../components/landing/ProjectJourneyScroll';
import { FeatureBento } from '../components/landing/FeatureBento';
import { WhyUsComparison } from '../components/landing/WhyUsComparison';
import { FaqSection } from '../components/landing/FaqSection';

const HeroScene3D = dynamic(
  () => import('../components/landing/HeroScene3D').then((m) => m.HeroScene3D),
  {
    ssr: false,
    loading: () => (
      <div className="h-[380px] sm:h-[440px] lg:h-[500px] w-full rounded-[32px] glass-card flex items-center justify-center text-xs font-semibold text-zinc-500">
        Initializing 3D Command Topology...
      </div>
    ),
  }
);

export default function MarketingLandingPage() {
  const { isAuthenticated, user, activeOrg, isHydrated, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#eef0f4] text-[#111318] selection:bg-orange-500/20 selection:text-orange-600">
      {/* Subtle Architectural Background Grid & Warm Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(rgba(15, 23, 42, 0.08) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute -top-44 left-1/2 -translate-x-1/2 h-[540px] w-[860px] rounded-full bg-gradient-to-b from-orange-400/15 via-red-400/10 to-transparent blur-3xl" />
      </div>

      {/* Sticky Floating Glass Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group cursor-pointer">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600/15 via-orange-500/15 to-amber-500/10 border border-orange-500/30">
              <NexoraMark className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <span className="font-display text-base font-bold tracking-tight text-[#111318]">
                Nexora
              </span>
              <span className="ml-1.5 text-[10px] uppercase tracking-widest font-bold text-orange-600">
                Field OS
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-zinc-600">
            <a href="#journey" className="hover:text-[#111318] transition-colors">
              Project Journey
            </a>
            <a href="#features" className="hover:text-[#111318] transition-colors">
              Capabilities
            </a>
            <a href="#why-us" className="hover:text-[#111318] transition-colors">
              Why Nexora
            </a>
            <a href="#faq" className="hover:text-[#111318] transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 rounded-full glass-subtle px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-orange-500/40 cursor-pointer"
              title="Toggle Light / Dark Theme"
            >
              {theme === 'light' ? (
                <Moon size={13} className="text-orange-600" />
              ) : (
                <Sun size={13} className="text-orange-400" />
              )}
            </button>

            {isHydrated && isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full glass-subtle text-xs font-semibold text-zinc-700"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {activeOrg?.org_name || user?.fullName || 'Workspace'}
                </Link>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ff3b30] to-[#f97316] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:brightness-110 transition-all"
                >
                  Go to Dashboard
                  <ArrowRight size={15} />
                </Link>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="rounded-full p-2 text-zinc-500 hover:text-red-600 cursor-pointer"
                >
                  <LogOut size={15} />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full px-3.5 py-2 text-xs sm:text-sm font-semibold text-zinc-700 hover:text-[#111318] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ff3b30] to-[#f97316] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:brightness-110 transition-all"
                >
                  Launch Workspace
                  <ArrowRight size={15} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 3D Interactive Hero Section */}
      <section className="relative pt-10 sm:pt-16 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 space-y-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3.5 py-1.5 text-xs font-bold text-orange-600">
              <Sparkles className="w-3.5 h-3.5" />
              Multi-Tenant Shard-Routed Field Operations OS
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-[54px] font-bold tracking-tight leading-[1.08] text-[#111318]">
              Execute <br />
              <RotatingWords /> <br />
              with Zero Blind Spots.
            </h1>

            <p className="text-sm sm:text-base text-zinc-600 max-w-xl leading-relaxed">
              Nexora unifies project-scoped Kanban workflows, typed checklists, 50 GB MinIO media vaults, mixed-language voice-to-text AI governance, and project finance in one mobile-first PWA.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href={isHydrated && isAuthenticated ? '/dashboard' : '/register'}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff3b30] to-[#f97316] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 hover:brightness-110 active:scale-[0.98] transition-all"
              >
                {isHydrated && isAuthenticated ? 'Open Workspace' : 'Start Free Organization'}
                <ArrowRight size={16} />
              </Link>
              <a
                href="#journey"
                className="inline-flex items-center gap-2 rounded-full glass-card px-5 py-3.5 text-sm font-semibold text-[#111318] hover:border-orange-500/40 transition-all"
              >
                Explore Project Journey
              </a>
            </div>

            {/* Counting KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              <CountUpMetric target={50} suffix=" GB" label="MinIO Vault" sublabel="Per org quota" />
              <CountUpMetric target={3} suffix="x" label="Postgres Shards" sublabel="S1 / S2 / S3 isolated" />
              <CountUpMetric target={14} suffix="+" label="Voice Languages" sublabel="Gemini 2.5 AI" />
              <CountUpMetric target={120} prefix="<" suffix="ms" label="Gateway API" sublabel="Shard routed" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6"
          >
            <HeroScene3D />
          </motion.div>
        </div>
      </section>

      {/* Scroll-Scrubbed Project Journey */}
      <ProjectJourneyScroll />

      {/* Feature Bento Grid */}
      <FeatureBento />

      {/* Why Us Comparison */}
      <WhyUsComparison />

      {/* Interactive FAQ Accordion */}
      <FaqSection />

      {/* Final Conversion Pitch Card */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.25 }}
          transition={{ duration: 0.5 }}
          className="glass-card rounded-[36px] p-8 sm:p-12 text-center space-y-5"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-700">
            <ShieldCheck className="w-4 h-4" />
            Ready for Field Deployment
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#111318]">
            Turn Field Execution into Verifiable Proof
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 max-w-2xl mx-auto">
            Launch your isolated organization shard in under 60 seconds with custom Kanban statuses, MinIO evidence storage, voice-to-text, and financial tracking.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href={isHydrated && isAuthenticated ? '/dashboard' : '/register'}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff3b30] to-[#f97316] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 hover:brightness-110 transition-all"
            >
              {isHydrated && isAuthenticated ? 'Go to Dashboard' : 'Create Your Workspace'}
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full glass-subtle px-6 py-3.5 text-sm font-semibold text-[#111318] hover:bg-white transition-all"
            >
              Sign In to Existing Org
            </Link>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-zinc-200/70 py-8 px-4 text-center text-xs text-zinc-500">
        Nexora Field OS · Multi-Tenant Shard-Routed Operations Platform
      </footer>
    </div>
  );
}
