'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckSquare, Plus, Trash2, AlertCircle, UploadCloud } from 'lucide-react';
import { apiRequest } from '@/services/nexoraClient';
import { useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';
import { MARLO_EASE } from '@/components/ui/motion';

type ChecklistKind = 'CHECK' | 'TEXT' | 'FILE' | 'MEDIA' | 'LINK';

interface ChecklistDraft {
  id: string;
  label: string;
  kind: ChecklistKind;
  required: boolean;
  completed: boolean;
}

interface FileSlotDraft {
  id: string;
  header: string;
  acceptedType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'ANY';
  required: boolean;
  uploadedFiles: unknown[];
}

interface StageOption {
  stageId: string;
  name: string;
}

interface MemberOption {
  userId: string;
  fullName: string | null;
  email: string | null;
  orgId?: string;
  orgName?: string;
  isExternal?: boolean;
}

interface TaskCreateModalProps {
  isOpen: boolean;
  projectId: string;
  stages?: StageOption[];
  defaultStageId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function TaskCreateModal({
  isOpen,
  projectId,
  stages = [],
  defaultStageId,
  onClose,
  onSuccess,
}: TaskCreateModalProps) {
  const { activeOrg, token } = useWorkspaceAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stageId, setStageId] = useState(defaultStageId || stages[0]?.stageId || '');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [members, setMembers] = useState<MemberOption[]>([]);

  const [checklistItems, setChecklistItems] = useState<ChecklistDraft[]>([
    { id: `chk-1`, label: 'Site safety & PPE verified', kind: 'CHECK', required: true, completed: false },
  ]);
  const [newCheckLabel, setNewCheckLabel] = useState('');
  const [newCheckKind, setNewCheckKind] = useState<ChecklistKind>('CHECK');

  const [fileSlots, setFileSlots] = useState<FileSlotDraft[]>([]);
  const [newSlotHeader, setNewSlotHeader] = useState('');
  const [newSlotType, setNewSlotType] = useState<'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'ANY'>('IMAGE');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (defaultStageId) setStageId(defaultStageId);
    else if (stages.length > 0 && !stages.some((s) => s.stageId === stageId)) {
      setStageId(stages[0].stageId);
    }
  }, [defaultStageId, stages, stageId, isOpen]);

  useEffect(() => {
    if (!isOpen || !token || !projectId) return;
    apiRequest<{ assignees: MemberOption[] }>(
      `/api/v1/projects/${projectId}/assignees`,
      { headers: { 'x-org-id': activeOrg?.org_id || '' } },
      token
    )
      .then((res) => setMembers(res.assignees || []))
      .catch(() => {
        apiRequest<{ members: MemberOption[] }>('/api/v1/org/members', {}, token)
          .then((res) => setMembers(res.members || []))
          .catch(() => {});
      });
  }, [isOpen, token, projectId, activeOrg?.org_id]);

  if (!isOpen) return null;

  function addChecklistLine() {
    if (!newCheckLabel.trim()) return;
    setChecklistItems([
      ...checklistItems,
      {
        id: `chk-${Date.now()}`,
        label: newCheckLabel.trim(),
        kind: newCheckKind,
        required: true,
        completed: false,
      },
    ]);
    setNewCheckLabel('');
  }

  function addFileSlot() {
    if (!newSlotHeader.trim()) return;
    setFileSlots([
      ...fileSlots,
      {
        id: `slot-${Date.now()}`,
        header: newSlotHeader.trim(),
        acceptedType: newSlotType,
        required: true,
        uploadedFiles: [],
      },
    ]);
    setNewSlotHeader('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !activeOrg) return;
    if (!stageId) {
      setError('Please select a milestone stage.');
      return;
    }
    setLoading(true);
    setError('');

    const selectedMilestone = stages.find((s) => s.stageId === stageId);
    try {
      await apiRequest(
        `/api/v1/tasks`,
        {
          method: 'POST',
          headers: { 'x-org-id': activeOrg.org_id },
          body: JSON.stringify({
            projectId,
            stageId,
            title,
            description,
            taskType: selectedMilestone?.name || 'MILESTONE_TASK',
            assignedUserId: assignedUserId || undefined,
            deadline: deadline || undefined,
            checklist: checklistItems,
            fileRequirements: fileSlots,
          }),
        },
        token
      );
      setTitle('');
      setDescription('');
      onSuccess();
    } catch (err) {
      setError((err as Error).message || 'Failed to create task.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.28, ease: MARLO_EASE }}
          className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[26px] border border-white/[0.08] bg-[#141417] p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 border border-orange-500/25 text-orange-400">
                <CheckSquare size={16} />
              </div>
              <h3 className="font-display text-base font-bold text-white">Create Task, Typed Checklists & Proof Slots</h3>
            </div>
            <button onClick={onClose} className="rounded-xl p-1.5 text-zinc-400 hover:text-white cursor-pointer">
              <X size={16} />
            </button>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Task Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Grounding resistance measurement & visual inspection"
                className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500/60"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Milestone *</label>
                {stages.length === 0 ? (
                  <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-400">
                    Create a milestone under this project first.
                  </p>
                ) : (
                  <select
                    value={stageId}
                    onChange={(e) => setStageId(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] px-3 py-2 text-xs text-zinc-100 outline-none focus:border-orange-500/60 cursor-pointer"
                  >
                    {stages.map((s) => (
                      <option key={s.stageId} value={s.stageId}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Assignee (All Project Orgs)</label>
                <select
                  value={assignedUserId}
                  onChange={(e) => setAssignedUserId(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] px-3 py-2 text-xs text-zinc-100 outline-none"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.fullName || m.email}{m.orgName ? ` (${m.orgName})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Deadline</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] px-3 py-2 text-xs text-zinc-100 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Instructions</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Execution notes for the assigned user..."
                className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500/60"
              />
            </div>

            {/* Typed Checklist Builder */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#18181c] p-3.5 space-y-2.5">
              <label className="block text-xs font-semibold text-zinc-200">
                Typed Checklist Items ({checklistItems.length})
              </label>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {checklistItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl bg-[#121215] px-3 py-1.5 text-xs">
                    <span className="rounded bg-orange-500/15 px-1.5 py-0.5 font-mono text-[10px] text-orange-300">
                      {item.kind}
                    </span>
                    <span className="flex-1 text-zinc-200 truncate">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => setChecklistItems(checklistItems.filter((_, i) => i !== idx))}
                      className="text-zinc-500 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={newCheckLabel}
                  onChange={(e) => setNewCheckLabel(e.target.value)}
                  placeholder="Checklist step..."
                  className="flex-1 min-w-[160px] rounded-xl border border-white/[0.08] bg-[#121215] px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-orange-500"
                />
                <select
                  value={newCheckKind}
                  onChange={(e) => setNewCheckKind(e.target.value as ChecklistKind)}
                  className="rounded-xl border border-white/[0.08] bg-[#121215] px-2.5 py-1.5 font-mono text-[11px] text-orange-300 outline-none"
                >
                  <option value="CHECK">Normal Check</option>
                  <option value="TEXT">Text Input</option>
                  <option value="FILE">File Upload</option>
                  <option value="MEDIA">Media (Photo/Vid/Audio)</option>
                  <option value="LINK">Link / URL</option>
                </select>
                <button
                  type="button"
                  onClick={addChecklistLine}
                  className="flex items-center gap-1 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>

            {/* Multi-Slot Named File Submissions Builder */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#18181c] p-3.5 space-y-2.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                <UploadCloud size={13} className="text-orange-400" />
                Named File Submission Slots ({fileSlots.length})
              </label>
              {fileSlots.length > 0 && (
                <div className="space-y-1.5 max-h-28 overflow-y-auto">
                  {fileSlots.map((slot, idx) => (
                    <div key={slot.id} className="flex items-center justify-between gap-2 rounded-xl bg-[#121215] px-3 py-1.5 text-xs">
                      <span className="rounded bg-sky-500/15 px-1.5 py-0.5 font-mono text-[10px] text-sky-300">
                        {slot.acceptedType}
                      </span>
                      <span className="flex-1 text-zinc-200 truncate">{slot.header}</span>
                      <button
                        type="button"
                        onClick={() => setFileSlots(fileSlots.filter((_, i) => i !== idx))}
                        className="text-zinc-500 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={newSlotHeader}
                  onChange={(e) => setNewSlotHeader(e.target.value)}
                  placeholder="Custom submission header (e.g. Before Site Photo)..."
                  className="flex-1 min-w-[160px] rounded-xl border border-white/[0.08] bg-[#121215] px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-orange-500"
                />
                <select
                  value={newSlotType}
                  onChange={(e) => setNewSlotType(e.target.value as FileSlotDraft['acceptedType'])}
                  className="rounded-xl border border-white/[0.08] bg-[#121215] px-2.5 py-1.5 font-mono text-[11px] text-sky-300 outline-none"
                >
                  <option value="IMAGE">Image</option>
                  <option value="VIDEO">Video</option>
                  <option value="AUDIO">Voice / Audio</option>
                  <option value="DOCUMENT">Document / PDF</option>
                  <option value="ANY">Any File</option>
                </select>
                <button
                  type="button"
                  onClick={addFileSlot}
                  className="flex items-center gap-1 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                >
                  <Plus size={12} /> Add Slot
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button type="button" onClick={onClose} className="rounded-xl border border-white/[0.08] px-4 py-2 text-xs text-zinc-300 cursor-pointer">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !title}
                className="rounded-full bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-5 py-2 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Adding…' : 'Create Task'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
