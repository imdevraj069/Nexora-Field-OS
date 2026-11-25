'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'motion/react';
import {
  ArrowRight,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { NexoraMark } from '../components/svg/NexoraMark';
import { useAuthStore } from '../stores/useAuthStore';
import { useThemeStore } from '../stores/useThemeStore';
import { RotatingWords } from '../components/landing/RotatingWords';
import { CountUpMetric } from '../components/landing/CountUpMetric';
import { ProjectJourneyScroll } from '../components/landing/ProjectJourneyScroll';
import { InteractiveProductShowcase } from '../components/landing/InteractiveProductShowcase';
import { WhyUsComparison } from '../components/landing/WhyUsComparison';
import { FaqSection } from '../components/landing/FaqSection';

const HeroProductStage = dynamic(
  () => import('../components/landing/HeroProductStage').then((m) => m.HeroProductStage),
  { ssr: false }
);

export default function MarketingLandingPage() {
  const { isAuthenticated, user, activeOrg, isHydrated, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f6f2] text-[#111318] selection:bg-orange-500/20 selection:text-orange-600">
      {/* Sticky Minimal Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-[#f7f6f2]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 cursor-pointer">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#ff3b30] to-[#f97316] text-white shadow-sm">
              <NexoraMark className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-[#111318]">
              Nexora
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-zinc-600">
            <a href="#features" className="hover:text-[#111318] transition-colors">
              Platform
            </a>
            <a href="#journey" className="hover:text-[#111318] transition-colors">
              How It Works
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
              className="rounded-full border border-zinc-200 bg-white p-2 text-zinc-600 hover:border-orange-500/40 cursor-pointer"
              title="Toggle Light / Dark Theme"
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>

            {isHydrated && isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-zinc-200 text-xs font-semibold text-zinc-700"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {activeOrg?.org_name || user?.fullName || 'Workspace'}
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#111318] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
                >
                  Open Dashboard
                  <ArrowRight size={14} />
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
                  className="rounded-full px-3.5 py-2 text-xs sm:text-sm font-semibold text-zinc-700 hover:text-[#111318]"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#111318] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
                >
                  Launch Workspace
                  <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Editorial Centered Hero + Real Product Command Stage */}
      <section className="pt-12 sm:pt-16 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-4xl mx-auto space-y-5 mb-12"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-bold text-zinc-700 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            Built for on-ground execution, not for generic desk work.
          </span>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-[64px] font-bold tracking-[-0.03em] leading-[1.04] text-[#111318]">
            Run <RotatingWords /> <br className="hidden sm:block" />
            operations with total clarity.
          </h1>

          <p className="text-base sm:text-lg text-zinc-600 max-w-2xl mx-auto leading-relaxed">
            Dynamic project-scoped Kanban, typed checklists, 50 GB MinIO media vaults, mixed-language voice-to-text, and project finance—in one fast mobile &amp; desktop OS.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href={isHydrated && isAuthenticated ? '/dashboard' : '/register'}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff3b30] to-[#f97316] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 hover:brightness-110 transition-all"
            >
              {isHydrated && isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
              <ArrowRight size={16} />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-6 py-3.5 text-sm font-semibold text-[#111318] hover:border-zinc-400 transition-all"
            >
              See Platform Tour
            </a>
          </div>
        </motion.div>

        {/* Real Interactive Product Stage */}
        <HeroProductStage />

        {/* Counting KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          <CountUpMetric target={50} suffix=" GB" label="MinIO Media Vault" sublabel="Per organization quota" />
          <CountUpMetric target={3} suffix="x" label="Postgres Shards" sublabel="S1 / S2 / S3 tenant isolation" />
          <CountUpMetric target={14} suffix="+" label="Voice Languages" sublabel="Gemini 2.5 audio analysis" />
          <CountUpMetric target={120} prefix="<" suffix="ms" label="Gateway Routing" sublabel="Shard-aware REST & GraphQL" />
        </div>
      </section>

      {/* High-Contrast Dark Obsidian Interactive Product Showcase */}
      <InteractiveProductShowcase />

      {/* Scroll-Driven Journey of a Project */}
      <ProjectJourneyScroll />

      {/* Us vs Legacy Comparison */}
      <WhyUsComparison />

      {/* FAQ Accordion */}
      <FaqSection />

      {/* Dark Editorial Closing CTA + Footer */}
      <footer className="bg-[#0F1115] text-white pt-20 pb-12 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-5xl mx-auto text-center space-y-6 pb-16 border-b border-white/10">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3.5 py-1 text-xs font-bold text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            Ready for Field Deployment
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight">
            Built for field teams who ship on-site.
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
            Launch your isolated organization shard in under 60 seconds with custom workflows, MinIO storage, and real-time financial control.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href={isHydrated && isAuthenticated ? '/dashboard' : '/register'}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff3b30] to-[#f97316] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 hover:brightness-110 transition-all"
            >
              {isHydrated && isAuthenticated ? 'Open Workspace' : 'Create Your Workspace'}
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <span>© 2026 Nexora Field OS. All rights reserved.</span>
          <span>Multi-Tenant · Shard-Routed · MinIO + Gemini 2.5</span>
        </div>
      </footer>
    </div>
  );
}
