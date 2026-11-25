'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Plus,
  Search,
  Layers,
  CheckSquare,
  Pin,
  LayoutGrid,
  GanttChart,
  ArrowRight,
} from 'lucide-react';
import { useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';
import { useDrawerStore } from '@/stores/useDrawerStore';
import { apiRequest } from '@/services/nexoraClient';
import { ProjectCreateModal } from '@/components/modals/ProjectCreateModal';
import { RevealInView, AnimatedRing, MARLO_EASE } from '@/components/ui/motion';

interface ProjectItem {
  projectId: string;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
  stagesCount: number;
  tasksCount: number;
  completedTasksCount: number;
}

export default function ProjectsListPage() {
  const { activeOrg, token } = useWorkspaceAuth();
  const { refreshTick } = useDrawerStore();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [pinned, setPinned] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nexora_pinned_projects') || '[]');
      if (Array.isArray(saved)) setPinned(saved);
    } catch {
      // ignore
    }
  }, []);

  async function loadProjects() {
    if (!token || !activeOrg) return;
    setLoading(true);
    try {
      const res = await apiRequest<{ projects: ProjectItem[] }>('/api/v1/projects', {}, token);
      setProjects(res.projects || []);
    } catch (e) {
      console.error('Failed to load projects:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, [token, activeOrg, refreshTick]);

  function togglePin(e: React.MouseEvent, projectId: string) {
    e.preventDefault();
    e.stopPropagation();
    const next = pinned.includes(projectId) ? pinned.filter((id) => id !== projectId) : [...pinned, projectId];
    setPinned(next);
    localStorage.setItem('nexora_pinned_projects', JSON.stringify(next));
  }

  const filtered = projects
    .filter((p) => {
      const matchSearch =
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.projectId.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => Number(pinned.includes(b.projectId)) - Number(pinned.includes(a.projectId)));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">Projects</h1>
          <p className="mt-0.5 text-xs text-zinc-400">
            Milestone-governed field operations across {activeOrg?.org_name}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus size={14} /> New Project
        </button>
      </div>

      {/* Marlo Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by title or ID…"
            className="w-full rounded-full border border-white/[0.08] bg-[#121215] py-2 pl-9 pr-4 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500/60"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-full border border-white/[0.07] bg-[#121215] p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-orange-500/20 text-orange-300' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LayoutGrid size={13} /> Grid
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'timeline' ? 'bg-orange-500/20 text-orange-300' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <GanttChart size={13} /> Timeline
            </button>
          </div>

          <div className="flex gap-1 overflow-x-auto">
            {['ALL', 'ACTIVE', 'PLANNING', 'COMPLETED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-mono transition-colors cursor-pointer border ${
                  statusFilter === s
                    ? 'border-orange-500/50 bg-orange-500/15 text-orange-300 font-semibold'
                    : 'border-white/[0.06] bg-[#121215] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="rounded-[22px] border border-white/[0.06] bg-[#121215] py-16 text-center text-zinc-500 text-xs">
          Loading projects from shard…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[22px] border border-white/[0.06] bg-[#121215] py-16 text-center text-zinc-500 text-sm">
          No projects found. Click <strong className="text-orange-400">+ New Project</strong> to create one.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((proj, i) => {
            const pct = proj.tasksCount > 0 ? Math.round((proj.completedTasksCount / proj.tasksCount) * 100) : 0;
            const isPinned = pinned.includes(proj.projectId);
            return (
              <RevealInView key={proj.projectId} delay={i * 0.04}>
                <Link
                  href={`/projects/${proj.projectId}`}
                  className="flex flex-col gap-3.5 rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-5 hover:border-orange-500/40 hover:bg-[#16161b] transition-all cursor-pointer group shadow-xl"
                >
                  {/* Top Row */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                      <span className="h-2 w-2 rounded-sm bg-orange-500" />
                      {proj.projectId}
                    </span>
                    <button
                      onClick={(e) => togglePin(e, proj.projectId)}
                      className={`grid h-8 w-8 place-items-center rounded-xl border transition-colors cursor-pointer ${
                        isPinned
                          ? 'bg-zinc-100 text-zinc-900 border-zinc-100'
                          : 'border-white/[0.07] text-zinc-500 hover:text-white'
                      }`}
                      title="Pin project"
                    >
                      <Pin size={13} />
                    </button>
                  </div>

                  {/* Mid Row with Animated SVG Progress Ring */}
                  <div className="flex items-center gap-3.5">
                    <AnimatedRing percent={pct} size={52} strokeWidth={5} />
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-bold text-white group-hover:text-orange-300 transition-colors truncate">
                        {proj.title}
                      </h3>
                      <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">
                        {proj.description || 'Field operations rollout'}
                      </p>
                    </div>
                  </div>

                  {/* Meta Row */}
                  <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Layers size={13} className="text-orange-400" />
                      {proj.stagesCount} stages
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CheckSquare size={13} className="text-zinc-400" />
                      {proj.completedTasksCount}/{proj.tasksCount} tasks
                    </span>
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="rounded-full border border-orange-500/25 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-mono text-orange-300">
                      {proj.status}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-300 group-hover:text-orange-400 transition-colors">
                      Open Milestones <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </Link>
              </RevealInView>
            );
          })}
        </div>
      ) : (
        /* Timeline / Gantt View */
        <RevealInView className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Project Delivery Timeline
            </span>
            <span className="text-[11px] font-mono text-orange-400">Progress % across stages</span>
          </div>
          <div className="space-y-3">
            {filtered.map((proj, i) => {
              const pct = proj.tasksCount > 0 ? Math.round((proj.completedTasksCount / proj.tasksCount) * 100) : 0;
              return (
                <Link
                  key={proj.projectId}
                  href={`/projects/${proj.projectId}`}
                  className="grid grid-cols-1 sm:grid-cols-[220px_1fr_70px] items-center gap-3 p-2.5 rounded-2xl hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white group-hover:text-orange-300 truncate">{proj.title}</p>
                    <p className="text-[10px] font-mono text-zinc-500">{proj.stagesCount} stages · {proj.tasksCount} tasks</p>
                  </div>
                  <div className="h-7 rounded-full bg-[#1a1a1f] border border-white/[0.05] p-1 overflow-hidden">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: false, amount: 0.2 }}
                      transition={{ duration: 0.9, delay: i * 0.05, ease: MARLO_EASE }}
                      style={{ width: `${Math.max(8, pct)}%`, transformOrigin: 'left' }}
                      className="h-full rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400"
                    />
                  </div>
                  <span className="text-right font-mono text-xs font-bold text-zinc-200 tabular-nums">{pct}%</span>
                </Link>
              );
            })}
          </div>
        </RevealInView>
      )}

      <ProjectCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          void loadProjects();
        }}
      />
    </div>
  );
}
