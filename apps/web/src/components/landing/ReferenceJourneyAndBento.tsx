'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  BrainCircuit,
  Calendar as CalendarIcon,
  CheckCircle2,
  CheckSquare,
  FileText,
  HardDrive,
  Layers,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { AnimatedRing } from '@/components/ui/motion';

const STEPS = [
  { num: '01', title: 'Step 1: Provision', desc: 'Dedicated shard allocated in under 60 seconds.' },
  { num: '02', title: 'Step 2: Architecting', desc: 'AI transforms scope brief into milestone stages.' },
  { num: '03', title: 'Step 3: Dispatching', desc: 'Field teams receive GPS-stamped tasks & typed checklists.' },
  { num: '04', title: 'Step 4: Execute', desc: 'On-site execution with photo, video, and audio notes.' },
  { num: '05', title: 'Step 5: Handover', desc: 'Supervisor verification, ledger settlement & client signoff.' },
];

export function ReferenceJourneyAndBento() {
  const [activeStep, setActiveStep] = useState(2); // Step 3 active by default

  return (
    <div className="space-y-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* 1. PROJECT JOURNEY SECTION (matching reference layout) */}
      <section className="text-center space-y-12">
        <span className="landing-label font-mono text-xs uppercase tracking-widest text-zinc-400 font-bold">
          PROJECT JOURNEY
        </span>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left">
          {/* Left Vertical Stepper (01, 02, 03, 04, 05) */}
          <div className="lg:col-span-5 space-y-4">
            {STEPS.map((step, idx) => {
              const active = idx === activeStep;
              return (
                <div
                  key={step.num}
                  onClick={() => setActiveStep(idx)}
                  className={`flex items-start gap-4 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    active
                      ? 'border-orange-500/50 bg-[#161214] shadow-lg shadow-orange-950/20'
                      : 'border-transparent hover:bg-white/[0.04] text-zinc-300'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs font-bold shrink-0 transition-colors ${
                      active
                        ? 'border border-orange-500 bg-orange-500/20 text-orange-400'
                        : 'border border-white/[0.1] bg-black/40 text-zinc-500'
                    }`}
                  >
                    {step.num}
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${active ? 'text-white' : 'landing-step-title-inactive text-zinc-200'}`}>
                      {step.title}
                    </h4>
                    <p className="landing-step-desc text-xs text-zinc-300 mt-0.5 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Live Interactive Mockup Frame */}
          <div className="lg:col-span-7">
            <div data-surface="dark"
            className="rounded-[28px] border border-white/[0.1] bg-[#0c0d12] p-5 sm:p-6 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="ml-2 font-mono text-[10px] text-zinc-300">nexora.field.os/stages</span>
                </div>
                <span className="text-[10px] font-mono text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                  {STEPS[activeStep].title}
                </span>
              </div>

              {/* Mockup stage table inside */}
              <div className="space-y-2.5">
                {[
                  { id: 'STG-01', name: 'Site Topography & Boundary Audit', status: 'VERIFIED', tasks: '6/6 Complete', color: '#10b981' },
                  { id: 'STG-02', name: 'Pile Driving & Load Deflection Tests', status: 'IN_PROGRESS', tasks: '14/18 Complete', color: '#f97316' },
                  { id: 'STG-03', name: 'Underground Cable Trenching & HV Grid', status: 'PENDING', tasks: '0/8 Tasks', color: '#94a3b8' },
                  { id: 'STG-04', name: 'Inverter SCADA Relay Interlock Tests', status: 'SCHEDULED', tasks: '0/4 Tasks', color: '#94a3b8' },
                ].map((stg) => (
                  <div key={stg.id} className="flex items-center justify-between p-3 rounded-xl border border-white/[0.04] bg-[#14151c]/80 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-[10px] text-zinc-500">{stg.id}</span>
                      <span className="font-semibold text-white truncate font-medium">{stg.name}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-zinc-200">{stg.tasks}</span>
                      <span className="rounded px-2 py-0.5 text-[9px] font-bold" style={{ color: stg.color, backgroundColor: `${stg.color}20` }}>
                        {stg.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ASYMMETRIC BENTO GRID (matching reference layout) */}
      <section className="text-center space-y-8">
        <span className="landing-label font-mono text-xs uppercase tracking-widest text-zinc-400 font-bold">
          ASYMMETRIC BENTO GRID
        </span>

        {/* 6 Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {/* Card 1: Operational Telemetry Waveform */}
          <div data-surface="dark"
            className="rounded-[26px] border border-white/[0.08] bg-[#0c0d12]/95 p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-bold text-white flex items-center gap-1.5">
                <Activity size={14} className="text-orange-400" />
                Operational Telemetry
              </span>
              <span className="text-[10px] font-mono text-emerald-400">Live 60fps</span>
            </div>
            {/* SVG line */}
            <div className="h-20 w-full overflow-hidden">
              <svg viewBox="0 0 200 60" className="h-full w-full stroke-orange-500 fill-none">
                <path d="M 0 40 Q 30 10, 60 30 T 120 20 T 160 40 T 200 15" stroke="#f97316" strokeWidth="2.5" />
              </svg>
            </div>
            <div className="flex justify-between border-t border-white/[0.05] pt-2 text-[10px] font-mono">
              <span className="text-zinc-300">SLA: 99.98%</span>
              <span className="text-orange-300 font-bold">14 Shards</span>
            </div>
          </div>

          {/* Card 2: AI Governance Circular Metric */}
          <div data-surface="dark"
            className="rounded-[26px] border border-white/[0.08] bg-[#0c0d12]/95 p-5 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-bold text-white flex items-center gap-1.5">
                <BrainCircuit size={14} className="text-orange-400" />
                AI Governance
              </span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-mono font-bold text-emerald-400">
                PASS
              </span>
            </div>
            <div className="flex items-center justify-center py-2">
              <AnimatedRing percent={94} size={70} />
            </div>
            <div className="border-t border-white/[0.05] pt-2 text-[10px] font-mono text-zinc-200 text-center">
              Gemini 2.5 Mixed-Language Scoring
            </div>
          </div>

          {/* Card 3: 50 GB Media Vault with mini grid */}
          <div data-surface="dark"
            className="rounded-[26px] border border-white/[0.08] bg-[#0c0d12]/95 p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-bold text-white flex items-center gap-1.5">
                <HardDrive size={14} className="text-orange-400" />
                50 GB Media Directory
              </span>
              <span className="text-[10px] font-mono text-orange-300 font-bold">24% Full</span>
            </div>
            {/* 4 thumbnail photos */}
            <div className="grid grid-cols-2 gap-1.5">
              <img src="https://images.unsplash.com/photo-1509391365360-2e959784a276?w=300&auto=format&fit=crop&q=80" alt="solar" className="h-14 w-full object-cover rounded-lg" />
              <img src="https://images.unsplash.com/photo-1544717305-2782549b5136?w=300&auto=format&fit=crop&q=80" alt="tower" className="h-14 w-full object-cover rounded-lg" />
              <img src="https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=300&auto=format&fit=crop&q=80" alt="grid" className="h-14 w-full object-cover rounded-lg" />
              <img src="https://images.unsplash.com/photo-1541888946425-d0fbb1861593?w=300&auto=format&fit=crop&q=80" alt="pour" className="h-14 w-full object-cover rounded-lg" />
            </div>
            <div className="border-t border-white/[0.05] pt-2 text-[10px] font-mono text-zinc-300">
              MinIO S3 Isolated Storage
            </div>
          </div>

          {/* Card 4: Verification Inbox */}
          <div data-surface="dark"
            className="rounded-[26px] border border-white/[0.08] bg-[#0c0d12]/95 p-5 space-y-2.5 shadow-xl">
            <span className="font-display text-sm font-bold text-white block">
              Verification Inbox
            </span>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/[0.04]">
                <span className="text-zinc-100">Foundation Pour Proof</span>
                <span className="text-emerald-400 text-[10px] font-mono font-bold">APPROVED</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/[0.04]">
                <span className="text-zinc-100">Inverter Torque Audit</span>
                <span className="text-amber-400 text-[10px] font-mono font-bold">PENDING</span>
              </div>
            </div>
          </div>

          {/* Card 5: Monthly Calendar Preview */}
          <div data-surface="dark"
            className="rounded-[26px] border border-white/[0.08] bg-[#0c0d12]/95 p-5 space-y-2 shadow-xl">
            <span className="font-display text-sm font-bold text-white block">
              Operations Calendar
            </span>
            <div className="grid grid-cols-7 gap-1 text-center font-mono text-[9px] text-zinc-300 pt-1">
              <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
              {[...Array(14)].map((_, i) => (
                <span
                  key={i}
                  className={`h-5 w-5 mx-auto rounded flex items-center justify-center ${
                    i === 8 ? 'bg-orange-500 text-white font-bold' : i === 3 || i === 11 ? 'bg-orange-500/20 text-orange-400 font-bold' : 'text-zinc-400'
                  }`}
                >
                  {i + 15}
                </span>
              ))}
            </div>
          </div>

          {/* Card 6: Finance Ledger */}
          <div data-surface="dark"
            className="rounded-[26px] border border-white/[0.08] bg-[#0c0d12]/95 p-5 space-y-2 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-bold text-white">
                Finance Ledger
              </span>
              <span className="font-mono text-xs text-emerald-400 font-bold">₹1.48M</span>
            </div>
            <div className="space-y-1 text-[11px] font-mono">
              <div className="flex justify-between text-zinc-200">
                <span>Material PO #102</span>
                <span className="text-white">₹84,000</span>
              </div>
              <div className="flex justify-between text-zinc-200">
                <span>Field Travel Claim</span>
                <span className="text-white">₹12,450</span>
              </div>
              <div className="flex justify-between text-zinc-200">
                <span>Crane Equipment</span>
                <span className="text-white">₹140,000</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}