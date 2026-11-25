'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Clock,
  User,
  Zap,
  Link2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Layers,
} from 'lucide-react';
import { useAdminAuth, getStoredAdminToken } from '../../../../layout';
import { apiRequest } from '../../../../../../services/nexoraClient';
import {
  OrgDetail,
  Card,
  StatusBadge,
  Spinner,
  EmptyState,
  TASK_STATUSES,
  PROJECT_STATUSES,
  STAGE_STATUSES,
} from '../../../../../../components/admin/shared';

type Project = OrgDetail['projects'][number];
type Stage = Project['stages'][number];
type Task = Stage['tasks'][number];

export default function ProjectDetailPage() {
  const params = useParams();
  const rawOrgId = params?.orgId;
  const rawProjectId = params?.projectId;
  const orgId = typeof rawOrgId === 'string' ? rawOrgId : Array.isArray(rawOrgId) ? rawOrgId[0] : '';
  const projectId = typeof rawProjectId === 'string' ? rawProjectId : Array.isArray(rawProjectId) ? rawProjectId[0] : '';

  const { token: authContextToken } = useAdminAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [orgDetail, setOrgDetail] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openStages, setOpenStages] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!orgId || !projectId) return;
    const token = authContextToken || getStoredAdminToken();
    if (!token) return;

    setLoading(true);
    setError('');
    try {
      const detail = await apiRequest<OrgDetail>(`/api/v1/superadmin/organizations/${orgId}`, {}, token);
      setOrgDetail(detail);
      const proj = detail.projects.find((p) => p.projectId === projectId) ?? null;
      setProject(proj);
      if (proj) {
        setOpenStages(new Set(proj.stages.map((s) => s.stageId)));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId, authContextToken]);

  useEffect(() => {
    void load();
  }, [load]);

  function notify(kind: 'ok' | 'err', text: string) {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 3000);
  }

  function toggleStage(stageId: string) {
    setOpenStages((prev) => {
      const next = new Set(prev);
      next.has(stageId) ? next.delete(stageId) : next.add(stageId);
      return next;
    });
  }

  async function updateTaskStatus(taskId: string, status: string) {
    const token = authContextToken || getStoredAdminToken();
    try {
      await apiRequest(
        `/api/v1/superadmin/organizations/${orgId}/tasks/${taskId}`,
        { method: 'PATCH', body: JSON.stringify({ status }) },
        token,
      );
      notify('ok', 'Task status updated');
      await load();
    } catch (err) {
      notify('err', (err as Error).message);
    }
  }

  async function updateStageStatus(stageId: string, status: string) {
    const token = authContextToken || getStoredAdminToken();
    try {
      await apiRequest(
        `/api/v1/superadmin/organizations/${orgId}/stages/${stageId}/status`,
        { method: 'PATCH', body: JSON.stringify({ status }) },
        token,
      );
      notify('ok', 'Stage status updated');
      await load();
    } catch (err) {
      notify('err', (err as Error).message);
    }
  }

  async function updateProjectStatus(status: string) {
    if (!project) return;
    const token = authContextToken || getStoredAdminToken();
    try {
      await apiRequest(
        `/api/v1/superadmin/organizations/${orgId}/projects/${projectId}/status`,
        { method: 'PATCH', body: JSON.stringify({ status }) },
        token,
      );
      notify('ok', 'Project status updated');
      await load();
    } catch (err) {
      notify('err', (err as Error).message);
    }
  }

  function resolveUser(userId: string | null): string {
    if (!userId) return '—';
    const member = orgDetail?.members.find((m) => m.userId === userId);
    if (member) return member.fullName ?? member.email ?? userId;
    const collab = project?.collaborators.find((c) => c.userId === userId);
    if (collab) return collab.fullName ?? userId;
    return userId;
  }

  const totalTasks = project?.stages.reduce((a, s) => a + s.tasks.length, 0) ?? 0;
  const doneTasks = project?.stages.reduce(
    (a, s) => a + s.tasks.filter((t) => ['COMPLETED', 'VERIFIED'].includes(t.status)).length,
    0,
  ) ?? 0;
  const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur-md
              ${toast.kind === 'ok'
                ? 'border-orange-500/40 bg-orange-950/80 text-orange-200'
                : 'border-red-500/40 bg-red-950/80 text-red-200'
              }`}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size={28} />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-300">
          {error} —{' '}
          <button onClick={() => void load()} className="underline cursor-pointer hover:text-red-200">
            retry
          </button>
        </div>
      ) : !project ? (
        <EmptyState message="Project not found." />
      ) : (
        <>
          {/* Back button */}
          <Link
            href={`/admin/organizations/${orgId}`}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-orange-400 transition-colors cursor-pointer mb-1"
          >
            <ArrowLeft size={13} /> Back to Organization
          </Link>

          {/* Project summary card */}
          <Card className="p-6">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5 mb-1">
                  <h1 className="font-display text-xl font-bold tracking-tight text-white">{project.title}</h1>
                  <StatusBadge status={project.status} />
                </div>
                {project.description && (
                  <p className="text-sm text-zinc-400 mt-1">{project.description}</p>
                )}
                <p className="font-mono text-[11px] text-zinc-500 mt-1">{project.projectId}</p>
              </div>

              {/* Progress gauge */}
              <div className="flex items-center gap-4 bg-[#18181b] border border-white/[0.04] px-4 py-3 rounded-2xl">
                <div className="relative flex h-14 w-14 items-center justify-center">
                  <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15" fill="none"
                      stroke="#f97316" strokeWidth="3"
                      strokeDasharray={`${completionPct * 0.942} 94.2`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="font-display text-xs font-bold text-orange-400">{completionPct}%</span>
                </div>
                <div className="text-xs">
                  <p className="text-zinc-200 font-semibold">{doneTasks} of {totalTasks}</p>
                  <p className="text-zinc-500">tasks finished</p>
                </div>
              </div>

              {/* Status override */}
              <div className="flex gap-2 items-start">
                <select
                  aria-label="Override project status"
                  value={project.status}
                  onChange={(e) => void updateProjectStatus(e.target.value)}
                  className="rounded-xl border border-white/[0.08] bg-[#18181b] px-3 py-2 text-xs font-mono text-zinc-300 outline-none focus:border-orange-500/50 cursor-pointer"
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  onClick={() => void load()}
                  className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-zinc-400 hover:text-orange-300 hover:border-orange-500/30 transition-all cursor-pointer"
                >
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>
          </Card>

          {/* Cross-org collaborators */}
          {project.collaborators.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3.5">
                <Link2 size={15} className="text-rose-400" />
                <h2 className="font-display text-sm font-semibold text-white">
                  Partner Organization Collaborators
                </h2>
                <span className="ml-auto font-mono text-xs text-zinc-500">{project.collaborators.length} active</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {project.collaborators.map((c) => (
                  <div
                    key={`${c.userId}-${c.partnerOrgId}`}
                    className="flex items-center gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/20 text-[10px] font-bold text-rose-300">
                      {(c.fullName ?? c.userId)[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-zinc-200">{c.fullName || c.userId}</p>
                      <p className="text-[10px] font-mono text-rose-300/80">{c.roleName} · {c.partnerOrgId}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Stages & tasks */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Layers size={15} className="text-orange-400" />
              <h2 className="font-display text-sm font-semibold text-white">
                Execution Milestones & Field Tasks
              </h2>
              <span className="font-mono text-xs text-zinc-500">({project.stages.length} stages)</span>
            </div>

            {project.stages.length === 0 ? (
              <EmptyState message="No stages defined for this project." />
            ) : (
              [...project.stages]
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((stage, si) => (
                  <StageAccordion
                    key={stage.stageId}
                    stage={stage}
                    index={si}
                    open={openStages.has(stage.stageId)}
                    onToggle={() => toggleStage(stage.stageId)}
                    onStageStatusChange={(s) => void updateStageStatus(stage.stageId, s)}
                    onTaskStatusChange={updateTaskStatus}
                    resolveUser={resolveUser}
                  />
                ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Stage Accordion ─────────────────────────────────────────────────────────
function StageAccordion({
  stage,
  index,
  open,
  onToggle,
  onStageStatusChange,
  onTaskStatusChange,
  resolveUser,
}: {
  stage: Stage;
  index: number;
  open: boolean;
  onToggle: () => void;
  onStageStatusChange: (s: string) => void;
  onTaskStatusChange: (taskId: string, s: string) => Promise<void>;
  resolveUser: (id: string | null) => string;
}) {
  const doneTasks = stage.tasks.filter((t) => ['COMPLETED', 'VERIFIED'].includes(t.status)).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card>
        {/* Stage bar */}
        <button
          onClick={onToggle}
          className="flex w-full items-center gap-4 px-5 py-4 text-left cursor-pointer hover:bg-white/[0.02] transition-colors rounded-t-2xl"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10 font-mono text-xs font-bold text-orange-400">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-display text-sm font-semibold text-white">{stage.name}</span>
            <span className="ml-3 text-xs text-zinc-500">{doneTasks}/{stage.tasks.length} tasks completed</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {stage.deadline && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-zinc-500">
                <Clock size={11} />
                {new Date(stage.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </span>
            )}
            <StatusBadge status={stage.status} />
            <select
              aria-label={`Stage status ${stage.stageId}`}
              value={stage.status}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => { e.stopPropagation(); onStageStatusChange(e.target.value); }}
              className="rounded-lg border border-white/[0.08] bg-[#18181b] px-2 py-1 text-[11px] font-mono text-zinc-300 outline-none cursor-pointer"
            >
              {STAGE_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {open ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronRight size={14} className="text-zinc-500" />}
          </div>
        </button>

        {/* Task listings */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="tasks"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {stage.tasks.length === 0 ? (
                <div className="border-t border-white/[0.05] px-5 py-4">
                  <EmptyState message="No tasks assigned in this milestone stage." />
                </div>
              ) : (
                <div className="border-t border-white/[0.05]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.05] text-[11px] text-zinc-500 uppercase tracking-wider">
                        <th className="px-5 py-3 text-left">Task</th>
                        <th className="px-5 py-3 text-left hidden sm:table-cell">Type</th>
                        <th className="px-5 py-3 text-left">Assignee</th>
                        <th className="px-5 py-3 text-left hidden md:table-cell">Deadline</th>
                        <th className="px-5 py-3 text-left hidden lg:table-cell">AI Efficiency</th>
                        <th className="px-5 py-3 text-left">Status</th>
                        <th className="px-5 py-3 text-left">Override</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {stage.tasks.map((task) => (
                        <TaskRow
                          key={task.taskId}
                          task={task}
                          assigneeName={resolveUser(task.assignedUserId)}
                          onStatusChange={(s) => void onTaskStatusChange(task.taskId, s)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────
function TaskRow({
  task,
  assigneeName,
  onStatusChange,
}: {
  task: Task;
  assigneeName: string;
  onStatusChange: (s: string) => void;
}) {
  return (
    <tr className="hover:bg-white/[0.02] transition-colors">
      <td className="px-5 py-3">
        <p className="font-medium text-zinc-200">{task.title}</p>
        <p className="font-mono text-[10px] text-zinc-500">{task.taskId}</p>
      </td>
      <td className="px-5 py-3 hidden sm:table-cell">
        <span className="rounded-md bg-[#18181b] border border-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-zinc-400">
          {task.taskType}
        </span>
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-1.5">
          <User size={11} className="text-zinc-500 shrink-0" />
          <span className="text-zinc-300 truncate max-w-[110px]">{assigneeName}</span>
        </div>
      </td>
      <td className="px-5 py-3 hidden md:table-cell text-zinc-400 font-mono text-[11px]">
        {task.deadline
          ? new Date(task.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
          : '—'}
      </td>
      <td className="px-5 py-3 hidden lg:table-cell">
        {task.efficiencyScore !== null ? (
          <span className="flex items-center gap-1 text-orange-400 font-mono text-[11px] font-semibold">
            <Zap size={11} />
            {task.efficiencyScore}%
          </span>
        ) : (
          <span className="text-zinc-600">—</span>
        )}
      </td>
      <td className="px-5 py-3">
        <StatusBadge status={task.status} />
      </td>
      <td className="px-5 py-3">
        <select
          aria-label={`Task status ${task.taskId}`}
          value={task.status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="rounded-lg border border-white/[0.08] bg-[#18181b] px-2 py-1 text-[11px] font-mono text-zinc-300 outline-none focus:border-orange-500/50 cursor-pointer"
        >
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </td>
    </tr>
  );
}
