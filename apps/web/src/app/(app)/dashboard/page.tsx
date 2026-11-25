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
  Sparkles,
  AlertTriangle,
  Mic,
  Wallet,
} from 'lucide-react';
import { PERMISSION_FLAGS } from '@nexora/shared-types';
import { useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDrawerStore } from '@/stores/useDrawerStore';
import { apiRequest } from '@/services/nexoraClient';
import { ProjectCreateModal } from '@/components/modals/ProjectCreateModal';
import { RevealInView, AnimatedRing, MARLO_EASE } from '@/components/ui/motion';

export default function TenantDashboardPage() {
  const { user, activeOrg, token } = useWorkspaceAuth();
  const { permissions, roleName } = useAuthStore();
  const { openTaskDrawer, refreshTick } = useDrawerStore();

  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [finance, setFinance] = useState<any>(null);
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
      const [pRes, tRes, myRes, evRes, actRes, anRes, finRes] = await Promise.all([
        apiRequest<{ projects: any[] }>('/api/v1/projects', {}, token).catch(() => ({ projects: [] })),
        apiRequest<{ tasks: any[] }>('/api/v1/tasks', {}, token).catch(() => ({ tasks: [] })),
        apiRequest<{ tasks: any[] }>('/api/v1/tasks/my-assigned', {}, token).catch(() => ({ tasks: [] })),
        apiRequest<{ files: any[] }>('/api/v1/evidence', {}, token).catch(() => ({ files: [] })),
        apiRequest<{ activity: any[] }>('/api/v1/activity', {}, token).catch(() => ({ activity: [] })),
        apiRequest<any>('/api/v1/analytics/efficiency', {}, token).catch(() => null),
        apiRequest<any>('/api/v1/finance/overview', {}, token).catch(() => null),
      ]);
      setProjects(pRes.projects || []);
      setTasks(tRes.tasks || []);
      setMyTasks(myRes.tasks || []);
      setEvidence(evRes.files || []);
      setActivity(actRes.activity || []);
      setAnalytics(anRes);
      setFinance(finRes);
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

  const now = Date.now();
  const slaAlerts = activeSourceTasks.filter((t) => {
    if (!t.deadline || ['DONE', 'COMPLETED', 'VERIFIED'].includes(t.status)) return false;
    return new Date(t.deadline).getTime() - now < 48 * 3600 * 1000;
  });

  const statusGroups = [
    { label: 'OPEN', count: activeSourceTasks.filter((t) => t.status === 'TODO').length, tone: 'bg-zinc-500' },
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Operations Command
          </h1>
          <p className="mt-0.5 text-xs text-zinc-400">
            Welcome, <span className="text-zinc-200 font-semibold">{user?.fullName || 'User'}</span> ·{' '}
            <span className="font-mono text-orange-400">{roleName || 'Member'}</span> @ {activeOrg?.org_name}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/finance"
            className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#121215] px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-orange-500/40"
          >
            <Wallet size={13} className="text-orange-400" />
            ₹{((finance?.totalAllocatedPaise || 0) / 100).toLocaleString('en-IN')} Budget
          </Link>
          {canCreateProject && (
            <button
              onClick={() => setShowCreateProject(true)}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-orange-950/30 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus size={14} /> New Project
            </button>
          )}
        </div>
      </div>

      {/* Widget 1: Top 4 KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <RevealInView className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-zinc-500">Active Projects</span>
            <p className="font-display text-2xl font-bold text-white mt-1 tabular-nums">{projects.length}</p>
            <span className="text-[11px] text-zinc-400">Across org shard</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-orange-500/10 border border-orange-500/20 grid place-items-center text-orange-400">
            <FolderKanban size={18} />
          </div>
        </RevealInView>

        <RevealInView delay={0.04} className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-zinc-500">Task Velocity</span>
            <p className="font-display text-2xl font-bold text-white mt-1 tabular-nums">{doneTasks}/{totalTasks}</p>
            <span className="text-[11px] text-emerald-400">{completionPct}% completed</span>
          </div>
          <AnimatedRing percent={completionPct} size={48} strokeWidth={5} />
        </RevealInView>

        <RevealInView delay={0.08} className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-zinc-500">SLA Risk Radar</span>
            <p className="font-display text-2xl font-bold text-orange-400 mt-1 tabular-nums">{slaAlerts.length}</p>
            <span className="text-[11px] text-zinc-400">Due &lt;48h / overdue</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 grid place-items-center text-amber-500">
            <AlertTriangle size={18} />
          </div>
        </RevealInView>

        <RevealInView delay={0.12} className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-zinc-500">AI Governance</span>
            <p className="font-display text-2xl font-bold text-white mt-1 tabular-nums">
              {analytics?.avgEfficiency ?? 0}%
            </p>
            <span className="text-[11px] text-zinc-400">{evidence.length} proofs indexed</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 grid place-items-center text-rose-500">
            <Sparkles size={18} />
          </div>
        </RevealInView>
      </div>

      {/* Main 2-Column Asymmetric Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.75fr_minmax(320px,1fr)] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          {/* Widget 2: Project Capacity & Stage Progress */}
          {canViewAllProjects && (
            <RevealInView className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-base font-bold text-white">Project Capacity & Milestones</h2>
                  <p className="text-xs text-zinc-500">Segmented task completion across sites</p>
                </div>
                <Link href="/projects" className="text-xs text-orange-400 hover:underline flex items-center gap-1">
                  All Projects <ArrowRight size={12} />
                </Link>
              </div>
              {loading ? (
                <p className="py-8 text-center text-xs text-zinc-500">Loading projects…</p>
              ) : projects.length === 0 ? (
                <p className="py-8 text-center text-xs text-zinc-500">No projects created yet.</p>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {projects.slice(0, 5).map((p, idx) => {
                    const total = Math.max(p.tasksCount, 1);
                    const donePct = Math.round((p.completedTasksCount / total) * 100);
                    return (
                      <div key={p.projectId} className="grid grid-cols-1 sm:grid-cols-[180px_70px_1fr_34px] items-center gap-3 py-3 first:pt-1 last:pb-1">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{p.title}</p>
                          <p className="text-[10px] font-mono text-zinc-500">{p.stagesCount} stages</p>
                        </div>
                        <span className="font-display text-lg font-bold text-white tabular-nums">{p.tasksCount} tasks</span>
                        <div className="flex h-8 gap-1.5">
                          {p.completedTasksCount > 0 && (
                            <motion.div
                              initial={{ scaleX: 0 }}
                              whileInView={{ scaleX: 1 }}
                              viewport={{ once: false, amount: 0.2 }}
                              transition={{ duration: 0.85, delay: idx * 0.05, ease: MARLO_EASE }}
                              style={{ width: `${Math.max(18, donePct)}%`, transformOrigin: 'left' }}
                              className="flex items-center justify-end rounded-full bg-zinc-900 px-3 text-xs font-bold text-white tabular-nums"
                            >
                              {p.completedTasksCount}
                            </motion.div>
                          )}
                          <div className="flex flex-1 items-center justify-end rounded-full bg-[#242429] px-3 text-xs font-semibold text-zinc-400 tabular-nums">
                            {p.tasksCount - p.completedTasksCount}
                          </div>
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

          {/* Widget 3: Recent Field Evidence & Voice-to-Text Feed */}
          <RevealInView delay={0.05} className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                <Mic size={16} className="text-orange-400" />
                Recent Evidence & Voice Transcripts
              </h2>
              <Link href="/evidence" className="text-xs text-orange-400 hover:underline flex items-center gap-1">
                Media Directory <ArrowRight size={12} />
              </Link>
            </div>
            {evidence.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-500">No field media uploaded yet.</p>
            ) : (
              <div className="space-y-2.5">
                {evidence.slice(0, 4).map((ev) => (
                  <div key={ev.fileId} className="rounded-2xl border border-white/[0.05] bg-[#18181c] p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white truncate">{ev.taskTitle || ev.projectTitle}</span>
                      <span className="font-mono text-[10px] text-orange-400">{ev.mimeType}</span>
                    </div>
                    {ev.audioTranscript && (
                      <p className="text-[11px] italic text-zinc-400 line-clamp-2">&ldquo;{ev.audioTranscript}&rdquo;</p>
                    )}
                    {ev.identifiedLanguages?.length > 0 && (
                      <div className="flex gap-1 pt-0.5">
                        {ev.identifiedLanguages.map((l: string) => (
                          <span key={l} className="rounded-full bg-sky-500/15 px-2 py-0.5 font-mono text-[9px] text-sky-400">
                            {l}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </RevealInView>

          {/* Widget 4: Pipeline Pulse */}
          <RevealInView delay={0.08} className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                <Activity size={16} className="text-orange-400" />
                Pipeline Velocity
              </h2>
              <span className="font-mono text-xs text-zinc-400 tabular-nums">{totalTasks} tasks</span>
            </div>
            <div className="grid grid-cols-3 gap-4 h-32 items-end pt-2">
              {statusGroups.map((bar, i) => (
                <div key={bar.label} className="flex flex-col items-center h-full justify-end gap-1.5">
                  <span className="font-mono text-xs font-bold text-white tabular-nums">{bar.count}</span>
                  <div className="w-full max-w-[56px] flex-1 flex items-end rounded-xl bg-[#1a1a1f] p-1">
                    <motion.div
                      initial={{ scaleY: 0 }}
                      whileInView={{ scaleY: Math.max(0.08, bar.count / maxBar) }}
                      viewport={{ once: false, amount: 0.2 }}
                      transition={{ duration: 0.85, delay: i * 0.06, ease: MARLO_EASE }}
                      style={{ transformOrigin: 'bottom' }}
                      className={`w-full h-full rounded-lg ${bar.tone}`}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-zinc-500">{bar.label}</span>
                </div>
              ))}
            </div>
          </RevealInView>
        </div>

        {/* Right Column */}
        <div className="space-y-4 min-w-0">
          {/* Widget 5: SLA & Deadline Radar */}
          <RevealInView delay={0.08} className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                <Clock size={15} className="text-orange-400" />
                SLA & Deadline Radar
              </h2>
              <Link href="/calendar" className="text-xs text-orange-400 hover:underline">
                Schedule
              </Link>
            </div>
            {slaAlerts.length === 0 ? (
              <p className="py-4 text-center text-xs text-zinc-500">All tasks are on schedule.</p>
            ) : (
              <div className="space-y-2">
                {slaAlerts.slice(0, 4).map((t) => (
                  <button
                    key={t.taskId}
                    onClick={() => openTaskDrawer(t.taskId, t.projectId)}
                    className="w-full text-left flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs hover:border-orange-500/40 cursor-pointer"
                  >
                    <span className="font-semibold text-white truncate">{t.title}</span>
                    <span className="font-mono text-[10px] text-amber-500 shrink-0 ml-2">{t.deadline.slice(0, 10)}</span>
                  </button>
                ))}
              </div>
            )}
          </RevealInView>

          {/* Widget 6: Verification / Field Queue */}
          <RevealInView delay={0.12} className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                {canVerify ? <ShieldCheck size={15} className="text-orange-400" /> : <CheckSquare size={15} className="text-orange-400" />}
                {myTasks.length > 0 ? 'My Field Queue' : 'Up Next'}
              </h2>
              <Link href="/tasks" className="text-xs text-orange-400 hover:underline">
                View All
              </Link>
            </div>
            {(myTasks.length > 0 ? myTasks : tasks).length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-500">No tasks queued yet.</p>
            ) : (
              <div className="space-y-2">
                {(myTasks.length > 0 ? myTasks : tasks).slice(0, 5).map((t) => (
                  <button
                    key={t.taskId}
                    onClick={() => openTaskDrawer(t.taskId, t.projectId)}
                    className="w-full text-left flex items-center justify-between gap-2 rounded-2xl border border-white/[0.05] bg-[#18181c] p-3 hover:border-orange-500/35 cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white group-hover:text-orange-400 truncate">{t.title}</p>
                      <p className="text-[10px] font-mono text-zinc-500 truncate">{t.projectTitle}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-mono text-orange-400">
                      {t.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </RevealInView>

          {/* Widget 7: Live Activity Stream */}
          <RevealInView delay={0.16} className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-bold text-white">Live Activity</h2>
              <Link href="/activity" className="text-xs text-orange-400 hover:underline">
                Full Log
              </Link>
            </div>
            {activity.length === 0 ? (
              <p className="py-4 text-center text-xs text-zinc-500">No transitions logged yet.</p>
            ) : (
              <div className="space-y-2">
                {activity.slice(0, 4).map((a) => (
                  <div key={a.transition_id} className="flex items-center justify-between text-[11px] border-b border-white/[0.05] pb-2 last:border-0 last:pb-0">
                    <span className="text-zinc-300 truncate">
                      <strong>{a.entity_id}</strong> → <span className="font-mono text-orange-400">{a.to_status}</span>
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500 shrink-0 ml-2">
                      {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
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
