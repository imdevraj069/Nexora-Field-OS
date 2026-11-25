'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CheckSquare,
  HardDrive,
  Layers,
  Mic,
  Wallet,
} from 'lucide-react';

const TABS = [
  {
    id: 'workflows',
    title: 'Project-Scoped Workflows',
    sub: 'Custom Kanban columns per department',
    Icon: Layers,
    headline: 'Every department runs its own statuses—never hardcoded.',
    desc: 'Construction, Solar, Telecom, and Logistics teams each define custom Kanban lanes, assign Project Managers, and edit milestones dynamically after launch.',
    highlights: ['Custom Kanban statuses per project', 'Editable milestones & lead blueprints', 'Role-based visibility & permissions'],
  },
  {
    id: 'checklists',
    title: 'Typed Checklists & 50 GB Vault',
    sub: 'Multi-slot files & MinIO media directory',
    Icon: HardDrive,
    headline: '50 GB MinIO vault with custom file headers & typed checklists.',
    desc: 'Require CHECK, TEXT, LINK, FILE, or MEDIA steps per task plus multiple named file upload slots. Browse, filter, preview, or delete assets in one Media Directory.',
    highlights: ['50 GB tenant-scoped MinIO quota', 'Project & file-type filters', 'Signed-URL previews & instant delete'],
  },
  {
    id: 'voice',
    title: 'Mixed-Language Voice AI',
    sub: 'Hindi, Hinglish & English transcription',
    Icon: Mic,
    headline: 'Speak on-site. Gemini 2.5 transcribes & scores automatically.',
    desc: 'Field technicians record voice notes directly from the PWA. Live speech-to-text captures observations while Gemini 2.5 extracts action items and risk flags.',
    highlights: ['In-browser VoiceRecorderInput', '14+ languages & mixed dialects', 'Automated timeliness & evidence score'],
  },
  {
    id: 'finance',
    title: 'Budgets & Reimbursements',
    sub: 'Receipts stored in MinIO nexora-docs',
    Icon: Wallet,
    headline: 'Keep project burn rate, vendor bills & claims in one ledger.',
    desc: 'Allocate and revise project budgets, log expenses with MinIO invoice receipts, and review field reimbursement claims with Approve, Reject, and Mark Paid actions.',
    highlights: ['INR budget allocation & revisions', 'Vendor expense & receipt vault', 'One-click claim approval workflow'],
  },
];

export function InteractiveProductShowcase() {
  const [activeId, setActiveId] = useState(TABS[0].id);
  const current = TABS.find((t) => t.id === activeId) || TABS[0];

  return (
    <section id="features" className="bg-[#0F1115] text-white py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mb-14"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-orange-500/15 px-3.5 py-1 text-xs font-bold text-orange-400">
            One Operating System
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight mt-3">
            Everything field teams need. <br />
            <span className="text-zinc-400">Nothing they don&apos;t.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Interactive Pillar Selector */}
          <div className="lg:col-span-5 space-y-3">
            {TABS.map((tab) => {
              const Icon = tab.Icon;
              const active = tab.id === activeId;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveId(tab.id)}
                  className={`w-full text-left rounded-2xl p-4 transition-all cursor-pointer border ${
                    active
                      ? 'bg-white/[0.08] border-orange-500/50 shadow-lg'
                      : 'bg-transparent border-white/[0.06] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        active
                          ? 'bg-gradient-to-r from-[#ff3b30] to-[#f97316] text-white'
                          : 'bg-white/[0.06] text-zinc-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-display text-base font-bold text-white">{tab.title}</p>
                      <p className="text-xs text-zinc-400">{tab.sub}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Live Morphing Product Detail Card */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.3 }}
                className="rounded-[28px] border border-white/[0.1] bg-[#161920] p-7 sm:p-9 space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="font-display text-2xl sm:text-3xl font-bold leading-tight">
                    {current.headline}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{current.desc}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {current.highlights.map((h) => (
                    <div
                      key={h}
                      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5 text-xs font-semibold text-zinc-200 flex items-start gap-2"
                    >
                      <CheckSquare className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
