'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckSquare,
  Search,
  LayoutGrid,
  List,
  UserCheck,
  Clock,
  FileCheck,
} from 'lucide-react';
import { useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';
import { useDrawerStore } from '@/stores/useDrawerStore';
import { apiRequest } from '@/services/nexoraClient';
import { RevealInView, MARLO_BACK_SPRING } from '@/components/ui/motion';

interface TaskItem {
  taskId: string;
  projectId: string;
  stageId: string;
  projectTitle?: string;
  stageName?: string;
  title: string;
  taskType: string;
  status: string;
  assignedUserId?: string | null;
  deadline?: string | null;
  checklist?: Array<{ completed: boolean }>;
}

const LANES = [
  { id: 'TODO', label: 'Up Next', accent: 'bg-zinc-500' },
  { id: 'IN_TRANSIT', label: 'In Transit', accent: 'bg-amber-500' },
  { id: 'ON_FIELD', label: 'On Field', accent: 'bg-orange-500' },
  { id: 'COMPLETED', label: 'Done / Verified', accent: 'bg-emerald-500' },
];

export default function TasksDirectoryPage() {
  const { activeOrg, token } = useWorkspaceAuth();
  const { openTaskDrawer, refreshTick, notifyDataChanged } = useDrawerStore();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'mine'>('board');
  const [search, setSearch] = useState('');
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [overLane, setOverLane] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [boardError, setBoardError] = useState('');

  async function loadTasks() {
    if (!token || !activeOrg) return;
    setLoading(true);
    try {
      const endpoint = viewMode === 'mine' ? '/api/v1/tasks/my-assigned' : '/api/v1/tasks';
      const res = await apiRequest<{ tasks: TaskItem[] }>(endpoint, {}, token);
      setTasks(res.tasks || []);
    } catch (e) {
      console.error('Failed to load tasks:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTasks();
  }, [token, activeOrg, viewMode, refreshTick]);

  async function handleDropOnLane(targetStatus: string) {
    setOverLane(null);
    if (!dragTaskId || !token) return;
    const task = tasks.find((t) => t.taskId === dragTaskId);
    setDragTaskId(null);
    if (!task || task.status === targetStatus) return;

    setBoardError('');
    if (targetStatus === 'COMPLETED') {
      const pending = (task.checklist || []).filter((c) => !c.completed);
      if (pending.length > 0) {
        setBoardError(`"${task.title}" has ${pending.length} unverified checklist item(s). Open the task drawer to verify them first.`);
        return;
      }
    }

    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.taskId === task.taskId ? { ...t, status: targetStatus } : t)));
    try {
      await apiRequest(
        `/api/v1/projects/${task.projectId}/tasks/${task.taskId}/status`,
        { method: 'PATCH', body: JSON.stringify({ status: targetStatus }) },
        token
      );
      notifyDataChanged();
    } catch (err) {
      setBoardError((err as Error).message);
      void loadTasks();
    }
  }

  const filtered = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.taskId.toLowerCase().includes(search.toLowerCase()) ||
      (t.projectTitle || '').toLowerCase().includes(search.toLowerCase())
  );

  function mapToLane(status: string) {
    if (status === 'VERIFIED' || status === 'SUBMITTED') return 'COMPLETED';
    if (LANES.some((l) => l.id === status)) return status;
    return 'TODO';
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">Tasks</h1>
          <p className="mt-0.5 text-xs text-zinc-400">
            Drag cards across stages or click any task to open its checklist & proof drawer
          </p>
        </div>

        {/* Marlo 3-Mode Switcher */}
        <div className="flex rounded-full border border-white/[0.07] bg-[#121215] p-1">
          {[
            { id: 'board', label: 'Board', Icon: LayoutGrid },
            { id: 'list', label: 'List', Icon: List },
            { id: 'mine', label: 'My Tasks', Icon: UserCheck },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setViewMode(id as 'board' | 'list' | 'mine')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                viewMode === id ? 'bg-orange-500/20 text-orange-300' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-sm">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter tasks by title, project, or ID…"
          className="w-full rounded-full border border-white/[0.08] bg-[#121215] py-2 pl-9 pr-4 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500/60"
        />
      </div>

      {boardError && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
          {boardError}
        </div>
      )}

      {loading ? (
        <div className="rounded-[22px] border border-white/[0.06] bg-[#121215] py-16 text-center text-xs text-zinc-500">
          Loading tasks…
        </div>
      ) : viewMode === 'board' ? (
        /* Marlo 4-Column Kanban Board (.board) */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {LANES.map((lane) => {
            const laneTasks = filtered.filter((t) => mapToLane(t.status) === lane.id);
            const isOver = overLane === lane.id;
            return (
              <div
                key={lane.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverLane(lane.id);
                }}
                onDragLeave={() => setOverLane(null)}
                onDrop={() => void handleDropOnLane(lane.id)}
                className={`rounded-[22px] border p-3 transition-colors min-h-[260px] ${
                  isOver
                    ? 'border-orange-500 bg-orange-500/[0.07]'
                    : 'border-white/[0.06] bg-[#141418]'
                }`}
              >
                <div className="flex items-center justify-between px-1.5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${lane.accent}`} />
                    <span className="font-display text-sm font-bold text-white">{lane.label}</span>
                  </div>
                  <span className="rounded-full bg-[#1e1e24] px-2 py-0.5 font-mono text-[11px] text-zinc-400 tabular-nums">
                    {laneTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {laneTasks.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/[0.07] py-10 text-center text-xs text-zinc-500">
                      Drop task here
                    </div>
                  ) : (
                    laneTasks.map((t) => {
                      const chkDone = (t.checklist || []).filter((c) => c.completed).length;
                      const chkTotal = (t.checklist || []).length;
                      return (
                        <motion.div
                          key={t.taskId}
                          layout
                          transition={MARLO_BACK_SPRING}
                          draggable
                          onDragStart={() => setDragTaskId(t.taskId)}
                          onClick={() => openTaskDrawer(t.taskId, t.projectId)}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          className="relative rounded-2xl border border-white/[0.06] bg-[#1a1a20] p-3.5 pl-4 shadow-md hover:border-orange-500/40 cursor-grab active:cursor-grabbing group"
                        >
                          {/* Marlo left accent bar (.tcard:before) */}
                          <span className={`absolute left-0 top-3.5 bottom-3.5 w-[3px] rounded-r ${lane.accent}`} />

                          <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-zinc-500">
                            <span className="truncate">{t.projectTitle || t.projectId}</span>
                            <span>{t.taskId}</span>
                          </div>

                          <h3 className="mt-1 text-xs font-semibold text-zinc-100 group-hover:text-orange-300 transition-colors leading-snug">
                            {t.title}
                          </h3>

                          <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                            {chkTotal > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#24242b] px-2 py-0.5 text-orange-300">
                                <FileCheck size={10} /> {chkDone}/{chkTotal}
                              </span>
                            ) : (
                              <span className="text-zinc-500">{t.taskType}</span>
                            )}
                            {t.deadline && (
                              <span className="inline-flex items-center gap-1">
                                <Clock size={10} /> {t.deadline.slice(0, 10)}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List / My Tasks Table */
        <RevealInView className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 overflow-hidden shadow-xl">
          <div className="divide-y divide-white/[0.05]">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-xs text-zinc-500">No tasks match your filter.</div>
            ) : (
              filtered.map((task) => {
                const chkDone = (task.checklist || []).filter((c) => c.completed).length;
                const chkTotal = (task.checklist || []).length;
                return (
                  <button
                    key={task.taskId}
                    onClick={() => openTaskDrawer(task.taskId, task.projectId)}
                    className="w-full text-left flex items-center justify-between gap-4 p-4 hover:bg-white/[0.02] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                        <CheckSquare size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white group-hover:text-orange-300 truncate">
                          {task.title}
                        </p>
                        <p className="text-[11px] font-mono text-zinc-500 truncate">
                          {task.projectTitle} · {task.stageName} · {task.taskId}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {chkTotal > 0 && (
                        <span className="hidden sm:inline-flex items-center gap-1 font-mono text-xs text-orange-300 tabular-nums">
                          <FileCheck size={12} /> {chkDone}/{chkTotal}
                        </span>
                      )}
                      <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-[11px] font-mono text-orange-300">
                        {task.status}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </RevealInView>
      )}
    </div>
  );
}
