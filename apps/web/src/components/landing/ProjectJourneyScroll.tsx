'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'motion/react';
import {
  ClipboardList,
  Compass,
  Columns3,
  Mic,
  ShieldCheck,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const JOURNEY_STEPS = [
  {
    step: '01',
    title: 'Lead & Blueprint Intake',
    desc: 'Capture rich multi-line project blueprints, assign a dedicated Project Manager, and bind the project to your organization shard.',
    tag: 'Flexible Intake',
    Icon: Compass,
  },
  {
    step: '02',
    title: 'Dynamic Milestones & Stages',
    desc: 'Zero rigid templates. Create, edit, and reorder custom execution stages for construction, telecom, solar, or ops teams on the fly.',
    tag: 'Any Department',
    Icon: ClipboardList,
  },
  {
    step: '03',
    title: 'Project-Scoped Kanban Board',
    desc: 'Every project carries its own customizable workflow status columns. Field engineers update progress from the 5-button mobile PWA dock.',
    tag: 'Custom Statuses',
    Icon: Columns3,
  },
  {
    step: '04',
    title: 'Typed Checklists & Voice Evidence',
    desc: 'Collect CHECK, TEXT, LINK, FILE, and MEDIA checklists alongside multi-slot file headers and live multi-language voice-to-text notes.',
    tag: '50 GB MinIO Vault',
    Icon: Mic,
  },
  {
    step: '05',
    title: 'AI Governance & Finance Sign-Off',
    desc: 'Gemini 2.5 scores timeliness and evidence completeness while project budgets, MinIO receipts, and reimbursement claims stay reconciled.',
    tag: 'Audit-Grade',
    Icon: ShieldCheck,
  },
];

export function ProjectJourneyScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (parallaxRef.current && containerRef.current) {
        gsap.to(parallaxRef.current, {
          y: -48,
          ease: 'none',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.8,
          },
        });
      }
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const ActiveIcon = JOURNEY_STEPS[activeIdx].Icon;

  return (
    <section id="journey" ref={containerRef} className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.2 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mb-12"
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3.5 py-1 text-xs font-bold text-orange-600">
          End-to-End Lifecycle
        </span>
        <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mt-3 text-[#111318]">
          Journey of a Project in Nexora
        </h2>
        <p className="text-sm sm:text-base text-zinc-600 mt-2">
          From initial lead blueprint to AI-verified closeout and financial settlement—every stage stays connected.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-4">
          {JOURNEY_STEPS.map((item, idx) => {
            const Icon = item.Icon;
            const isActive = activeIdx === idx;
            return (
              <motion.button
                key={item.step}
                type="button"
                onClick={() => setActiveIdx(idx)}
                onMouseEnter={() => setActiveIdx(idx)}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.25 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className={`w-full text-left rounded-3xl p-5 transition-all cursor-pointer border ${
                  isActive
                    ? 'glass-card border-orange-500/50 shadow-lg scale-[1.01]'
                    : 'glass-subtle hover:bg-white'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-display text-sm font-bold ${
                      isActive
                        ? 'bg-gradient-to-r from-[#ff3b30] to-[#f97316] text-white'
                        : 'bg-zinc-200/80 text-zinc-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-orange-600">
                        Stage {item.step} · {item.tag}
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-[#111318] mt-0.5">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-600 mt-1 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Parallax Sticky Spotlight Card */}
        <div ref={parallaxRef} className="lg:col-span-5 lg:sticky lg:top-24">
          <motion.div
            key={activeIdx}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="glass-card rounded-[32px] p-7 space-y-5"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-600">
                Active Stage {JOURNEY_STEPS[activeIdx].step}
              </span>
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-r from-[#ff3b30] to-[#f97316] text-white flex items-center justify-center">
                <ActiveIcon className="w-5 h-5" />
              </div>
            </div>

            <h3 className="font-display text-2xl font-bold text-[#111318]">
              {JOURNEY_STEPS[activeIdx].title}
            </h3>
            <p className="text-sm text-zinc-600 leading-relaxed">
              {JOURNEY_STEPS[activeIdx].desc}
            </p>

            {/* Custom SVG Execution Progress Visualization */}
            <div className="glass-subtle rounded-2xl p-4 space-y-3">
              <div className="flex justify-between text-xs font-semibold text-zinc-600">
                <span>Lifecycle Progress</span>
                <span className="tabular-nums text-orange-600">
                  {Math.round(((activeIdx + 1) / JOURNEY_STEPS.length) * 100)}%
                </span>
              </div>
              <svg viewBox="0 0 320 28" className="w-full h-7">
                <rect x="0" y="10" width="320" height="8" rx="4" fill="#e2e8f0" />
                <rect
                  x="0"
                  y="10"
                  width={Math.round(((activeIdx + 1) / JOURNEY_STEPS.length) * 320)}
                  height="8"
                  rx="4"
                  fill="url(#nexoraGrad)"
                />
                <defs>
                  <linearGradient id="nexoraGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ff3b30" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
