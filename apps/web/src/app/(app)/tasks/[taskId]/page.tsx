'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  User,
  Zap,
  Sparkles,
  UploadCloud,
  FileCheck,
  Shield,
  Navigation,
  Mic,
  Video,
  FileText,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';
import { apiRequest } from '@/services/nexoraClient';
import { VoiceRecorderInput } from '@/components/ui/VoiceRecorderInput';

type ChecklistKind = 'CHECK' | 'TEXT' | 'FILE' | 'MEDIA' | 'LINK';

interface ChecklistItem {
  id: string;
  label: string;
  kind?: ChecklistKind;
  completed: boolean;
  required?: boolean;
  value?: string;
  fileId?: string;
  fileName?: string;
}

export default function TaskExecutionView() {
  const params = useParams();
  const searchParams = useSearchParams();
  const taskId = params?.taskId as string;
  const projectIdFromUrl = searchParams.get('projectId') || '';
  const { activeOrg, token, user } = useWorkspaceAuth();

  const [task, setTask] = useState<any>({
    taskId,
    projectId: projectIdFromUrl,
    title: 'Loading task...',
    taskType: 'FIELD_INSPECTION',
    status: 'OPEN',
    deadline: '',
    assignedUserId: user?.fullName || '',
    notes: '',
    checklist: [],
    fileRequirements: [],
  });

  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [newChecklistText, setNewChecklistText] = useState('');
  const [newChecklistKind, setNewChecklistKind] = useState<ChecklistKind>('CHECK');
  const [textNote, setTextNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [evidenceSuccess, setEvidenceSuccess] = useState('');

  async function loadTask() {
    if (!token || !taskId) return;
    try {
      const res = await apiRequest<{ task: any }>(`/api/v1/tasks/${taskId}`, {}, token);
      if (res.task) setTask(res.task);
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to load task');
    }
  }

  useEffect(() => {
    void loadTask();
  }, [token, taskId]);

  const effectiveProjectId = task.projectId || projectIdFromUrl;

  async function saveChecklist(updated: ChecklistItem[]) {
    setTask((prev: any) => ({ ...prev, checklist: updated }));
    if (token && effectiveProjectId) {
      await apiRequest(
        `/api/v1/projects/${effectiveProjectId}/tasks/${taskId}/checklist`,
        {
          method: 'PATCH',
          body: JSON.stringify({ checklist: updated }),
        },
        token
      ).catch((err) => setErrorMsg((err as Error).message));
    }
  }

  // Toggle checklist item
  async function toggleChecklist(itemIndex: number) {
    const target = task.checklist[itemIndex];
    const kind = target.kind || 'CHECK';
    if (!target.completed) {
      if ((kind === 'TEXT' || kind === 'LINK') && !String(target.value || '').trim()) {
        setErrorMsg(`Enter the required ${kind.toLowerCase()} value for "${target.label}" first.`);
        return;
      }
      if ((kind === 'FILE' || kind === 'MEDIA') && !target.fileId) {
        setErrorMsg(`Upload the required ${kind.toLowerCase()} for "${target.label}" first.`);
        return;
      }
    }
    setErrorMsg('');
    const updated = task.checklist.map((c: ChecklistItem, i: number) =>
      i === itemIndex ? { ...c, completed: !c.completed } : c
    );
    await saveChecklist(updated);
  }

  // Add new checklist item
  async function addChecklistItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    const newItem: ChecklistItem = {
      id: `chk-${Date.now()}`,
      label: newChecklistText.trim(),
      kind: newChecklistKind,
      completed: false,
      required: true,
    };
    const updated = [...task.checklist, newItem];
    setNewChecklistText('');
    await saveChecklist(updated);
  }

  // Advance lifecycle state
  async function updateStatus(newStatus: string) {
    setErrorMsg('');
    if (newStatus === 'COMPLETED' || newStatus === 'SUBMITTED' || newStatus === 'VERIFIED') {
      const pending = task.checklist.filter((i: ChecklistItem) => !i.completed);
      if (pending.length > 0) {
        setErrorMsg(`Action Blocked: ${pending.length} checklist item(s) must be checked and verified first.`);
        return;
      }
    }

    setUpdating(true);
    try {
      if (token && effectiveProjectId) {
        await apiRequest(
          `/api/v1/projects/${effectiveProjectId}/tasks/${taskId}/status`,
          {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus }),
          },
          token
        );
      }
      setTask((prev: any) => ({ ...prev, status: newStatus }));
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to update task status');
    } finally {
      setUpdating(false);
    }
  }

  async function uploadEvidenceAsset(
    file: File | null,
    opts: { slotId?: string; checklistItemId?: string; note?: string } = {}
  ) {
    if (!token || !effectiveProjectId) return;
    const key = opts.slotId || opts.checklistItemId || 'general';
    setUploadingKey(key);
    setUploadingEvidence(true);
    setErrorMsg('');
    setEvidenceSuccess('');
    try {
      const formData = new FormData();
      if (file) formData.append('file', file);
      if (opts.note) formData.append('textNote', opts.note);
      if (opts.slotId) formData.append('slotId', opts.slotId);
      if (opts.checklistItemId) formData.append('checklistItemId', opts.checklistItemId);

      const resp = await fetch(
        `/api/v1/projects/${effectiveProjectId}/tasks/${taskId}/evidence`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'x-org-id': activeOrg?.org_id || '',
          },
          body: formData,
        }
      );
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || 'Failed to upload evidence');
      }
      setEvidenceSuccess('Evidence uploaded to MinIO & queued for Gemini 2.5 analysis.');
      setSelectedFile(null);
      setTextNote('');
      await loadTask();
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to submit evidence');
    } finally {
      setUploadingKey(null);
      setUploadingEvidence(false);
    }
  }

  // Upload proof of work (Photo, Video, Audio/Voice Note)
  async function handleUploadEvidence(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile && !textNote.trim()) {
      setErrorMsg('Please select an audio/video/image file or enter a voice transcript / note.');
      return;
    }
    await uploadEvidenceAsset(selectedFile, { note: textNote });
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link
        href="/tasks"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-orange-400 transition-colors"
      >
        <ArrowLeft size={13} /> Back to Field Tasks
      </Link>

      {/* Task Summary Card */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#121215]/90 p-6 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-500">{taskId}</span>
              <span className="rounded bg-[#18181b] border border-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                {task.taskType}
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white mt-1">
              {task.title}
            </h1>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed max-w-xl">
              {task.notes}
            </p>
          </div>

          <div className="text-right">
            <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-mono font-bold text-orange-300">
              {task.status}
            </span>
            <p className="text-[11px] font-mono text-zinc-500 mt-1.5 flex items-center justify-end gap-1">
              <Clock size={11} /> Due: {task.deadline}
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Pre-completion Field Checklist */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#121215]/90 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-sm font-semibold text-white flex items-center gap-2">
              <FileCheck size={16} className="text-orange-400" />
              Pre-Completion Verification Checklist (Mandatory)
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              All checklist items must be verified before marking task as Submitted or Completed.
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            {task.checklist.filter((i: ChecklistItem) => i.completed).length} / {task.checklist.length} Done
          </span>
        </div>

        <div className="space-y-2 mb-4">
          {task.checklist.map((item: ChecklistItem, idx: number) => {
            const kind = item.kind || 'CHECK';
            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-colors space-y-2 ${
                  item.completed
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-zinc-200'
                    : 'border-white/[0.06] bg-[#18181b]/40 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => void toggleChecklist(idx)}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-orange-500 focus:ring-orange-500/30 cursor-pointer"
                  />
                  <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-orange-400">
                    {kind}
                  </span>
                  <span className={`text-xs flex-1 ${item.completed ? 'line-through text-zinc-400' : ''}`}>
                    {item.label}
                  </span>
                  {item.required && (
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400/90 border border-amber-500/20">
                      Required
                    </span>
                  )}
                </div>

                {(kind === 'TEXT' || kind === 'LINK') && (
                  <div className="pl-7">
                    <input
                      type={kind === 'LINK' ? 'url' : 'text'}
                      value={item.value || ''}
                      onChange={(e) => {
                        const updated = task.checklist.map((c: ChecklistItem, i: number) =>
                          i === idx ? { ...c, value: e.target.value } : c
                        );
                        setTask((prev: any) => ({ ...prev, checklist: updated }));
                      }}
                      onBlur={() => void saveChecklist(task.checklist)}
                      placeholder={kind === 'LINK' ? 'https://...' : 'Enter measurement or note...'}
                      className="w-full rounded-lg border border-white/[0.08] bg-[#121215] px-2.5 py-1.5 text-xs text-white outline-none focus:border-orange-500"
                    />
                  </div>
                )}

                {(kind === 'FILE' || kind === 'MEDIA') && (
                  <div className="flex items-center justify-between gap-2 pl-7">
                    <span className="text-[11px] text-zinc-400 truncate">
                      {item.fileId ? `✓ ${item.fileName || item.fileId}` : `No ${kind.toLowerCase()} uploaded`}
                    </span>
                    <label className="rounded-lg bg-orange-500/15 px-3 py-1 text-[11px] font-semibold text-orange-400 hover:bg-orange-500/25 cursor-pointer shrink-0">
                      {uploadingKey === item.id ? 'Uploading…' : 'Upload File'}
                      <input
                        type="file"
                        accept={kind === 'MEDIA' ? 'image/*,video/*,audio/*' : '*'}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (f) void uploadEvidenceAsset(f, { checklistItemId: item.id });
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add new checklist item form */}
        <form onSubmit={addChecklistItem} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={newChecklistText}
            onChange={(e) => setNewChecklistText(e.target.value)}
            placeholder="Add new required verification item..."
            className="flex-1 min-w-[160px] rounded-xl border border-white/[0.08] bg-[#18181b] px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
          />
          <select
            value={newChecklistKind}
            onChange={(e) => setNewChecklistKind(e.target.value as ChecklistKind)}
            className="rounded-xl border border-white/[0.08] bg-[#18181b] px-2.5 py-2 text-xs font-semibold text-orange-400 outline-none"
          >
            <option value="CHECK">Check</option>
            <option value="TEXT">Text</option>
            <option value="FILE">File</option>
            <option value="MEDIA">Media</option>
            <option value="LINK">Link</option>
          </select>
          <button
            type="submit"
            className="flex items-center gap-1 rounded-xl bg-[#27272a] hover:bg-zinc-700 px-3 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            <Plus size={13} /> Add
          </button>
        </form>
      </div>

      {/* Required File Submission Slots */}
      {task.fileRequirements && task.fileRequirements.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#121215]/90 p-6 shadow-xl space-y-3">
          <h2 className="font-display text-sm font-semibold text-white flex items-center gap-2">
            <UploadCloud size={16} className="text-sky-400" />
            Required File Submission Slots ({task.fileRequirements.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {task.fileRequirements.map((slot: any) => (
              <div key={slot.id} className="rounded-xl border border-white/[0.08] bg-[#18181b] p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{slot.header || slot.label}</p>
                    <p className="text-[11px] text-zinc-400">
                      {slot.acceptedType || slot.fileType || 'ANY'}
                    </p>
                  </div>
                  <label className="rounded-full bg-orange-500/15 px-3 py-1 text-[11px] font-semibold text-orange-400 hover:bg-orange-500/25 cursor-pointer shrink-0">
                    {uploadingKey === slot.id ? 'Uploading…' : '+ Upload'}
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        if (f) void uploadEvidenceAsset(f, { slotId: slot.id });
                      }}
                    />
                  </label>
                </div>
                {slot.uploadedFiles && slot.uploadedFiles.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-white/[0.06]">
                    {slot.uploadedFiles.map((uf: any) => (
                      <p key={uf.fileId} className="text-[11px] text-emerald-400 truncate">
                        ✓ {uf.fileName}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile-Friendly Tactile Field Control Strip */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#121215]/90 p-6 shadow-xl">
        <h2 className="font-display text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Navigation size={16} className="text-orange-400" />
          Tactile Field Action Strip (Advance Lifecycle)
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Start Transit', status: 'IN_TRANSIT', color: 'border-sky-500/40 text-sky-300' },
            { label: 'Arrived On-Site', status: 'ON_FIELD', color: 'border-purple-500/40 text-purple-300' },
            { label: 'Submit Proof', status: 'SUBMITTED', color: 'border-orange-500/40 text-orange-300' },
            { label: 'Verify & Close', status: 'COMPLETED', color: 'border-emerald-500/40 text-emerald-300' },
          ].map((btn) => (
            <button
              key={btn.status}
              disabled={updating || task.status === btn.status}
              onClick={() => void updateStatus(btn.status)}
              className={`flex flex-col items-center justify-center p-3.5 rounded-xl border font-semibold text-xs transition-all active:scale-[0.98] cursor-pointer ${
                task.status === btn.status
                  ? 'bg-orange-500/15 border-orange-500 text-white shadow-lg'
                  : 'bg-[#18181b] border-white/[0.06] text-zinc-400 hover:border-white/[0.2] hover:text-white'
              }`}
            >
              <span>{btn.label}</span>
              <span className="font-mono text-[10px] text-zinc-500 mt-1">{btn.status}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Proof of Work Capture Area: Image, Video, Audio/Voice note & Text Inputs */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#121215]/90 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-sm font-semibold text-white flex items-center gap-2">
            <UploadCloud size={16} className="text-orange-400" />
            Proof of Work Verification (MinIO + Gemini 2.5 Analysis)
          </h2>
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono">
            <span className="flex items-center gap-1"><Mic size={12} className="text-orange-400" /> Voice/Audio</span>
            <span className="flex items-center gap-1"><Video size={12} className="text-sky-400" /> Video</span>
            <span className="flex items-center gap-1"><FileText size={12} className="text-emerald-400" /> Photo/Doc</span>
          </div>
        </div>

        {evidenceSuccess && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs">
            <CheckCircle2 size={15} />
            <span>{evidenceSuccess}</span>
          </div>
        )}

        <form onSubmit={handleUploadEvidence} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Upload Proof File (Image / Video / Audio Voice Note)
              </label>
              <input
                type="file"
                accept="image/*,video/*,audio/*,.pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-zinc-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-500/10 file:text-orange-400 hover:file:bg-orange-500/20 cursor-pointer"
              />
              {selectedFile && (
                <p className="text-[11px] font-mono text-zinc-400 mt-1">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Field Observations / Voice Transcript (Multi & Mixed Language)
              </label>
              <textarea
                value={textNote}
                onChange={(e) => setTextNote(e.target.value)}
                placeholder="Enter field notes, observations, or speak in Hindi/English/Hinglish/regional dialect..."
                rows={3}
                className="w-full rounded-xl border border-white/[0.08] bg-[#18181b] p-2.5 text-xs text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
              />
              <div className="mt-2">
                <VoiceRecorderInput
                  onAudioCaptured={(file) => setSelectedFile(file)}
                  onTranscriptUpdate={(t) => setTextNote((prev) => (prev ? `${prev} ${t}` : t))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={uploadingEvidence}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              <UploadCloud size={14} className={uploadingEvidence ? 'animate-bounce' : ''} />
              {uploadingEvidence ? 'Uploading & Analyzing...' : 'Submit Evidence Proof'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
