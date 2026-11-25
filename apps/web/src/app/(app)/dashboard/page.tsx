'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  FolderKanban,
  CheckSquare,
  ArrowRight,
  Plus,
  Clock,
  Activity,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { PERMISSION_FLAGS } from '@nexora/shared-types';
import { useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDrawerStore } from '@/stores/useDrawerStore';
import { apiRequest } from '@/services/nexoraClient';
import { ProjectCreateModal } from '@/components/modals/ProjectCreateModal';
import { RevealInView, AnimatedRing, MARLO_EASE } from '@/components/ui/motion';

interface ProjectRow {
  projectId: string;
  title: string;
  status: string;
  stagesCount: number;
  tasksCount: number;
  completedTasksCount: number;
}

interface TaskRow {
  taskId: string;
  projectId: string;
  title: string;
  status: string;
  stageName?: string;
  projectTitle?: string;
  deadline?: string | null;
  checklist?: Array<{ completed: boolean }>;
}

export default function TenantDashboardPage() {
  const { user, activeOrg, token } = useWorkspaceAuth();
  const { permissions, roleName } = useAuthStore();
  const { openTaskDrawer, refreshTick } = useDrawerStore();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [myTasks, setMyTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);

  const canCreateProject = Boolean(permissions[PERMISSION_FLAGS.PROJECT_CREATE]);
  const canViewAllProjects = Boolean(
    permissions[PERMISSION_FLAGS.PROJECT_VIEW_ALL] ||
      permissions[PERMISSION_FLAGS.PROJECT_MANAGE] ||
      permissions[PERMISSION_FLAGS.ORG_MANAGE_SETTINGS]
  );
  const canVerify = Boolean(permissions[PERMISSION_FLAGS.TASK_VERIFY_APPROVE]);

  async function loadData() {
    if (!token || !activeOrg) return;
    setLoading(true);
    try {
      const [pRes, tRes, myRes] = await Promise.all([
        apiRequest<{ projects: ProjectRow[] }>('/api/v1/projects', {}, token),
        apiRequest<{ tasks: TaskRow[] }>('/api/v1/tasks', {}, token),
        apiRequest<{ tasks: TaskRow[] }>('/api/v1/tasks/my-assigned', {}, token),
      ]);
      setProjects(pRes.projects || []);
      setTasks(tRes.tasks || []);
      setMyTasks(myRes.tasks || []);
    } catch (e) {
      console.error('Dashboard load failed:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [token, activeOrg, refreshTick]);

  const activeSourceTasks = canViewAllProjects ? tasks : myTasks;
  const totalTasks = activeSourceTasks.length;
  const doneTasks = activeSourceTasks.filter((t) =>
    ['DONE', 'COMPLETED', 'VERIFIED', 'SUBMITTED'].includes(t.status)
  ).length;
  const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const statusGroups = [
    { label: 'OPEN', count: activeSourceTasks.filter((t) => t.status === 'TODO').length, tone: 'bg-zinc-600' },
    {
      label: 'ACTIVE',
      count: activeSourceTasks.filter((t) => !['TODO', 'DONE', 'COMPLETED', 'VERIFIED'].includes(t.status)).length,
      tone: 'bg-orange-500',
    },
    {
      label: 'DONE',
      count: activeSourceTasks.filter((t) => ['DONE', 'COMPLETED', 'VERIFIED'].includes(t.status)).length,
      tone: 'bg-emerald-500',
    },
  ];
  const maxBar = Math.max(1, ...statusGroups.map((b) => b.count));

  const verificationQueue = tasks.filter((t) => ['SUBMITTED', 'IN_REVIEW'].includes(t.status));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Operations Overview
          </h1>
          <p className="mt-0.5 text-xs text-zinc-400">
            Welcome, <span className="text-zinc-200 font-semibold">{user?.fullName || 'User'}</span> ·{' '}
            <span className="font-mono text-orange-400">{roleName || 'Member'}</span> @ {activeOrg?.org_name}
          </p>
        </div>

        {canCreateProject && (
          <button
            onClick={() => setShowCreateProject(true)}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus size={14} /> New Project
          </button>
        )}
      </div>

      {/* Role-Based Asymmetric Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.75fr_minmax(320px,1fr)] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          {/* Org-Wide / Manager Project Capacity Section */}
          {canViewAllProjects && (
            <RevealInView className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-display text-base font-bold text-white">Project Capacity & Progress</h2>
                  <p className="text-xs text-zinc-500">Live segmented task delivery across active projects</p>
                </div>
                <Link href="/projects" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
                  All Projects <ArrowRight size={12} />
                </Link>
              </div>

              {loading ? (
                <div className="py-10 text-center text-xs text-zinc-500">Loading telemetry…</div>
              ) : projects.length === 0 ? (
                <div className="py-10 text-center text-xs text-zinc-500">No projects yet.</div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {projects.slice(0, 5).map((p, idx) => {
                    const total = Math.max(p.tasksCount, 1);
                    const donePct = Math.round((p.completedTasksCount / total) * 100);
                    const waitPct = 100 - donePct;
                    return (
                      <div key={p.projectId} className="grid grid-cols-1 sm:grid-cols-[180px_76px_1fr_34px] items-center gap-3 py-3.5 first:pt-1 last:pb-1">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#1a1a1f] border border-white/[0.06] text-orange-400">
                            <FolderKanban size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-100 truncate">{p.title}</p>
                            <p className="text-[10px] font-mono text-zinc-500">{p.stagesCount} milestones</p>
                          </div>
                        </div>
                        <div className="flex flex-col leading-tight">
                          <span className="font-display text-xl font-bold text-white tabular-nums">{p.tasksCount}</span>
                          <small className="text-[10px] font-mono text-zinc-500">tasks</small>
                        </div>
                        <div className="flex h-9 gap-1.5 min-w-0">
                          {p.completedTasksCount > 0 && (
                            <motion.div
                              initial={{ scaleX: 0 }}
                              whileInView={{ scaleX: 1 }}
                              viewport={{ once: false, amount: 0.2 }}
                              transition={{ duration: 0.85, delay: idx * 0.05, ease: MARLO_EASE }}
                              style={{ width: `${Math.max(18, donePct)}%`, transformOrigin: 'left' }}
                              className="flex items-center justify-end rounded-full bg-zinc-100 px-3 text-xs font-bold text-zinc-900 tabular-nums"
                            >
                              {p.completedTasksCount}
                            </motion.div>
                          )}
                          <motion.div
                            initial={{ scaleX: 0 }}
                            whileInView={{ scaleX: 1 }}
                            viewport={{ once: false, amount: 0.2 }}
                            transition={{ duration: 0.85, delay: 0.1 + idx * 0.05, ease: MARLO_EASE }}
                            style={{ width: `${Math.max(20, waitPct)}%`, transformOrigin: 'left' }}
                            className="flex flex-1 items-center justify-end rounded-full bg-[#242429] px-3 text-xs font-semibold text-zinc-300 tabular-nums"
                          >
                            {p.tasksCount - p.completedTasksCount}
                          </motion.div>
                        </div>
                        <Link href={`/projects/${p.projectId}`} className="grid h-8 w-8 place-items-center rounded-full border border-white/[0.08] text-zinc-400 hover:text-orange-400">
                          <ChevronRight size={14} />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </RevealInView>
          )}

          {/* Verifier / QA Queue Section */}
          {canVerify && verificationQueue.length > 0 && (
            <RevealInView delay={0.04} className="rounded-[22px] border border-orange-500/25 bg-[#151214] p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck size={16} className="text-orange-400" />
                  Pending Verification Queue ({verificationQueue.length})
                </h2>
              </div>
              <div className="space-y-2">
                {verificationQueue.slice(0, 5).map((t) => (
                  <button
                    key={t.taskId}
                    onClick={() => openTaskDrawer(t.taskId, t.projectId)}
                    className="w-full text-left flex items-center justify-between rounded-2xl border border-white/[0.06] bg-[#1a1a20] p-3 hover:border-orange-500/40 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{t.title}</p>
                      <p className="text-[10px] font-mono text-zinc-500">{t.projectTitle} · {t.stageName}</p>
                    </div>
                    <span className="rounded-full bg-orange-500/15 px-2.5 py-0.5 font-mono text-[10px] text-orange-300">
                      Review
                    </span>
                  </button>
                ))}
              </div>
            </RevealInView>
          )}

          {/* Productivity Pulse */}
          <RevealInView delay={0.06} className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-orange-400" />
                <h2 className="font-display text-base font-bold text-white">
                  {canViewAllProjects ? 'Organization Task Pulse' : 'My Execution Pulse'}
                </h2>
              </div>
              <span className="font-mono text-xs text-zinc-400 tabular-nums">{totalTasks} tasks</span>
            </div>
            <div className="grid grid-cols-3 gap-4 h-36 items-end pt-4">
              {statusGroups.map((bar, i) => (
                <div key={bar.label} className="flex flex-col items-center h-full justify-end gap-2">
                  <span className="font-mono text-xs font-bold text-zinc-200 tabular-nums">{bar.count}</span>
                  <div className="w-full max-w-[60px] flex-1 flex items-end rounded-xl bg-[#1a1a1f] p-1">
                    <motion.div
                      initial={{ scaleY: 0 }}
                      whileInView={{ scaleY: Math.max(0.08, bar.count / maxBar) }}
                      viewport={{ once: false, amount: 0.2 }}
                      transition={{ duration: 0.85, delay: i * 0.06, ease: MARLO_EASE }}
                      style={{ transformOrigin: 'bottom' }}
                      className={`w-full h-full rounded-lg ${bar.tone}`}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-zinc-500 tracking-wider">{bar.label}</span>
                </div>
              ))}
            </div>
          </RevealInView>
        </div>

        {/* Right Column */}
        <div className="space-y-4 min-w-0">
          <RevealInView delay={0.08} className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-5 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">Completion Rate</p>
                <p className="font-display text-3xl font-bold text-white mt-1 tabular-nums">{completionPct}%</p>
                <p className="text-xs text-zinc-400 mt-1">{doneTasks} of {totalTasks} tasks done</p>
              </div>
              <AnimatedRing percent={completionPct} size={68} strokeWidth={6} />
            </div>
          </RevealInView>

          <RevealInView delay={0.12} className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                <CheckSquare size={15} className="text-orange-400" />
                {myTasks.length > 0 ? 'My Field Queue' : 'Up Next'}
              </h2>
              <Link href="/tasks" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
                All Tasks <ArrowRight size={12} />
              </Link>
            </div>

            {(myTasks.length > 0 ? myTasks : tasks).length === 0 ? (
              <p className="py-8 text-center text-xs text-zinc-500">No tasks assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {(myTasks.length > 0 ? myTasks : tasks).slice(0, 6).map((t) => {
                  const chkDone = (t.checklist || []).filter((c) => c.completed).length;
                  const chkTotal = (t.checklist || []).length;
                  return (
                    <button
                      key={t.taskId}
                      onClick={() => openTaskDrawer(t.taskId, t.projectId)}
                      className="w-full text-left flex items-center justify-between gap-3 rounded-2xl border border-white/[0.05] bg-[#18181c] p-3 hover:border-orange-500/35 transition-all cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-100 group-hover:text-orange-300 truncate">{t.title}</p>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 mt-0.5">
                          <span className="truncate">{t.projectTitle || t.projectId}</span>
                          {chkTotal > 0 && <span className="text-orange-400">· {chkDone}/{chkTotal}</span>}
                          {t.deadline && <span className="flex items-center gap-0.5">· <Clock size={10} /> {t.deadline.slice(0, 10)}</span>}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full border border-orange-500/25 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-mono text-orange-300">
                        {t.status}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </RevealInView>
        </div>
      </div>

      <ProjectCreateModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onSuccess={() => {
          setShowCreateProject(false);
          void loadData();
        }}
      />
    </div>
  );
}
