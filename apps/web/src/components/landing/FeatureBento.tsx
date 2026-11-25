'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  BrainCircuit,
  CheckSquare,
  HardDrive,
  Languages,
  Layers,
  Wallet,
} from 'lucide-react';
import { AnimatedRing } from '@/components/ui/motion';

export function FeatureBento() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.2 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mb-12"
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3.5 py-1 text-xs font-bold text-orange-600">
          Platform Capabilities
        </span>
        <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mt-3 text-[#111318]">
          Built for Real On-Ground Execution
        </h2>
        <p className="text-sm sm:text-base text-zinc-600 mt-2">
          Every department runs on its own workflow rules while sharing unified evidence storage, AI governance, and financial controls.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
        {/* Card 1: Dynamic Project-Scoped Kanban */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.4 }}
          className="md:col-span-4 glass-card rounded-[28px] p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-[#111318]">
                  Project-Scoped Dynamic Workflows
                </h3>
                <p className="text-xs text-zinc-500">Custom Kanban statuses per project & department</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { col: 'Site Survey', color: '#3b82f6', count: 4 },
              { col: 'QA Inspection', color: '#f97316', count: 3 },
              { col: 'Signed Off', color: '#10b981', count: 9 },
            ].map((c) => (
              <div key={c.col} className="glass-subtle rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.col}
                  </span>
                  <span className="text-zinc-500 tabular-nums">{c.count}</span>
                </div>
                <div className="h-2 w-3/4 rounded-full bg-zinc-200/80" />
                <div className="h-2 w-1/2 rounded-full bg-zinc-200/60" />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Card 2: AI Governance Ring */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="md:col-span-2 glass-card rounded-[28px] p-6 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <AnimatedRing percent={96} size={62} />
          </div>
          <div className="mt-4">
            <h3 className="font-display text-lg font-bold text-[#111318]">
              Gemini 2.5 AI Governance
            </h3>
            <p className="text-xs text-zinc-600 mt-1">
              Scores timeliness, checklist completeness, and detects risk flags automatically.
            </p>
          </div>
        </motion.div>

        {/* Card 3: 50 GB MinIO Media Directory */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="md:col-span-2 glass-card rounded-[28px] p-6 space-y-4"
        >
          <div className="h-10 w-10 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-[#111318]">
              50 GB MinIO Media Vault
            </h3>
            <p className="text-xs text-zinc-600 mt-1">
              Filter by project or media type (`IMAGE`, `VIDEO`, `AUDIO`, `DOCUMENT`), preview via signed URLs, or purge unused assets.
            </p>
          </div>
          <div className="glass-subtle rounded-xl p-3">
            <div className="flex justify-between text-[11px] font-bold mb-1.5">
              <span>Org Storage</span>
              <span className="tabular-nums text-orange-600">12.4 GB / 50 GB</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-200 overflow-hidden">
              <div className="h-full w-1/4 rounded-full bg-gradient-to-r from-[#ff3b30] to-[#f97316]" />
            </div>
          </div>
        </motion.div>

        {/* Card 4: Typed Checklists & Multi-Slot Files */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="md:col-span-2 glass-card rounded-[28px] p-6 space-y-3"
        >
          <div className="h-10 w-10 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
            <CheckSquare className="w-5 h-5" />
          </div>
          <h3 className="font-display text-lg font-bold text-[#111318]">
            Typed Checklists & Slots
          </h3>
          <p className="text-xs text-zinc-600">
            Mix `CHECK`, `TEXT`, `LINK`, `FILE`, and `MEDIA` steps with admin-defined multi-file submission headers.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {['CHECK', 'TEXT', 'FILE', 'MEDIA', 'LINK'].map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-bold text-orange-600"
              >
                {tag}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Card 5: Voice-to-Text + TeamConnect Finance */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="md:col-span-2 glass-card rounded-[28px] p-6 space-y-3"
        >
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="h-10 w-10 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
              <Languages className="w-5 h-5" />
            </div>
          </div>
          <h3 className="font-display text-lg font-bold text-[#111318]">
            Finance & Mixed-Language Voice
          </h3>
          <p className="text-xs text-zinc-600">
            Allocate project budgets, upload MinIO expense receipts, approve reimbursement claims, and transcribe Hindi/English/regional voice notes.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
