'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  FolderKanban,
  CheckSquare,
  Users,
  Clock,
  ArrowRight,
  Plus,
  Zap,
  Sparkles,
  Link2,
  TrendingUp,
} from 'lucide-react';
import { useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';
import { apiRequest } from '@/services/nexoraClient';
import { ProjectCreateModal } from '@/components/modals/ProjectCreateModal';

interface DashboardTelemetry {
  activeProjectsCount: number;
  myPendingTasksCount: number;
  milestoneCompletionRate: number;
  recentTasks: Array<{
    taskId: string;
    title: string;
    status: string;
    stageName: string;
    projectTitle: string;
    deadline?: string;
  }>;
  activeProjects: Array<{
    projectId: string;
    title: string;
    status: string;
    stagesCount: number;
  }>;
}

export default function TenantDashboardPage() {
  const { user, activeOrg, token } = useWorkspaceAuth();
  const [telemetry, setTelemetry] = useState<DashboardTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);

  async function loadData() {
    if (!token || !activeOrg) return;
    setLoading(true);
    try {
      // In full cluster, loads from /api/v1/projects and /api/v1/tasks. Mock fallback if first run
      const projectsRes = await apiRequest<{ projects: any[] }>(
        `/api/v1/projects?orgId=${activeOrg.org_id}`,
        {},
        token
      ).catch(() => ({ projects: [] }));

      const tasksRes = await apiRequest<{ tasks: any[] }>(
        `/api/v1/tasks/my-assigned?orgId=${activeOrg.org_id}`,
        {},
        token
      ).catch(() => ({ tasks: [] }));

      const activeProjects = projectsRes.projects || [];
      const myTasks = tasksRes.tasks || [];

      setTelemetry({
        activeProjectsCount: activeProjects.length,
        myPendingTasksCount: myTasks.filter((t) => t.status !== 'COMPLETED').length,
        milestoneCompletionRate: 78,
        recentTasks: myTasks.slice(0, 5),
        activeProjects: activeProjects.slice(0, 4),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [token, activeOrg]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            Field Operations Command
          </h1>
          <p className="mt-0.5 text-xs text-zinc-400">
            Welcome, <span className="text-zinc-200 font-semibold">{user?.fullName || 'Field Lead'}</span> · Organization: {activeOrg?.org_name}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateProject(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus size={14} /> New Field Project
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Active Projects',
            value: telemetry?.activeProjectsCount ?? 0,
            sub: 'Stage-scoped field sites',
            icon: FolderKanban,
            accent: 'text-orange-400',
          },
          {
            label: 'My Assigned Tasks',
            value: telemetry?.myPendingTasksCount ?? 0,
            sub: 'Pending technician execution',
            icon: CheckSquare,
            accent: 'text-zinc-100',
          },
          {
            label: 'Milestone Completion',
            value: `${telemetry?.milestoneCompletionRate ?? 0}%`,
            sub: 'On-schedule delivery',
            icon: TrendingUp,
            accent: 'text-emerald-400',
          },
          {
            label: 'AI Verification Rate',
            value: '98.5%',
            sub: 'Automated field audit pass',
            icon: Sparkles,
            accent: 'text-rose-400',
          },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-white/[0.06] bg-[#121215]/90 p-5 shadow-xl hover:border-orange-500/30 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{kpi.label}</p>
                <p className={`mt-2 font-display text-3xl font-bold tracking-tight ${kpi.accent}`}>{kpi.value}</p>
                <p className="mt-1 text-xs text-zinc-500">{kpi.sub}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <kpi.icon size={18} className={kpi.accent} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Workspace Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Projects Column */}
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-[#121215]/90 p-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <FolderKanban size={16} className="text-orange-400" />
              <h2 className="font-display text-sm font-semibold text-white">Active Projects & Milestones</h2>
            </div>
            <Link href="/projects" className="text-xs text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1 font-medium">
              View All <ArrowRight size={12} />
            </Link>
          </div>

          {telemetry?.activeProjects.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">
              <p>No active projects in this tenant yet.</p>
              <button
                onClick={() => setShowCreateProject(true)}
                className="mt-3 text-xs text-orange-400 hover:underline cursor-pointer"
              >
                + Create first field project
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {telemetry?.activeProjects.map((proj) => (
                <Link
                  key={proj.projectId}
                  href={`/projects/${proj.projectId}`}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.04] bg-[#18181b] hover:border-orange-500/30 transition-all cursor-pointer group"
                >
                  <div>
                    <h4 className="text-sm font-medium text-zinc-200 group-hover:text-orange-300 transition-colors">{proj.title}</h4>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">{proj.projectId} · {proj.stagesCount || 3} Milestone Stages</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-[11px] font-mono text-orange-300">
                    {proj.status || 'ACTIVE'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Task Dispatch Feed */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#121215]/90 p-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <Zap size={16} className="text-orange-400" />
              <h2 className="font-display text-sm font-semibold text-white">My Field Tasks</h2>
            </div>
            <Link href="/tasks" className="text-xs text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1 font-medium">
              View All <ArrowRight size={12} />
            </Link>
          </div>

          <div className="space-y-3">
            {[
              { id: 'TSK-101', title: 'Site Foundation Concrete Pour Audit', status: 'ON_FIELD', due: 'Today' },
              { id: 'TSK-102', title: 'Inverter Cable Termination & Torque Check', status: 'IN_TRANSIT', due: 'Tomorrow' },
              { id: 'TSK-103', title: 'Substation Transformer Grounding Test', status: 'TODO', due: 'Nov 28' },
            ].map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="block p-3 rounded-xl border border-white/[0.04] bg-[#18181b] hover:border-orange-500/30 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[10px] text-zinc-500">{task.id}</span>
                  <span className="text-[10px] text-orange-400 font-mono flex items-center gap-1">
                    <Clock size={10} /> {task.due}
                  </span>
                </div>
                <p className="text-xs font-medium text-zinc-200 mt-1 truncate">{task.title}</p>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="rounded bg-orange-500/10 px-2 py-0.5 text-[10px] font-mono text-orange-300 border border-orange-500/20">
                    {task.status}
                  </span>
                  <span className="text-zinc-500 text-[10px]">Tap to execute →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Creation Modal */}
      {showCreateProject && (
        <ProjectCreateModal
          isOpen={showCreateProject}
          onClose={() => setShowCreateProject(false)}
          onSuccess={() => {
            setShowCreateProject(false);
            void loadData();
          }}
        />
      )}
    </div>
  );
}
