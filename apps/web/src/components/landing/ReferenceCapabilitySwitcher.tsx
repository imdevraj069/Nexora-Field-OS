'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  CheckSquare,
  HardDrive,
  Layers,
  Mic,
  Play,
  Volume2,
  Workflow,
  Sparkles,
} from 'lucide-react';

const CAPABILITIES = [
  {
    id: 'workflows',
    pill: 'Workflows',
    headline: 'Crisp technical copy product stage',
    desc: 'Deep multi-tenant Shard architecture routes tasks to isolated PostgreSQL schemas. Dynamic Kanban lanes update seamlessly across departments without hardcoded statuses.',
    highlights: [
      'Role-based milestone lifecycle stages',
      'Cross-organization partner collaboration with guest access',
      'Dynamic Kanban lanes with real-time WebSocket sync',
      'Automated lead-to-plan AI scope generation',
    ],
    cards: [
      {
        title: 'Solar Inverter Stage',
        badge: 'Photo Evidence',
        meta: '28 Piles Certified',
        status: 'VERIFIED',
        img: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80',
      },
      {
        title: 'Substation Relay QA',
        badge: 'Telemetry Check',
        meta: '12 Relay Units',
        status: 'ON_FIELD',
        img: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
      },
      {
        title: 'Fiber Splice Chamber',
        badge: 'Signal Spectrum',
        meta: 'Loss < 0.02 dB/km',
        status: 'COMPLETED',
        img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
      },
    ],
  },
  {
    id: 'proof',
    pill: 'Proof & Vault',
    headline: '50 GB MinIO media directory with typed slots',
    desc: 'Require high-resolution visual evidence, video walk-throughs, and document signoffs with customizable file upload headers per task.',
    highlights: [
      '50 GB tenant-scoped MinIO storage quota',
      'EXIF timestamp and GPS geofence validation',
      'Signed-URL secure downloads with 10-minute expiry',
      'Multi-slot upload slots (Image, Video, Audio, Docs)',
    ],
    cards: [
      {
        title: 'High-Voltage Switchgear',
        badge: 'Thermal Scan',
        meta: 'Delta T < 2.5°C',
        status: 'VERIFIED',
        img: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&auto=format&fit=crop&q=80',
      },
      {
        title: 'Concrete Slump Test',
        badge: 'Lab Report',
        meta: '28-Day Strength 35MPa',
        status: 'COMPLETED',
        img: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861593?w=600&auto=format&fit=crop&q=80',
      },
      {
        title: 'Tower Anchor Bolts',
        badge: 'Torque Audit',
        meta: '180 Nm Calibrated',
        status: 'ON_FIELD',
        img: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80',
      },
    ],
  },
  {
    id: 'ai',
    pill: 'Voice AI',
    headline: 'Gemini 2.5 mixed-language voice intelligence',
    desc: 'Technicians record field notes directly from their phone. Gemini 2.5 automatically transcribes Hindi, English, Hinglish, and regional field dialects with automated risk scoring.',
    highlights: [
      'Multi & mixed-language audio transcription',
      'Automated timeliness and evidence completeness score',
      'Risk flag extraction from spoken audio notes',
      'On-demand executive AI synthesis per project',
    ],
    cards: [
      {
        title: 'Hindi Audio Note',
        badge: 'Hindi / Hinglish',
        meta: '"Foundation pour ho gaya hai..."',
        status: 'TRANSCRIBED',
        img: 'https://images.unsplash.com/photo-1589254065878-42c9da997008?w=600&auto=format&fit=crop&q=80',
      },
      {
        title: 'Visual Defect Scan',
        badge: 'Gemini Vision',
        meta: 'Zero structural cracks detected',
        status: 'AI_PASSED',
        img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80',
      },
      {
        title: 'Executive AI Synthesis',
        badge: 'Health Score 94/100',
        meta: 'Auto-generated for Project Manager',
        status: 'VERIFIED',
        img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
      },
    ],
  },
  {
    id: 'finance',
    pill: 'Finance',
    headline: 'Unified project ledger & field reimbursement vault',
    desc: 'Keep project burn rates, vendor purchase orders, and technician fuel/travel claims tied directly to task IDs and MinIO receipt vouchers.',
    highlights: [
      'INR budget allocation with live variance tracking',
      'Vendor bills & receipt vault with OCR proof',
      'One-click technician expense claim approval',
      'Cross-organization billing for partner collaborators',
    ],
    cards: [
      {
        title: 'Diesel Generator Fuel Claim',
        badge: 'Receipt Stored',
        meta: '₹14,200 · Approved',
        status: 'PAID',
        img: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
      },
      {
        title: 'Heavy Crane Rental Invoice',
        badge: 'Vendor PO',
        meta: '₹85,000 · Verified',
        status: 'COMPLETED',
        img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80',
      },
      {
        title: 'Safety Gear & PPE Order',
        badge: 'Batch Receipt',
        meta: '₹22,400 · Settled',
        status: 'VERIFIED',
        img: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80',
      },
    ],
  },
];

export function ReferenceCapabilitySwitcher() {
  const [activeTab, setActiveTab] = useState(CAPABILITIES[0].id);
  const current = CAPABILITIES.find((c) => c.id === activeTab) || CAPABILITIES[0];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Small uppercase tag */}
      <div className="text-center mb-8">
        <span className="landing-label font-mono text-xs uppercase tracking-widest text-zinc-400 font-bold">
          CAPABILITY SWITCHER
        </span>

        {/* Rounded horizontal tab switcher pills matching reference */}
        <div className="cap-pill-wrap inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#0c0d12] p-1.5 mt-4">
          {CAPABILITIES.map((cap) => {
            const active = cap.id === activeTab;
            return (
              <button
                key={cap.id}
                type="button"
                onClick={() => setActiveTab(cap.id)}
                className={`rounded-full px-5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 text-white shadow-lg shadow-orange-950/40 border border-orange-500/40'
                    : 'cap-pill-inactive text-zinc-200 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {cap.pill}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Capability Stage Container matching reference */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3 }}
          data-surface="dark"
          className="rounded-[32px] border border-white/[0.08] bg-[#0c0d12]/95 p-6 sm:p-10 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle Orange Glow Ambient */}
          <div className="pointer-events-none absolute top-0 right-0 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
            {/* Left Copy & Bullet points */}
            <div className="lg:col-span-5 space-y-5 text-left">
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
                {current.headline}
              </h3>
              <p className="landing-body text-xs sm:text-sm text-zinc-200 leading-relaxed max-w-md">
                {current.desc}
              </p>

              <div className="space-y-3 pt-2">
                <span className="font-mono text-xs uppercase tracking-wider text-orange-400 font-bold block">
                  Highlights
                </span>
                <ul className="space-y-2 text-xs">
                  {current.highlights.map((h, i) => (
                    <li key={i} className="landing-bullet-item flex items-start gap-2.5 text-zinc-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Floating Audio / Voice pill preview (matches screenshot) */}
              <div className="inline-flex items-center gap-3 rounded-full border border-orange-500/30 bg-[#161214] px-4 py-2 shadow-lg">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-orange-500 text-white">
                  <Play size={12} className="ml-0.5 fill-white" />
                </div>
                {/* Simulated Audio Waveform */}
                <div className="flex items-center gap-1">
                  {[12, 24, 16, 28, 14, 20, 26, 12, 18, 22].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 rounded-full bg-orange-400/80 animate-pulse"
                      style={{ height: `${h}px`, animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <span className="font-mono text-[10px] text-zinc-200">0:14 / 1:02</span>
              </div>
            </div>

            {/* Right Cards Showcase (3 horizontal cards with photos like reference) */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {current.cards.map((card, idx) => (
                <div
                  key={idx}
                  className="group rounded-2xl border border-white/[0.08] bg-[#14151c] overflow-hidden flex flex-col justify-between hover:border-orange-500/40 transition-colors shadow-lg"
                >
                  <div className="h-32 w-full overflow-hidden relative">
                    <img
                      src={card.img}
                      alt={card.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#14151c] via-transparent to-transparent" />
                    <span className="absolute top-2.5 right-2.5 rounded-full bg-black/70 backdrop-blur-md px-2 py-0.5 font-mono text-[9px] text-orange-300 border border-white/[0.08]">
                      {card.badge}
                    </span>
                  </div>

                  <div className="p-3.5 space-y-1.5 text-left">
                    <h4 className="font-display text-xs font-bold text-white group-hover:text-orange-400 transition-colors">
                      {card.title}
                    </h4>
                    <p className="text-[11px] font-mono text-zinc-200 truncate">{card.meta}</p>
                    <div className="pt-2 flex items-center justify-between border-t border-white/[0.04]">
                      <span className="font-mono text-[9px] text-emerald-400 font-bold">{card.status}</span>
                      <span className="text-[9px] font-mono text-zinc-400">Live Sync</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}