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
  FileCheck,
  Link2,
} from 'lucide-react';
import { useDrawerStore } from '@/stores/useDrawerStore';
import { useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';
import { WorkflowStatusDef, DEFAULT_STATUSES } from '@/stores/useAuthStore';
import { apiRequest } from '@/services/nexoraClient';
import { MARLO_EASE } from '@/components/ui/motion';
import { VoiceRecorderInput } from '@/components/ui/VoiceRecorderInput';

type ChecklistKind =
  | 'CHECK'
  | 'FILL_BLANK'
  | 'NUMBER'
  | 'SHORT_ANSWER'
  | 'OPTIONS'
  | 'MULTI_SELECT'
  | 'TEXT'
  | 'FILE'
  | 'MEDIA'
  | 'LINK';

interface ChecklistItem {
  id: string;
  label: string;
  kind?: ChecklistKind;
  completed: boolean;
  required?: boolean;
  value?: string;
  selectedOptions?: string[];
  options?: string[];
  unit?: string;
  placeholder?: string;
  fileId?: string;
  fileName?: string;
}

interface FileSlot {
  id: string;
  header?: string;
  label?: string;
  acceptedType?: string;
  required?: boolean;
  uploadedFiles?: Array<{ fileId: string; fileName: string; mimeType?: string }>;
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
  fileRequirements: FileSlot[];
}

export function TaskDetailDrawer() {
  const { isOpen, taskId, closeTaskDrawer, notifyDataChanged } = useDrawerStore();
  const { token, activeOrg } = useWorkspaceAuth();

  const [task, setTask] = useState<TaskDetailData | null>(null);
  const [statuses, setStatuses] = useState<WorkflowStatusDef[]>(DEFAULT_STATUSES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [newCheckLabel, setNewCheckLabel] = useState('');
  const [newCheckKind, setNewCheckKind] = useState<ChecklistKind>('CHECK');
  const [textNote, setTextNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [evidenceNotice, setEvidenceNotice] = useState('');
  const [aiInsights, setAiInsights] = useState<{
    score: { overall_efficiency: number; timeliness_score: number; evidence_completeness: number; ai_risk_flags: string[] } | null;
    analyses: Array<{ audioTranscript?: string; aiSummary?: string; identifiedLanguages?: string[]; textNote?: string; createdAt?: string }>;
  } | null>(null);

  async function fetchTaskAndStatuses() {
    if (!taskId || !token) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<{ task: TaskDetailData }>(`/api/v1/tasks/${taskId}`, {}, token);
      setTask(res.task);
      const [projRes, aiRes] = await Promise.all([
        apiRequest<{ project: { workflowStatuses?: WorkflowStatusDef[] } }>(
          `/api/v1/projects/${res.task.projectId}`,
          {},
          token
        ),
        apiRequest<{ score: any; analyses: any[] }>(
          `/api/v1/projects/${res.task.projectId}/tasks/${taskId}/ai-insights`,
          {},
          token
        ).catch(() => null),
      ]);
      if (projRes.project?.workflowStatuses?.length) {
        setStatuses(projRes.project.workflowStatuses);
      }
      if (aiRes) setAiInsights(aiRes);
    } catch (err) {
      setError((err as Error).message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen || !taskId || !token) return;
    setEvidenceNotice('');
    void fetchTaskAndStatuses();
  }, [isOpen, taskId, token]);

  async function saveChecklist(updated: ChecklistItem[]) {
    if (!task || !token) return;
    setTask({ ...task, checklist: updated });
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

  async function toggleCheck(idx: number) {
    if (!task) return;
    const target = task.checklist[idx];
    const kind = target.kind || 'CHECK';
    if (!target.completed) {
      if ((kind === 'TEXT' || kind === 'LINK') && !String(target.value || '').trim()) {
        setError(`Enter the required ${kind.toLowerCase()} value for "${target.label}" before marking complete.`);
        return;
      }
      if ((kind === 'FILE' || kind === 'MEDIA') && !target.fileId) {
        setError(`Upload the required ${kind.toLowerCase()} for "${target.label}" first.`);
        return;
      }
    }
    setError('');
    const updated = task.checklist.map((c, i) => (i === idx ? { ...c, completed: !c.completed } : c));
    await saveChecklist(updated);
  }

  function updateCheckValue(idx: number, val: string) {
    if (!task) return;
    const updated = task.checklist.map((c, i) => (i === idx ? { ...c, value: val } : c));
    setTask({ ...task, checklist: updated });
  }

  async function addCheckItem(e: React.FormEvent) {
    e.preventDefault();
    if (!task || !newCheckLabel.trim()) return;
    const updated: ChecklistItem[] = [
      ...task.checklist,
      { id: `chk-${Date.now()}`, label: newCheckLabel.trim(), kind: newCheckKind, completed: false, required: true },
    ];
    setNewCheckLabel('');
    await saveChecklist(updated);
  }

  async function changeStatus(nextStatus: string) {
    if (!task || !token) return;
    setError('');
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

  async function uploadToEndpoint(file: File | null, opts: { slotId?: string; checklistItemId?: string; note?: string }) {
    if (!task || !token) return;
    const key = opts.slotId || opts.checklistItemId || 'general';
    setUploadingKey(key);
    setError('');
    setEvidenceNotice('');
    try {
      const fd = new FormData();
      if (file) fd.append('file', file);
      if (opts.note) fd.append('textNote', opts.note);
      if (opts.slotId) fd.append('slotId', opts.slotId);
      if (opts.checklistItemId) fd.append('checklistItemId', opts.checklistItemId);

      const resp = await fetch(`/api/v1/projects/${task.projectId}/tasks/${task.taskId}/evidence`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-org-id': activeOrg?.org_id || '',
        },
        body: fd,
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j.message || j.error || 'Upload failed');
      }
      setEvidenceNotice('Uploaded to MinIO & queued for Gemini 2.5 mixed-language analysis.');
      setSelectedFile(null);
      setTextNote('');
      notifyDataChanged();
      if (key === 'general') {
        closeTaskDrawer();
        return;
      }
      await fetchTaskAndStatuses();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingKey(null);
    }
  }

  async function openSignedFile(fileId: string) {
    if (!task || !token) return;
    try {
      const res = await apiRequest<{ signed_url: string }>(
        `/api/v1/projects/${task.projectId}/files/${fileId}/signed-url`,
        {},
        token
      );
      if (res.signed_url) window.open(res.signed_url, '_blank');
    } catch (err) {
      setError((err as Error).message);
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
            className="fixed top-2.5 right-2.5 bottom-2.5 z-50 flex w-[min(510px,calc(100vw-20px))] flex-col rounded-[26px] border border-white/[0.08] bg-[#141417] shadow-2xl overflow-hidden"
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
                    title="Full Execution View"
                  >
                    <ExternalLink size={15} />
                  </Link>
                )}
                <button onClick={closeTaskDrawer} className="rounded-xl border border-white/[0.08] bg-[#1b1b1f] p-2 text-zinc-400 hover:text-white cursor-pointer">
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {evidenceNotice && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{evidenceNotice}</span>
                </div>
              )}

              {task && (
                <>
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

                  {/* Dynamic Project-Scoped Workflow Statuses */}
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 block mb-2">
                      Project Workflow Status
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {statuses.map((st) => {
                        const active = task.status === st.key;
                        return (
                          <button
                            key={st.key}
                            onClick={() => void changeStatus(st.key)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-mono font-semibold transition-all cursor-pointer border ${
                              active
                                ? 'border-orange-500 bg-orange-500/20 text-white'
                                : 'border-white/[0.06] bg-[#1b1b1f] text-zinc-400 hover:text-white'
                            }`}
                          >
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: st.color }} />
                            {st.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Typed Interactive Checklists */}
                  <div className="rounded-2xl border border-white/[0.06] bg-[#18181c] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                        <FileCheck size={14} className="text-orange-400" />
                        Typed Checklist
                      </span>
                      <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                        {doneChecks}/{totalChecks} ({checkPct}%)
                      </span>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400"
                        animate={{ width: `${checkPct}%` }}
                        transition={{ duration: 0.35, ease: MARLO_EASE }}
                      />
                    </div>

                    <div className="space-y-2">
                      {task.checklist.map((item, idx) => {
                        const kind = item.kind || 'CHECK';
                        return (
                          <div
                            key={item.id}
                            className={`rounded-xl border p-2.5 space-y-2 ${
                              item.completed
                                ? 'border-emerald-500/25 bg-emerald-500/5'
                                : 'border-white/[0.06] bg-[#1f1f24]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={item.completed}
                                onChange={() => void toggleCheck(idx)}
                                className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-orange-500 cursor-pointer"
                              />
                              <span className="rounded bg-orange-500/15 px-1.5 py-0.5 font-mono text-[9px] text-orange-300">
                                {kind}
                              </span>
                              <span className={`text-xs flex-1 ${item.completed ? 'line-through text-zinc-400' : 'text-zinc-200'}`}>
                                {item.label}
                              </span>
                            </div>

                            {/* Fill in the blank or short answer */}
                            {(kind === 'FILL_BLANK' || kind === 'SHORT_ANSWER') && (
                              <div className="pl-6">
                                <input
                                  type="text"
                                  value={item.value || ''}
                                  onChange={(e) => updateCheckValue(idx, e.target.value)}
                                  onBlur={() => void saveChecklist(task.checklist)}
                                  placeholder={kind === 'FILL_BLANK' ? 'Fill in the blank value...' : 'Short answer...'}
                                  className="w-full rounded-lg border border-white/[0.08] bg-[#121215] px-2.5 py-1 text-xs text-white outline-none focus:border-orange-500"
                                />
                              </div>
                            )}

                            {/* Numeric measurement with unit */}
                            {kind === 'NUMBER' && (
                              <div className="flex items-center gap-2 pl-6">
                                <input
                                  type="number"
                                  step="any"
                                  value={item.value || ''}
                                  onChange={(e) => updateCheckValue(idx, e.target.value)}
                                  onBlur={() => void saveChecklist(task.checklist)}
                                  placeholder="0.00"
                                  className="w-36 rounded-lg border border-white/[0.08] bg-[#121215] px-2.5 py-1 font-mono text-xs text-white outline-none focus:border-orange-500"
                                />
                                {item.unit && (
                                  <span className="font-mono text-[11px] text-zinc-400 font-semibold">{item.unit}</span>
                                )}
                              </div>
                            )}

                            {/* Single selection options */}
                            {kind === 'OPTIONS' && (
                              <div className="flex flex-wrap gap-1.5 pl-6">
                                {(item.options || ['Pass', 'Fail', 'N/A']).map((opt) => {
                                  const selected = item.value === opt;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => {
                                        updateCheckValue(idx, opt);
                                        const next = [...task.checklist];
                                        next[idx].completed = Boolean(opt);
                                        void saveChecklist(next);
                                      }}
                                      className={`rounded-lg px-2.5 py-1 text-[11px] font-medium border transition-colors cursor-pointer ${
                                        selected
                                          ? 'border-orange-500 bg-orange-500/20 text-white font-semibold'
                                          : 'border-white/[0.06] bg-[#121215] text-zinc-400 hover:text-white'
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Multi-select options */}
                            {kind === 'MULTI_SELECT' && (
                              <div className="flex flex-wrap gap-1.5 pl-6">
                                {(item.options || ['Option 1', 'Option 2', 'Option 3']).map((opt) => {
                                  const list = Array.isArray(item.selectedOptions) ? item.selectedOptions : [];
                                  const isChecked = list.includes(opt);
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => {
                                        const updatedList = isChecked ? list.filter((x) => x !== opt) : [...list, opt];
                                        const next = [...task.checklist];
                                        next[idx].selectedOptions = updatedList;
                                        next[idx].value = updatedList.join(', ');
                                        next[idx].completed = updatedList.length > 0;
                                        setTask({ ...task, checklist: next });
                                        void saveChecklist(next);
                                      }}
                                      className={`rounded-lg px-2.5 py-1 text-[11px] font-medium border transition-colors cursor-pointer ${
                                        isChecked
                                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200 font-semibold'
                                          : 'border-white/[0.06] bg-[#121215] text-zinc-400 hover:text-white'
                                      }`}
                                    >
                                      {isChecked ? '✓ ' : '+ '} {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {(kind === 'TEXT' || kind === 'LINK') && (
                              <div className="flex gap-2 pl-6">
                                <input
                                  type={kind === 'LINK' ? 'url' : 'text'}
                                  value={item.value || ''}
                                  onChange={(e) => updateCheckValue(idx, e.target.value)}
                                  onBlur={() => void saveChecklist(task.checklist)}
                                  placeholder={kind === 'LINK' ? 'https://...' : 'Enter measurement or note...'}
                                  className="flex-1 rounded-lg border border-white/[0.08] bg-[#121215] px-2.5 py-1 text-xs text-white outline-none focus:border-orange-500"
                                />
                                {kind === 'LINK' && item.value && (
                                  <a href={item.value} target="_blank" rel="noreferrer" className="grid place-items-center rounded-lg bg-white/[0.08] px-2 text-orange-300">
                                    <Link2 size={12} />
                                  </a>
                                )}
                              </div>
                            )}

                            {(kind === 'FILE' || kind === 'MEDIA') && (
                              <div className="flex items-center justify-between gap-2 pl-6">
                                {item.fileId ? (
                                  <button
                                    type="button"
                                    onClick={() => void openSignedFile(item.fileId!)}
                                    className="text-[11px] font-mono text-emerald-300 hover:underline cursor-pointer truncate"
                                  >
                                    ✓ {item.fileName || item.fileId}
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-zinc-500">No {kind.toLowerCase()} uploaded</span>
                                )}
                                <label className="rounded-lg bg-orange-500/15 px-2.5 py-1 text-[10px] font-semibold text-orange-300 hover:bg-orange-500/25 cursor-pointer">
                                  {uploadingKey === item.id ? 'Uploading…' : 'Upload'}
                                  <input
                                    type="file"
                                    accept={kind === 'MEDIA' ? 'image/*,video/*,audio/*' : '*'}
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      e.target.value = '';
                                      if (f) void uploadToEndpoint(f, { checklistItemId: item.id });
                                    }}
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <form onSubmit={addCheckItem} className="flex flex-wrap gap-2 pt-1">
                      <input
                        type="text"
                        value={newCheckLabel}
                        onChange={(e) => setNewCheckLabel(e.target.value)}
                        placeholder="Add verification step…"
                        className="flex-1 min-w-[140px] rounded-xl border border-white/[0.08] bg-[#121215] px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-orange-500"
                      />
                      <select
                        value={newCheckKind}
                        onChange={(e) => setNewCheckKind(e.target.value as ChecklistKind)}
                        className="rounded-xl border border-white/[0.08] bg-[#121215] px-2 py-1.5 font-mono text-[10px] text-orange-300 outline-none"
                      >
                        <option value="CHECK">☑️ Checkbox</option>
                        <option value="FILL_BLANK">📝 Fill in Blank</option>
                        <option value="NUMBER">🔢 Number</option>
                        <option value="SHORT_ANSWER">💬 Short Answer</option>
                        <option value="OPTIONS">🔘 Option</option>
                        <option value="MULTI_SELECT">☑️ Multi Select</option>
                        <option value="TEXT">📄 Long Text</option>
                        <option value="FILE">📁 File</option>
                        <option value="MEDIA">📸 Media</option>
                        <option value="LINK">🔗 Link</option>
                      </select>
                      <button type="submit" className="flex items-center gap-1 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer">
                        <Plus size={12} /> Add
                      </button>
                    </form>
                  </div>

                  {/* Named Multi-Slot File Submissions */}
                  {task.fileRequirements && task.fileRequirements.length > 0 && (
                    <div className="rounded-2xl border border-white/[0.06] bg-[#18181c] p-4 space-y-3">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                        <UploadCloud size={14} className="text-sky-400" />
                        Required File Submission Slots ({task.fileRequirements.length})
                      </span>
                      <div className="space-y-2.5">
                        {task.fileRequirements.map((slot) => (
                          <div key={slot.id} className="rounded-xl border border-white/[0.06] bg-[#1f1f24] p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-xs font-semibold text-white">{slot.header || slot.label}</p>
                                <p className="text-[10px] font-mono text-zinc-500">
                                  Type: {slot.acceptedType || 'ANY'} {slot.required !== false ? '· Required' : ''}
                                </p>
                              </div>
                              <label className="rounded-full bg-sky-500/15 border border-sky-500/30 px-3 py-1 text-[11px] font-semibold text-sky-300 hover:bg-sky-500/25 cursor-pointer">
                                {uploadingKey === slot.id ? 'Uploading…' : '+ Upload File'}
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    e.target.value = '';
                                    if (f) void uploadToEndpoint(f, { slotId: slot.id });
                                  }}
                                />
                              </label>
                            </div>
                            {slot.uploadedFiles && slot.uploadedFiles.length > 0 && (
                              <div className="space-y-1 pt-1 border-t border-white/[0.05]">
                                {slot.uploadedFiles.map((uf) => (
                                  <button
                                    key={uf.fileId}
                                    type="button"
                                    onClick={() => void openSignedFile(uf.fileId)}
                                    className="block text-[11px] font-mono text-emerald-300 hover:underline cursor-pointer truncate"
                                  >
                                    ✓ {uf.fileName}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* General Voice Note / Observation Upload */}
                  <div className="rounded-2xl border border-white/[0.06] bg-[#18181c] p-4 space-y-2.5">
                    <span className="text-xs font-semibold text-white block">
                      Field Observation / Voice-to-Text Submission
                    </span>
                    <VoiceRecorderInput
                      onAudioCaptured={(file) => setSelectedFile(file)}
                      onTranscriptUpdate={(txt) => setTextNote(txt)}
                    />
                    <input
                      type="file"
                      accept="image/*,video/*,audio/*,.pdf"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="w-full text-[11px] text-zinc-400 file:mr-2.5 file:rounded-lg file:border-0 file:bg-orange-500/15 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-orange-400 cursor-pointer"
                    />
                    <textarea
                      rows={2}
                      value={textNote}
                      onChange={(e) => setTextNote(e.target.value)}
                      placeholder="Add field notes or mixed-language voice context..."
                      className="w-full rounded-xl border border-white/[0.08] bg-[#121215] p-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-orange-500"
                    />
                    <button
                      type="button"
                      disabled={uploadingKey === 'general'}
                      onClick={() => void uploadToEndpoint(selectedFile, { note: textNote })}
                      className="w-full rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 py-2 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
                    >
                      {uploadingKey === 'general' ? 'Submitting…' : 'Submit Note / Evidence'}
                    </button>
                  </div>

                  {/* AI Voice-to-Text & Efficiency Insights */}
                  {aiInsights && (aiInsights.score || aiInsights.analyses.length > 0) && (
                    <div className="rounded-2xl border border-orange-500/25 bg-[#161314] p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-orange-300">
                          Gemini 2.5 Voice &amp; Evidence Analysis
                        </span>
                        {aiInsights.score && (
                          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                            Efficiency: {Number(aiInsights.score.overall_efficiency).toFixed(1)}%
                          </span>
                        )}
                      </div>
                      {aiInsights.analyses.map((a, idx) => (
                        <div key={idx} className="rounded-xl border border-white/[0.06] bg-[#121215] p-3 space-y-1.5 text-xs">
                          {a.identifiedLanguages && a.identifiedLanguages.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {a.identifiedLanguages.map((lang) => (
                                <span key={lang} className="rounded bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-orange-300">
                                  {lang}
                                </span>
                              ))}
                            </div>
                          )}
                          {a.audioTranscript && (
                            <p className="text-zinc-200 leading-relaxed">
                              <span className="text-zinc-400 font-semibold">Transcript: </span>
                              {a.audioTranscript}
                            </p>
                          )}
                          {a.aiSummary && (
                            <p className="text-zinc-400 text-[11px]">{a.aiSummary}</p>
                          )}
                          {!a.audioTranscript && a.textNote && (
                            <p className="text-zinc-300 text-[11px]">Note: {a.textNote}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
