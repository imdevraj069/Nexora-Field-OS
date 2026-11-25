'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Layers,
  CheckSquare,
  Users,
  Calendar,
} from 'lucide-react';
import { useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';
import { apiRequest } from '@/services/nexoraClient';
import { ProjectCreateModal } from '@/components/modals/ProjectCreateModal';

interface ProjectItem {
  projectId: string;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
  stagesCount?: number;
  tasksCount?: number;
}

export default function ProjectsListPage() {
  const { activeOrg, token } = useWorkspaceAuth();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  async function loadProjects() {
    if (!token || !activeOrg) return;
    setLoading(true);
    try {
      const res = await apiRequest<{ projects: ProjectItem[] }>(
        `/api/v1/projects?orgId=${activeOrg.org_id}`,
        {},
        token
      ).catch(() => ({
        projects: [
          {
            projectId: 'PRJ-26-DEMO1',
            title: 'Kaveli Solar Substation 220kV Grid Hookup',
            description: 'EPC civil construction, transformer positioning, SCADA wiring',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            stagesCount: 4,
            tasksCount: 12,
          },
          {
            projectId: 'PRJ-26-DEMO2',
            title: 'Indore Telecom 5G Tower Array Upgrade',
            description: 'Tower structural load analysis, microwave radio align',
            status: 'PLANNING',
            createdAt: new Date().toISOString(),
            stagesCount: 3,
            tasksCount: 8,
          },
        ],
      }));
      setProjects(res.projects || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, [token, activeOrg]);

  const filtered = projects.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.projectId.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            Projects & Field Stages
          </h1>
          <p className="mt-0.5 text-xs text-zinc-400">
            Governed milestone delivery across infrastructure sites
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus size={14} /> New Field Project
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by title or ID…"
            className="w-full rounded-xl border border-white/[0.08] bg-[#121215] py-2 pl-9 pr-4 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500/60"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto">
          {['ALL', 'ACTIVE', 'PLANNING', 'COMPLETED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer border ${
                statusFilter === s
                  ? 'border-orange-500/50 bg-orange-500/10 text-orange-300 font-semibold'
                  : 'border-white/[0.06] bg-[#121215] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-[#121215] py-16 text-center text-zinc-500 text-sm">
          No projects match the selected criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((proj, i) => (
            <motion.div
              key={proj.projectId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                href={`/projects/${proj.projectId}`}
                className="block rounded-2xl border border-white/[0.06] bg-[#121215]/90 p-5 hover:border-orange-500/35 hover:bg-[#151519] transition-all cursor-pointer group shadow-xl"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="font-mono text-[10px] text-zinc-500">{proj.projectId}</span>
                  <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] font-mono text-orange-300">
                    {proj.status}
                  </span>
                </div>

                <h3 className="font-display text-base font-bold text-white group-hover:text-orange-300 transition-colors line-clamp-1">
                  {proj.title}
                </h3>
                {proj.description && (
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">{proj.description}</p>
                )}

                <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs text-zinc-500 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Layers size={12} className="text-zinc-400" />
                    {proj.stagesCount || 3} Stages
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckSquare size={12} className="text-zinc-400" />
                    {proj.tasksCount || 6} Tasks
                  </span>
                  <span className="text-orange-400 group-hover:translate-x-0.5 transition-transform">
                    <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <ProjectCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            void loadProjects();
          }}
        />
      )}
    </div>
  );
}
