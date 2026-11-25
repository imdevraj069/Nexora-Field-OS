'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  FolderKanban,
  HardDrive,
  LayoutDashboard,
  Mic,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UploadCloud,
  Wallet,
} from 'lucide-react';

export function HeroProductStage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: -y * 7, ry: x * 9 });
  }

  function handleMouseLeave() {
    setTilt({ rx: 0, ry: 0 });
  }

  return (
    <div
      ref={stageRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative mx-auto max-w-6xl pt-4 pb-8 [perspective:1400px]"
    >
      <motion.div
        animate={{ rotateX: tilt.rx, rotateY: tilt.ry }}
        transition={{ type: 'spring', stiffness: 160, damping: 22 }}
        className="relative [transform-style:preserve-3d]"
      >
        {/* Main Desktop Workspace Mockup */}
        <div className="rounded-[28px] border border-zinc-200/90 bg-white shadow-[0_30px_80px_-24px_rgba(15,23,42,0.22)] overflow-hidden">
          {/* Browser Chrome */}
          <div className="flex items-center justify-between border-b border-zinc-100 bg-[#fafaf9] px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-3 rounded-full bg-zinc-100 px-3 py-0.5 text-[11px] font-medium text-zinc-500">
                app.nexora.ops/dashboard
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Shard S1 · Live Sync
            </div>
          </div>

          {/* App Interior */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-5 sm:p-7 bg-[#f5f6f8]">
            {/* Left Mini Sidebar */}
            <div className="hidden md:flex md:col-span-3 flex-col justify-between rounded-2xl bg-white p-4 border border-zinc-200/70">
              <div className="space-y-1.5">
                {[
                  { label: 'Overview', Icon: LayoutDashboard, active: true },
                  { label: 'Projects', Icon: FolderKanban, active: false },
                  { label: 'Media Vault', Icon: HardDrive, active: false },
                  { label: 'Finance', Icon: Wallet, active: false },
                ].map(({ label, Icon, active }) => (
                  <div
                    key={label}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold ${
                      active
                        ? 'bg-gradient-to-r from-[#ff3b30] to-[#f97316] text-white shadow-sm'
                        : 'text-zinc-600'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-200/60">
                <div className="flex justify-between text-[10px] font-bold text-zinc-500">
                  <span>MinIO Quota</span>
                  <span className="text-orange-600">50 GB</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-zinc-200 overflow-hidden">
                  <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-[#ff3b30] to-[#f97316]" />
                </div>
              </div>
            </div>

            {/* Center KPIs + Project Kanban Preview */}
            <div className="md:col-span-9 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { k: 'Active Projects', v: '14', sub: '3 custom workflows' },
                  { k: 'AI Efficiency', v: '96.4%', sub: 'Gemini 2.5 verified' },
                  { k: 'Budget Burn', v: '₹12.8L', sub: '64% of allocated' },
                ].map((stat) => (
                  <div key={stat.k} className="rounded-2xl bg-white p-3.5 border border-zinc-200/70">
                    <p className="text-[11px] font-medium text-zinc-500">{stat.k}</p>
                    <p className="font-display text-lg sm:text-xl font-bold text-[#111318] mt-0.5 tabular-nums">
                      {stat.v}
                    </p>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">{stat.sub}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl bg-white p-4 border border-zinc-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#111318]">
                    Solar Substation Phase II — Custom Kanban
                  </span>
                  <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-bold text-orange-600">
                    Project-Scoped Statuses
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { col: 'Site Survey', badge: '2 tasks', color: 'bg-sky-500', task: 'Earthing Grid Audit' },
                    { col: 'Field Proof', badge: '3 tasks', color: 'bg-orange-500', task: 'Inverter Mounting Media' },
                    { col: 'QA Signed Off', badge: '7 tasks', color: 'bg-emerald-500', task: 'Transformer Trenching' },
                  ].map((c) => (
                    <div key={c.col} className="rounded-xl bg-[#f8f9fb] p-3 border border-zinc-200/60 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-zinc-700">
                        <span className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${c.color}`} />
                          {c.col}
                        </span>
                        <span className="text-zinc-400">{c.badge}</span>
                      </div>
                      <div className="rounded-lg bg-white p-2.5 border border-zinc-200/60 shadow-xs">
                        <p className="text-[11px] font-semibold text-[#111318]">{c.task}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Checklist 4/4 · MinIO Proof ✓</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Mobile PWA Card (Bottom-Right 3D Layer) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="hidden lg:block absolute -right-4 -bottom-6 w-[255px] rounded-[28px] border border-zinc-200 bg-[#111318] p-3.5 text-white shadow-[0_28px_60px_-15px_rgba(0,0,0,0.45)] [transform:translateZ(45px)]"
        >
          <div className="flex items-center justify-between text-[10px] text-zinc-400 pb-2 border-b border-white/10">
            <span className="flex items-center gap-1 font-semibold text-white">
              <Smartphone className="w-3 h-3 text-orange-400" />
              Field PWA
            </span>
            <span>5-Tab Dock</span>
          </div>
          <div className="py-3 space-y-2.5">
            <div className="rounded-xl bg-white/5 p-2.5 border border-white/10">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-400">
                <Mic className="w-3 h-3" />
                Voice-to-Text (HI/EN)
              </div>
              <p className="text-[11px] text-zinc-200 mt-1 leading-snug">
                &ldquo;Pole 14 earthing complete, cable trenching verified.&rdquo;
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-emerald-500/15 px-2.5 py-2 text-[10px] font-semibold text-emerald-300 border border-emerald-500/20">
              <span className="flex items-center gap-1">
                <UploadCloud className="w-3 h-3" />
                Checklist Proof Uploaded
              </span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1 rounded-2xl bg-white/10 p-1.5 text-center text-[9px] font-semibold text-zinc-300">
            <span className="rounded-xl bg-gradient-to-r from-[#ff3b30] to-[#f97316] py-1 text-white">Home</span>
            <span className="py-1">Tasks</span>
            <span className="py-1">Proj</span>
            <span className="py-1">Media</span>
            <span className="py-1">₹</span>
          </div>
        </motion.div>

        {/* Floating AI Governance Pill (Top-Left 3D Layer) */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="hidden lg:flex items-center gap-2.5 absolute -left-5 top-16 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 shadow-xl [transform:translateZ(35px)]"
        >
          <div className="h-8 w-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#111318]">Zero Hardcoded Templates</p>
            <p className="text-[10px] text-zinc-500">Dynamic statuses per department</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
