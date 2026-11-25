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

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  required?: boolean;
}

export default function TaskExecutionView() {
  const params = useParams();
  const searchParams = useSearchParams();
  const taskId = params?.taskId as string;
  const projectIdFromUrl = searchParams.get('projectId') || 'PRJ-DEFAULT';
  const { activeOrg, token, user } = useWorkspaceAuth();

  const [task, setTask] = useState<any>({
    taskId,
    title: 'Site Foundation Concrete Pour Audit',
    taskType: 'FIELD_INSPECTION',
    status: 'ON_FIELD',
    deadline: '2026-11-26',
    assignedUserId: user?.fullName || 'devraj',
    notes: 'Verify 28-day cylinder compressive strength report. Inspect anchor bolts positioning.',
    checklist: [
      { id: 'chk-1', label: 'Verify concrete batch mix delivery ticket & slump test', completed: true, required: true },
      { id: 'chk-2', label: 'Inspect rebar clearance, chair blocks & anchor cage bolts', completed: false, required: true },
      { id: 'chk-3', label: 'Record high-voltage earthing grid continuity resistance (Ohms)', completed: false, required: true },
    ],
    fileRequirements: [
      { id: 'fr-1', label: 'High-res foundation pour site photo', fileType: 'IMAGE', required: true },
      { id: 'fr-2', label: 'Field technician voice/video notes explaining test result', fileType: 'AUDIO/VIDEO', required: false },
    ],
    textInputs: {
      siteObservations: 'Concrete slump measured 110mm. Vibrator compacting in progress.',
    },
  });

  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [newChecklistText, setNewChecklistText] = useState('');
  const [textNote, setTextNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [evidenceSuccess, setEvidenceSuccess] = useState('');

  // Toggle checklist item
  async function toggleChecklist(itemIndex: number) {
    const updated = [...task.checklist];
    updated[itemIndex].completed = !updated[itemIndex].completed;
    setTask((prev: any) => ({ ...prev, checklist: updated }));

    if (token) {
      await apiRequest(
        `/api/v1/projects/${projectIdFromUrl}/tasks/${taskId}/checklist`,
        {
          method: 'PATCH',
          body: JSON.stringify({ checklist: updated }),
        },
        token
      ).catch(() => {});
    }
  }

  // Add new checklist item
  async function addChecklistItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    const newItem: ChecklistItem = {
      id: `chk-${Date.now()}`,
      label: newChecklistText.trim(),
      completed: false,
      required: true,
    };
    const updated = [...task.checklist, newItem];
    setTask((prev: any) => ({ ...prev, checklist: updated }));
    setNewChecklistText('');

    if (token) {
      await apiRequest(
        `/api/v1/projects/${projectIdFromUrl}/tasks/${taskId}/checklist`,
        {
          method: 'PATCH',
          body: JSON.stringify({ checklist: updated }),
        },
        token
      ).catch(() => {});
    }
  }

  // Advance lifecycle state
  async function updateStatus(newStatus: string) {
    setErrorMsg('');
    // Client-side checklist guard
    if (newStatus === 'COMPLETED' || newStatus === 'SUBMITTED' || newStatus === 'VERIFIED') {
      const pending = task.checklist.filter((i: ChecklistItem) => !i.completed);
      if (pending.length > 0) {
        setErrorMsg(`Action Blocked: ${pending.length} checklist item(s) must be checked and verified first.`);
        return;
      }
    }

    setUpdating(true);
    try {
      if (token) {
        await apiRequest(
          `/api/v1/projects/${projectIdFromUrl}/tasks/${taskId}/status`,
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

  // Upload proof of work (Photo, Video, Audio/Voice Note)
  async function handleUploadEvidence(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile && !textNote.trim()) {
      alert('Please select an audio/video/image file or enter a voice transcript / note.');
      return;
    }

    setUploadingEvidence(true);
    setEvidenceSuccess('');
    try {
      const formData = new FormData();
      if (selectedFile) formData.append('file', selectedFile);
      formData.append('textNote', textNote);

      const resp = await fetch(
        `/api/v1/projects/${projectIdFromUrl}/tasks/${taskId}/evidence`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to upload evidence');
      }
      setEvidenceSuccess('Evidence recorded! Gemini 2.5 Flash queued for mixed-language audio & visual analysis.');
      setSelectedFile(null);
      setTextNote('');
    } catch (err) {
      alert((err as Error).message || 'Failed to submit evidence');
    } finally {
      setUploadingEvidence(false);
    }
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
          {task.checklist.map((item: ChecklistItem, idx: number) => (
            <label
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer select-none ${
                item.completed
                  ? 'border-emerald-500/30 bg-emerald-500/5 text-zinc-200'
                  : 'border-white/[0.06] bg-[#18181b]/40 text-zinc-300 hover:border-white/[0.15]'
              }`}
            >
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => void toggleChecklist(idx)}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-orange-500 focus:ring-orange-500/30 cursor-pointer"
              />
              <span className={`text-xs flex-1 ${item.completed ? 'line-through text-zinc-400' : ''}`}>
                {item.label}
              </span>
              {item.required && (
                <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400/90 border border-amber-500/20">
                  Required
                </span>
              )}
            </label>
          ))}
        </div>

        {/* Add new checklist item form */}
        <form onSubmit={addChecklistItem} className="flex gap-2">
          <input
            type="text"
            value={newChecklistText}
            onChange={(e) => setNewChecklistText(e.target.value)}
            placeholder="Add new required verification item..."
            className="flex-1 rounded-xl border border-white/[0.08] bg-[#18181b] px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
          />
          <button
            type="submit"
            className="flex items-center gap-1 rounded-xl bg-[#27272a] hover:bg-zinc-700 px-3 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            <Plus size={13} /> Add
          </button>
        </form>
      </div>

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
