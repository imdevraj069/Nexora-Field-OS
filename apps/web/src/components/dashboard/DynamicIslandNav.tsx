'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Layers, Sparkles, UploadCloud } from 'lucide-react';

export type NavTabId = 'auth' | 'projects' | 'roles' | 'evidence';

const TABS: Array<{ id: NavTabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'auth', label: 'Org & Auth', icon: ShieldCheck },
  { id: 'projects', label: 'Projects & AI Plan', icon: Sparkles },
  { id: 'roles', label: 'RBAC Flags', icon: Layers },
  { id: 'evidence', label: 'Evidence & Cross-Org', icon: UploadCloud },
];

export function DynamicIslandNav({
  activeTab,
  onSelect,
}: {
  activeTab: NavTabId;
  onSelect: (id: NavTabId) => void;
}) {
  return (
    <nav
      aria-label="Command Center Navigation"
      className="inline-flex flex-wrap items-center gap-1 rounded-full border border-white/10 bg-[#0e121a]/95 p-1.5 backdrop-blur-xl"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className="relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:text-slate-100"
          >
            {isActive && (
              <motion.div
                layoutId="nexora-island-pill"
                className="absolute inset-0 rounded-full bg-emerald-600/90 shadow-sm shadow-emerald-500/20"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <Icon className={`relative z-10 h-4 w-4 ${isActive ? 'text-white' : ''}`} />
            <span className={`relative z-10 ${isActive ? 'font-semibold text-white' : ''}`}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
