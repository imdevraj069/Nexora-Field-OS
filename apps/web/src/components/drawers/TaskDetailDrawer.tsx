'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  UploadCloud,
  Plus,
  ExternalLink,
  Layers,
  User,
  Mic,
  Video,
  Image as ImageIcon,
  FileCheck,
} from 'lucide-react';
import { useDrawerStore } from '@/stores/useDrawerStore';
import { useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';
import { apiRequest } from '@/services/nexoraClient';
import { MARLO_EASE } from '@/components/ui/motion';

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  required?: boolean;
}

interface TaskDetailData {
  taskId: string;
  projectId: string;
  stageId: string;
  stageName?: string;
  projectTitle?: string;
  title: string;
  description?: string;
  taskType: string;
  status: string;
  assignedUserId?: string | null;
  deadline?: string | null;
  checklist: ChecklistItem[];
  fileRequirements?: Array<{ id: string; label: string; fileType: string; required?: boolean }>;
}

const STATUS_FLOW = ['TODO', 'IN_TRANSIT', 'ON_FIELD', 'SUBMITTED', 'COMPLETED', 'VERIFIED'];

export function TaskDetailDrawer() {
  const { isOpen, taskId, projectId, closeTaskDrawer, notifyDataChanged } = useDrawerStore();
  const { token } = useWorkspaceAuth();

  const [task, setTask] = useState<TaskDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newCheckLabel, setNewCheckLabel] = useState('');
  const [textNote, setTextNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [evidenceNotice, setEvidenceNotice] = useState('');

  useEffect(() => {
    if (!isOpen || !taskId || !token) return;
    let active = true;
    setLoading(true);
    setError('');
    setEvidenceNotice('');

    apiRequest<{ task: TaskDetailData }>(`/api/v1/tasks/${taskId}`, {}, token)
      .then((res) => {
        if (active) setTask(res.task);
      })
      .catch((err) => {
        if (active) setError((err as Error).message || 'Failed to load task');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, taskId, token]);

  async function toggleCheck(idx: number) {
    if (!task || !token) return;
    const updated = task.checklist.map((c, i) => (i === idx ? { ...c, completed: !c.completed } : c));
    setTask({ ...task, checklist: updated });
    setError('');
    try {
      await apiRequest(
        `/api/v1/projects/${task.projectId}/tasks/${task.taskId}/checklist`,
        { method: 'PATCH', body: JSON.stringify({ checklist: updated }) },
        token
      );
      notifyDataChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function addCheckItem(e: React.FormEvent) {
    e.preventDefault();
    if (!task || !token || !newCheckLabel.trim()) return;
    const updated: ChecklistItem[] = [
      ...task.checklist,
      { id: `chk-${Date.now()}`, label: newCheckLabel.trim(), completed: false, required: true },
    ];
    setTask({ ...task, checklist: updated });
    setNewCheckLabel('');
    try {
      await apiRequest(
        `/api/v1/projects/${task.projectId}/tasks/${task.taskId}/checklist`,
        { method: 'PATCH', body: JSON.stringify({ checklist: updated }) },
        token
      );
      notifyDataChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function changeStatus(nextStatus: string) {
    if (!task || !token) return;
    setError('');
    if (['SUBMITTED', 'COMPLETED', 'VERIFIED'].includes(nextStatus)) {
      const pending = task.checklist.filter((c) => !c.completed);
      if (pending.length > 0) {
        setError(`Verify all ${pending.length} checklist item(s) before marking ${nextStatus}.`);
        return;
      }
    }
    try {
      await apiRequest(
        `/api/v1/projects/${task.projectId}/tasks/${task.taskId}/status`,
        { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) },
        token
      );
      setTask({ ...task, status: nextStatus });
      notifyDataChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function submitEvidence(e: React.FormEvent) {
    e.preventDefault();
    if (!task || !token) return;
    if (!selectedFile && !textNote.trim()) {
      setError('Select a photo/video/audio file or add a field observation note.');
      return;
    }
    setUploading(true);
    setError('');
    setEvidenceNotice('');
    try {
      const fd = new FormData();
      if (selectedFile) fd.append('file', selectedFile);
      fd.append('textNote', textNote);

      const resp = await fetch(`/api/v1/projects/${task.projectId}/tasks/${task.taskId}/evidence`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j.error || 'Upload failed');
      }
      setEvidenceNotice('Evidence uploaded to MinIO & queued for Gemini 2.5 mixed-language AI analysis.');
      setSelectedFile(null);
      setTextNote('');
      notifyDataChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const doneChecks = task?.checklist.filter((c) => c.completed).length ?? 0;
  const totalChecks = task?.checklist.length ?? 0;
  const checkPct = totalChecks > 0 ? Math.round((doneChecks / totalChecks) * 100) : 100;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeTaskDrawer}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          <motion.aside
            initial={{ x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 48, opacity: 0 }}
            transition={{ duration: 0.32, ease: MARLO_EASE }}
            className="fixed top-2.5 right-2.5 bottom-2.5 z-50 flex w-[min(490px,calc(100vw-20px))] flex-col rounded-[26px] border border-white/[0.08] bg-[#141417] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-6 py-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                  <span>{task?.taskId || taskId}</span>
                  {task?.stageName && (
                    <>
                      <span>·</span>
                      <span className="truncate text-orange-400">{task.stageName}</span>
                    </>
                  )}
                </div>
                <h2 className="font-display text-lg font-bold text-white mt-1 leading-snug">
                  {loading ? 'Loading task…' : task?.title || 'Task Details'}
                </h2>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {task && (
                  <Link
                    href={`/tasks/${task.taskId}?projectId=${task.projectId}`}
                    onClick={closeTaskDrawer}
                    className="rounded-xl border border-white/[0.08] bg-[#1b1b1f] p-2 text-zinc-400 hover:text-white transition-colors"
                    title="Open Full Execution View"
                  >
                    <ExternalLink size={15} />
                  </Link>
                )}
                <button
                  onClick={closeTaskDrawer}
                  className="rounded-xl border border-white/[0.08] bg-[#1b1b1f] p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {task && (
                <>
                  {/* Meta Row */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-2xl border border-white/[0.06] bg-[#1a1a1f] p-3">
                      <span className="text-[10px] font-mono uppercase text-zinc-500 block">Project</span>
                      <Link
                        href={`/projects/${task.projectId}`}
                        onClick={closeTaskDrawer}
                        className="mt-1 flex items-center gap-1.5 font-semibold text-zinc-200 hover:text-orange-400 truncate"
                      >
                        <Layers size={12} className="text-orange-400 shrink-0" />
                        <span className="truncate">{task.projectTitle || task.projectId}</span>
                      </Link>
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-[#1a1a1f] p-3">
                      <span className="text-[10px] font-mono uppercase text-zinc-500 block">Deadline & Assignee</span>
                      <div className="mt-1 flex items-center gap-2 text-zinc-300 font-mono text-[11px] truncate">
                        <Clock size={12} className="text-zinc-500 shrink-0" />
                        <span>{task.deadline ? task.deadline.slice(0, 10) : 'Flexible'}</span>
                        <span>·</span>
                        <User size={12} className="text-zinc-500 shrink-0" />
                        <span className="truncate">{task.assignedUserId || 'Pool'}</span>
                      </div>
                    </div>
                  </div>

                  {task.description && (
                    <p className="text-xs text-zinc-400 leading-relaxed bg-[#1a1a1f]/60 p-3.5 rounded-2xl border border-white/[0.05]">
                      {task.description}
                    </p>
                  )}

                  {/* Status Stepper Pills */}
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 block mb-2">
                      Workflow Status
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_FLOW.map((st) => {
                        const active = task.status === st;
                        return (
                          <button
                            key={st}
                            onClick={() => void changeStatus(st)}
                            className={`rounded-full px-3 py-1 text-[11px] font-mono font-semibold transition-all cursor-pointer border ${
                              active
                                ? 'border-orange-500 bg-orange-500/20 text-orange-300 shadow-sm'
                                : 'border-white/[0.06] bg-[#1b1b1f] text-zinc-400 hover:text-white hover:border-white/[0.18]'
                            }`}
                          >
                            {st}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Interactive Checklist */}
                  <div className="rounded-2xl border border-white/[0.06] bg-[#18181c] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                        <FileCheck size={14} className="text-orange-400" />
                        Task Checklist
                      </span>
                      <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                        {doneChecks}/{totalChecks} ({checkPct}%)
                      </span>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${checkPct}%` }}
                        transition={{ duration: 0.4, ease: MARLO_EASE }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      {task.checklist.length === 0 ? (
                        <p className="text-[11px] text-zinc-500 py-1">No checklist items yet. Add one below.</p>
                      ) : (
                        task.checklist.map((item, idx) => (
                          <label
                            key={item.id}
                            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-xs cursor-pointer transition-colors ${
                              item.completed
                                ? 'border-emerald-500/25 bg-emerald-500/5 text-zinc-400 line-through'
                                : 'border-white/[0.06] bg-[#1f1f24] text-zinc-200 hover:border-white/[0.15]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => void toggleCheck(idx)}
                              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-orange-500 cursor-pointer"
                            />
                            <span className="flex-1">{item.label}</span>
                          </label>
                        ))
                      )}
                    </div>

                    <form onSubmit={addCheckItem} className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={newCheckLabel}
                        onChange={(e) => setNewCheckLabel(e.target.value)}
                        placeholder="Add verification step…"
                        className="flex-1 rounded-xl border border-white/[0.08] bg-[#121215] px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="flex items-center gap-1 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer"
                      >
                        <Plus size={12} /> Add
                      </button>
                    </form>
                  </div>

                  {/* Multimodal Evidence Upload */}
                  <form onSubmit={submitEvidence} className="rounded-2xl border border-white/[0.06] bg-[#18181c] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                        <UploadCloud size={14} className="text-orange-400" />
                        Field Proof & Voice Note
                      </span>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                        <span className="flex items-center gap-1"><ImageIcon size={11} /> Img</span>
                        <span className="flex items-center gap-1"><Video size={11} /> Vid</span>
                        <span className="flex items-center gap-1"><Mic size={11} /> Voice</span>
                      </div>
                    </div>

                    {evidenceNotice && (
                      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-[11px] text-emerald-300">
                        <CheckCircle2 size={14} className="shrink-0" />
                        <span>{evidenceNotice}</span>
                      </div>
                    )}

                    <input
                      type="file"
                      accept="image/*,video/*,audio/*,.pdf"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="w-full text-[11px] text-zinc-400 file:mr-2.5 file:rounded-lg file:border-0 file:bg-orange-500/15 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-orange-400 hover:file:bg-orange-500/25 cursor-pointer"
                    />

                    <textarea
                      rows={2}
                      value={textNote}
                      onChange={(e) => setTextNote(e.target.value)}
                      placeholder="Add technician observation or voice note context (English / Hindi / Hinglish)…"
                      className="w-full rounded-xl border border-white/[0.08] bg-[#121215] p-2.5 text-xs text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
                    />

                    <button
                      type="submit"
                      disabled={uploading}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 py-2 text-xs font-semibold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <UploadCloud size={14} />
                      {uploading ? 'Uploading & Queuing AI…' : 'Submit Field Proof'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
