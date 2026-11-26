'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export function ReferenceClosingCta() {
  return (
    <section className="relative overflow-hidden py-24 px-4 sm:px-6 lg:px-8 text-center max-w-6xl mx-auto">
      {/* 3D Wireframe Perspective Grid Floor */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 [perspective:800px] overflow-hidden opacity-60">
        <div
          className="h-full w-full [transform:rotateX(68deg)] border-t border-orange-500/40 bg-[linear-gradient(to_right,#f9731615_1px,transparent_1px),linear-gradient(to_bottom,#f9731615_1px,transparent_1px)] bg-[size:3rem_3rem]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05060a] via-transparent to-transparent" />
      </div>

      {/* Central Red-Orange Glow Core */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-96 rounded-full bg-gradient-to-r from-red-600/30 via-orange-500/35 to-amber-500/20 blur-3xl opacity-80" />

      <div className="relative z-10 space-y-6">
        <span className="landing-label font-mono text-xs uppercase tracking-widest text-zinc-400 font-bold">
          CLOSING CTA
        </span>

        <h2 className="landing-h2 font-display text-3xl sm:text-5xl font-bold tracking-tight text-white max-w-3xl mx-auto leading-tight">
          Launch your isolated organization shard in under 60 seconds.
        </h2>

        <p className="landing-sub text-sm sm:text-base text-zinc-200 max-w-xl mx-auto leading-relaxed">
          Zero database sharing, dedicated PostgreSQL schema allocation, MinIO storage quotas, and Gemini 2.5 multimodal intelligence from day one.
        </p>

        <div className="pt-2">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-8 py-3.5 text-sm font-bold text-white shadow-[0_0_35px_rgba(249,115,22,0.45)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
          >
            Launch Free Workspace
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}