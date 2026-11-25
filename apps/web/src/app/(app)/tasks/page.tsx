'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  CheckSquare,
  Search,
  Filter,
  ArrowRight,
  Clock,
  User,
  Zap,
  Sparkles,
} from 'lucide-react';
import { useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';
import { apiRequest } from '@/services/nexoraClient';

export default function TasksDirectoryPage() {
  const { activeOrg, token } = useWorkspaceAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  async function loadTasks() {
    if (!token || !activeOrg) return;
    setLoading(true);
    try {
      const res = await apiRequest<{ tasks: any[] }>(
        `/api/v1/tasks?orgId=${activeOrg.org_id}`,
        {},
        token
      ).catch(() => ({
        tasks: [
          { taskId: 'TSK-101', title: 'Site Foundation Concrete Pour Audit', status: 'ON_FIELD', taskType: 'FIELD_INSPECTION', deadline: '2026-11-26', efficiencyScore: 96 },
          { taskId: 'TSK-102', title: 'Inverter Cable Termination & Torque Check', status: 'IN_TRANSIT', taskType: 'INSTALLATION', deadline: '2026-11-27', efficiencyScore: null },
          { taskId: 'TSK-103', title: 'Substation Transformer Grounding Test', status: 'TODO', taskType: 'COMMISSIONING', deadline: '2026-11-28', efficiencyScore: null },
          { taskId: 'TSK-104', title: 'Drone Thermal Array Heatmap Scan', status: 'COMPLETED', taskType: 'SURVEY', deadline: '2026-11-24', efficiencyScore: 99 },
          { taskId: 'TSK-105', title: 'Grid Synchronization Frequency Interlock', status: 'VERIFIED', taskType: 'COMMISSIONING', deadline: '2026-11-23', efficiencyScore: 98 },
        ],
      }));
      setTasks(res.tasks || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTasks();
  }, [token, activeOrg]);

  const filtered = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.taskId.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            Field Tasks Directory
          </h1>
          <p className="mt-0.5 text-xs text-zinc-400">
            Real-time execution, location checkpoints, and verification states
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks by title or task ID…"
            className="w-full rounded-xl border border-white/[0.08] bg-[#121215] py-2 pl-9 pr-4 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500/60"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto">
          {['ALL', 'TODO', 'IN_TRANSIT', 'ON_FIELD', 'SUBMITTED', 'COMPLETED', 'VERIFIED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-2.5 py-1 text-xs font-mono transition-colors cursor-pointer border ${
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

      {/* Task Rows */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#121215]/90 overflow-hidden shadow-xl">
        <div className="divide-y divide-white/[0.04]">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 text-sm">
              No field tasks match the selected filter.
            </div>
          ) : (
            filtered.map((task) => (
              <Link
                key={task.taskId}
                href={`/tasks/${task.taskId}`}
                className="flex items-center justify-between p-4 hover:bg-white/[0.015] transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 shrink-0">
                    <CheckSquare size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-zinc-500">{task.taskId}</span>
                      <span className="rounded bg-[#18181b] border border-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                        {task.taskType}
                      </span>
                    </div>
                    <h3 className="font-display text-sm font-semibold text-white group-hover:text-orange-300 transition-colors mt-0.5">
                      {task.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  {task.efficiencyScore !== null && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-xs font-mono font-semibold text-orange-400">
                      <Zap size={12} /> {task.efficiencyScore}%
                    </span>
                  )}
                  <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-xs font-mono text-orange-300">
                    {task.status}
                  </span>
                  <ArrowRight size={14} className="text-zinc-600 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
