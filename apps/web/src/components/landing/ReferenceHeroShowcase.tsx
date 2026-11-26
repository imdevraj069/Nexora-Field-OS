'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Compass,
  FileCheck,
  HardDrive,
  Layers,
  Mic,
  MoreVertical,
  Navigation,
  Phone,
  Play,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  User,
  Volume2,
  Wifi,
  Zap,
} from 'lucide-react';

export function ReferenceHeroShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'map'>('overview');

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: -y * 8, ry: x * 10 });
  }

  function handleMouseLeave() {
    setTilt({ rx: 0, ry: 0 });
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative mx-auto max-w-5xl [perspective:1400px] select-none"
    >
      <motion.div
        animate={{ rotateX: tilt.rx, rotateY: tilt.ry }}
        transition={{ type: 'spring', stiffness: 140, damping: 20 }}
        className="relative [transform-style:preserve-3d] flex items-center justify-center"
      >
        {/* Glow ambient aura behind the devices */}
        <div className="pointer-events-none absolute -inset-6 rounded-[40px] bg-gradient-to-r from-red-600/20 via-orange-500/25 to-amber-500/15 blur-3xl opacity-70" />

        {/* 1. Main Dark Desktop Tablet / Laptop Mockup (matches reference) */}
        <div data-surface="dark"
          className="w-full max-w-3xl rounded-[28px] border border-white/[0.12] bg-[#0c0d12]/95 p-4 sm:p-5 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
          {/* Top Window Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono text-[10px] text-zinc-300">nexora.field.os/telemetry</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                SHARD S1 · ACTIVE
              </span>
            </div>
          </div>

          {/* Desktop Dashboard Grid */}
          <div className="grid grid-cols-12 gap-3.5 text-left">
            {/* Left Rail / Metrics */}
            <div className="col-span-12 sm:col-span-7 space-y-3">
              {/* Telemetry Strip */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#14151c]/90 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-zinc-200 flex items-center gap-1.5 font-semibold">
                    <Activity size={12} className="text-orange-400" />
                    LIVE TELEMETRY STREAM
                  </span>
                  <span className="text-[10px] font-mono text-orange-400/90 font-semibold">99.98% SLA</span>
                </div>
                {/* SVG Curve chart */}
                <div className="h-20 w-full overflow-hidden">
                  <svg viewBox="0 0 300 70" className="h-full w-full stroke-orange-500 fill-none" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff453a" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0 50 Q 40 20, 80 40 T 160 25 T 230 45 T 300 15 L 300 70 L 0 70 Z"
                      fill="url(#chartGrad)"
                      strokeWidth="0"
                    />
                    <path
                      d="M 0 50 Q 40 20, 80 40 T 160 25 T 230 45 T 300 15"
                      stroke="url(#chartGrad)"
                      strokeWidth="2.5"
                    />
                  </svg>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/[0.04] text-[10px] font-mono">
                  <div>
                    <span className="text-zinc-300 font-mono block">DISPATCHED</span>
                    <span className="font-bold text-white">48 UNITS</span>
                  </div>
                  <div>
                    <span className="text-zinc-300 font-mono block">EVIDENCE</span>
                    <span className="font-bold text-emerald-400">100% OK</span>
                  </div>
                  <div>
                    <span className="text-zinc-300 font-mono block">AI VERIFIED</span>
                    <span className="font-bold text-orange-400">96.4%</span>
                  </div>
                </div>
              </div>

              {/* Bottom mini status cards */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-white/[0.06] bg-[#14151c]/70 p-3 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-300 font-semibold">TASK CYCLE TIME</span>
                  <p className="font-display text-base font-bold text-white">42m 18s</p>
                  <span className="text-[9px] text-emerald-400 font-mono">↓ 14% vs last week</span>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-[#14151c]/70 p-3 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-300 font-semibold">OFFLINE SYNC</span>
                  <p className="font-display text-base font-bold text-white">Zero Loss</p>
                  <span className="text-[9px] text-sky-400 font-mono">PWA Cache Engine</span>
                </div>
              </div>
            </div>

            {/* Right Mini Task List / Dispatcher */}
            <div className="col-span-12 sm:col-span-5 rounded-2xl border border-white/[0.06] bg-[#14151c]/90 p-3.5 space-y-2.5">
              <span className="text-[11px] font-mono text-zinc-200 font-semibold flex items-center justify-between">
                <span>ACTIVE FIELD DISPATCH</span>
                <span className="rounded bg-orange-500/15 px-1.5 py-0.2 text-[9px] text-orange-300 font-bold">5 LIVE</span>
              </span>

              <div className="space-y-2">
                {[
                  { id: 'TSK-104', title: 'Solar Array Inverter Alignment', status: 'ON_FIELD', color: '#f97316' },
                  { id: 'TSK-105', title: 'Substation Earthing Grid Audit', status: 'IN_TRANSIT', color: '#38bdf8' },
                  { id: 'TSK-106', title: 'Fiber Trench Depth Sonar Test', status: 'VERIFIED', color: '#10b981' },
                ].map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/[0.05] bg-black/40 p-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] text-zinc-300">{item.id}</span>
                      <span
                        className="rounded px-1.5 py-0.5 text-[8px] font-mono font-bold"
                        style={{ color: item.color, backgroundColor: `${item.color}20` }}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-zinc-200 truncate">{item.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Floating Mobile Phone Mockup (overlaid on right, matching the reference image) */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          data-surface="dark"
          className="absolute -right-4 sm:-right-8 -bottom-8 sm:-bottom-12 w-[210px] sm:w-[250px] rounded-[38px] border-[5px] border-[#22242e] bg-[#0c0d12] p-2.5 shadow-[0_35px_80px_rgba(0,0,0,0.95)] [transform:translateZ(60px)]"
        >
          {/* Phone Dynamic Island */}
          <div className="mx-auto h-4 w-20 rounded-full bg-black mb-2 flex items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-[#18181b]" />
          </div>

          {/* Phone Screen Interior */}
          <div className="rounded-[28px] bg-[#12131a] p-3 space-y-3 text-left border border-white/[0.05]">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[9px] text-zinc-300 font-semibold">TASK TSK-104</span>
                <p className="text-xs font-bold text-white leading-tight">Solar Foundation</p>
              </div>
              <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[8px] font-mono font-bold text-orange-400">
                ON FIELD
              </span>
            </div>

            {/* Checklist items inside phone */}
            <div className="space-y-1.5">
              {[
                { label: 'Torque check on bolt anchor', checked: true },
                { label: 'GPS Geofence confirmed', checked: true },
                { label: 'Slump test photo upload', checked: false },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-lg bg-black/40 p-1.5 text-[10px]">
                  <span className={`h-3 w-3 rounded flex items-center justify-center text-[8px] ${c.checked ? 'bg-emerald-500 text-black font-bold' : 'border border-zinc-700'}`}>
                    {c.checked ? '✓' : ''}
                  </span>
                  <span className={`truncate ${c.checked ? 'line-through text-zinc-500' : 'text-zinc-300'}`}>{c.label}</span>
                </div>
              ))}
            </div>

            {/* Tactile Big Action Button */}
            <div className="pt-1">
              <button
                type="button"
                className="w-full rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 py-2 text-center text-[11px] font-bold text-white shadow-lg shadow-orange-950/50 cursor-pointer active:scale-95 transition-transform"
              >
                Submit Evidence Proof
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}