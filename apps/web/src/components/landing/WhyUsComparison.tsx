'use client';

import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, MinusCircle } from 'lucide-react';

const ROWS = [
  {
    feature: 'Per-Project Custom Kanban Statuses',
    nexora: true,
    generic: false,
    legacy: false,
  },
  {
    feature: 'Typed Checklists (Check, Text, File, Media, Link)',
    nexora: true,
    generic: false,
    legacy: false,
  },
  {
    feature: 'Multi-Slot Named File Submission Headers',
    nexora: true,
    generic: false,
    legacy: true,
  },
  {
    feature: '50 GB MinIO Media Directory + Signed URLs',
    nexora: true,
    generic: false,
    legacy: false,
  },
  {
    feature: 'Mixed-Language Voice-to-Text + AI Governance',
    nexora: true,
    generic: false,
    legacy: false,
  },
  {
    feature: 'Integrated Project Budgets & Reimbursements',
    nexora: true,
    generic: false,
    legacy: true,
  },
  {
    feature: 'Mobile & Tablet Installed PWA 5-Button Dock',
    nexora: true,
    generic: true,
    legacy: false,
  },
];

export function WhyUsComparison() {
  return (
    <section id="why-us" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.2 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-2xl mx-auto mb-12"
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-orange-500/15 px-3.5 py-1 text-xs font-bold text-orange-400 border border-orange-500/25">
          Why Nexora Field OS
        </span>
        <h2 className="landing-h2 font-display text-3xl sm:text-4xl font-bold tracking-tight mt-3 text-white">
          Purpose-Built vs. Generic Trackers
        </h2>
        <p className="landing-sub text-sm sm:text-base text-zinc-300 mt-2">
          Stop duct-taping spreadsheets, WhatsApp photos, and rigid office task boards together.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.15 }}
        transition={{ duration: 0.5 }}
        className="glass-card rounded-[28px] overflow-x-auto"
      >
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="landing-table-head border-b border-white/[0.1] text-xs font-bold uppercase tracking-wider text-zinc-300">
              <th className="py-4 px-6">Capability</th>
              <th className="py-4 px-6 text-orange-400 font-bold">Nexora Field OS</th>
              <th className="py-4 px-6">Generic Task Apps</th>
              <th className="py-4 px-6">Legacy ERP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06] text-sm">
            {ROWS.map((r) => (
              <tr key={r.feature} className="hover:bg-orange-500/[0.04] transition-colors">
                <td className="landing-table-row py-3.5 px-6 font-semibold">{r.feature}</td>
                <td className="py-3.5 px-6">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </td>
                <td className="py-3.5 px-6">
                  {r.generic ? (
                    <CheckCircle2 className="w-5 h-5 text-zinc-400" />
                  ) : (
                    <MinusCircle className="w-5 h-5 text-zinc-400" />
                  )}
                </td>
                <td className="py-3.5 px-6">
                  {r.legacy ? (
                    <CheckCircle2 className="w-5 h-5 text-zinc-400" />
                  ) : (
                    <MinusCircle className="w-5 h-5 text-zinc-400" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </section>
  );
}
