'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'motion/react';
import {
  Activity,
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
import { CountUpMetric } from '../components/landing/CountUpMetric';
import { WhyUsComparison } from '../components/landing/WhyUsComparison';
import { FaqSection } from '../components/landing/FaqSection';
import { ReferenceHeroShowcase } from '../components/landing/ReferenceHeroShowcase';
import { ReferenceCapabilitySwitcher } from '../components/landing/ReferenceCapabilitySwitcher';
import { ReferenceJourneyAndBento } from '../components/landing/ReferenceJourneyAndBento';
import { ReferenceClosingCta } from '../components/landing/ReferenceClosingCta';

const NebulaParticleHero = dynamic(
  () => import('../components/landing/NebulaParticleHero').then((m) => m.NebulaParticleHero),
  { ssr: false }
);

export default function MarketingLandingPage() {
  const { isAuthenticated, user, activeOrg, isHydrated, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <div
      data-landing="true"
      className="min-h-screen overflow-x-hidden transition-colors duration-300 selection:bg-orange-500/30 selection:text-orange-200"
    >
      {/* Background 3D Particle Nebula */}
      <div className="nebula-canvas pointer-events-none absolute inset-0"><NebulaParticleHero /></div>

      {/* Floating Translucent Nebula Navbar */}
      <header className="landing-header sticky top-0 z-50 border-b border-white/[0.08] bg-[#05060a]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 cursor-pointer">
            <img src="/icon.svg" alt="Nexora" className="h-9 w-9 rounded-xl shadow-lg shadow-orange-500/25" />
            <div>
              <span className="landing-brand font-display text-lg font-bold tracking-tight text-white">
                Nexora
              </span>
              <span className="ml-1.5 text-[10px] uppercase tracking-widest font-bold text-orange-400">
                Field OS
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold landing-nav-link font-mono">
            <a href="#capabilities" className="hover:text-white transition-colors">
              Capabilities
            </a>
            <a href="#journey" className="hover:text-white transition-colors">
              Journey
            </a>
            <a href="#matrix" className="hover:text-white transition-colors">
              Matrix
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="landing-btn-ghost rounded-full border border-white/[0.1] bg-white/[0.04] p-2 transition-colors hover:scale-110 active:scale-95 text-zinc-200"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            {isHydrated && isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/dashboard"
                  className="rounded-full bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 active:scale-95 transition-all"
                >
                  Enter Workspace
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-full border border-white/[0.08] bg-[#121215] p-2 text-zinc-400 hover:text-white transition-colors"
                  title="Logout"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/login"
                  className="landing-btn-ghost rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-xs font-semibold transition-colors text-zinc-200"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 active:scale-95 transition-all"
                >
                  Launch Isolated Shard
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 1. HERO SECTION (matching reference layout) */}
      <section className="relative pt-16 sm:pt-24 pb-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="landing-h1 font-display text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.06]"
          >
            Orchestrate <br className="hidden sm:inline" />
            Field Operations <br className="hidden sm:inline" />
            in Real Time.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="landing-sub text-sm sm:text-base md:text-lg text-zinc-200 max-w-xl mx-auto leading-relaxed"
          >
            Continuous real-time multi-tenant operations with 50 GB proof storage, dynamic Kanban stages, and Gemini 2.5 voice intelligence.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-wrap items-center justify-center gap-3 pt-2"
          >
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-orange-950/50 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              Launch Free Workspace
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/login"
              className="landing-btn-ghost inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.03] px-5 py-3 text-xs sm:text-sm font-semibold transition-all cursor-pointer text-zinc-200"
            >
              Live Field Demo
            </Link>
          </motion.div>
        </div>

        {/* Hero Interactive 3D Mockup Devices (Desktop + Phone) */}
        <div className="mt-12 sm:mt-16">
          <ReferenceHeroShowcase />
        </div>

        {/* 4 Hero Stats Strip (50 GB, 3x, 14+, <120ms) matching reference */}
        <div data-surface="dark"
          className="mt-14 max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 rounded-3xl border border-white/[0.14] bg-[#0c0d12] backdrop-blur-xl shadow-[0_0_60px_rgba(0,0,0,0.9)] ring-1 ring-orange-500/[0.06]">
          <div className="p-3 text-center">
            <span className="font-display text-2xl sm:text-3xl font-bold text-white block">50 GB</span>
            <span className="font-mono text-[10px] text-zinc-300 uppercase tracking-widest">Vault Quota</span>
          </div>
          <div className="p-3 text-center">
            <span className="font-display text-2xl sm:text-3xl font-bold text-orange-400 block">3x</span>
            <span className="font-mono text-[10px] text-zinc-300 uppercase tracking-widest">Cycle Velocity</span>
          </div>
          <div className="p-3 text-center">
            <span className="font-display text-2xl sm:text-3xl font-bold text-white block">14+</span>
            <span className="font-mono text-[10px] text-zinc-300 uppercase tracking-widest">Languages / Dialects</span>
          </div>
          <div className="p-3 text-center">
            <span className="font-display text-2xl sm:text-3xl font-bold text-emerald-400 block">&lt;120ms</span>
            <span className="font-mono text-[10px] text-zinc-300 uppercase tracking-widest">Telemetry Latency</span>
          </div>
        </div>
      </section>

      {/* 2. CAPABILITY SWITCHER SECTION (matching reference layout) */}
      <div id="capabilities">
        <ReferenceCapabilitySwitcher />
      </div>

      {/* 3. PROJECT JOURNEY & ASYMMETRIC BENTO GRID (matching reference layout) */}
      <div id="journey">
        <ReferenceJourneyAndBento />
      </div>

      {/* 4. COMPARISON MATRIX (matching reference layout) */}
      <div id="matrix" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
        <span className="landing-label font-mono text-xs uppercase tracking-widest text-zinc-400 font-bold block mb-8">
          COMPARISON MATRIX
        </span>
        <WhyUsComparison />
      </div>

      {/* 5. FAQ SECTION (matching reference layout) */}
      <div id="faq" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
        <span className="landing-label font-mono text-xs uppercase tracking-widest text-zinc-400 font-bold block mb-8">
          FAQ SECTION
        </span>
        <FaqSection />
      </div>

      {/* 6. CLOSING CTA (matching reference layout with 3D wireframe grid) */}
      <ReferenceClosingCta />

      {/* Footer */}
      <footer className="landing-footer border-t border-white/[0.08] py-8 text-center text-xs font-mono text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Nexora Field OS · Isolated Tenant Sharding Active</span>
          </div>
          <p>© {new Date().getFullYear()} Nexora Systems Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}