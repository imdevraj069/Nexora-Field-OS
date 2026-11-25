'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckSquare, Plus, Trash2, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/services/nexoraClient';
import { useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';
import { MARLO_EASE } from '@/components/ui/motion';

interface StageOption {
  stageId: string;
  name: string;
}

interface MemberOption {
  userId: string;
  fullName: string | null;
  email: string | null;
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
  const [taskType, setTaskType] = useState('ON_FIELD');
  const [stageId, setStageId] = useState(defaultStageId || stages[0]?.stageId || '');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [checklistItems, setChecklistItems] = useState<string[]>([
    'Verify site safety & PPE compliance',
    'Upload timestamped field evidence',
  ]);
  const [newCheck, setNewCheck] = useState('');
  const [reqTypes, setReqTypes] = useState<string[]>(['IMAGE']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (defaultStageId) setStageId(defaultStageId);
    else if (stages.length > 0 && !stageId) setStageId(stages[0].stageId);
  }, [defaultStageId, stages, stageId]);

  useEffect(() => {
    if (!isOpen || !token) return;
    apiRequest<{ members: MemberOption[] }>('/api/v1/org/members', {}, token)
      .then((res) => setMembers(res.members || []))
      .catch(() => {});
  }, [isOpen, token]);

  if (!isOpen) return null;

  function addChecklistLine() {
    if (!newCheck.trim()) return;
    setChecklistItems([...checklistItems, newCheck.trim()]);
    setNewCheck('');
  }

  function toggleReqType(type: string) {
    setReqTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
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

    try {
      await apiRequest(
        `/api/v1/tasks`,
        {
          method: 'POST',
          body: JSON.stringify({
            projectId,
            stageId,
            title,
            description,
            taskType,
            assignedUserId: assignedUserId || undefined,
            deadline: deadline || undefined,
            checklist: checklistItems.map((label, i) => ({
              id: `chk-${Date.now()}-${i}`,
              label,
              completed: false,
              required: true,
            })),
            fileRequirements: reqTypes.map((ft, i) => ({
              id: `fr-${i}`,
              label: `${ft} Evidence`,
              fileType: ft,
              required: true,
            })),
          }),
        },
        token
      );
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
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[26px] border border-white/[0.08] bg-[#141417] p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 border border-orange-500/25 text-orange-400">
                <CheckSquare size={16} />
              </div>
              <h3 className="font-display text-base font-bold text-white">Create Field Task & Checklist</h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
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
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Task Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Grounding resistance measurement under 5 ohms"
                className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500/60"
              />
            </div>

            {stages.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Milestone Stage</label>
                <select
                  value={stageId}
                  onChange={(e) => setStageId(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] px-3 py-2.5 text-xs text-zinc-100 outline-none focus:border-orange-500/60 cursor-pointer"
                >
                  {stages.map((s) => (
                    <option key={s.stageId} value={s.stageId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Task Type</label>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] px-3 py-2.5 text-xs text-zinc-100 outline-none focus:border-orange-500/60 cursor-pointer"
                >
                  <option value="ON_FIELD">On-Field Execution</option>
                  <option value="TRANSIT">Transit & Dispatch</option>
                  <option value="INSPECTION">Inspection</option>
                  <option value="HANDOVER">Handover</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Target Deadline</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] px-3 py-2.5 text-xs text-zinc-100 outline-none focus:border-orange-500/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Assign Team Member</label>
              <select
                value={assignedUserId}
                onChange={(e) => setAssignedUserId(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] px-3 py-2.5 text-xs text-zinc-100 outline-none focus:border-orange-500/60 cursor-pointer"
              >
                <option value="">Unassigned (Team Pool)</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.fullName || m.email} ({m.userId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instructions for the field engineer..."
                className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500/60"
              />
            </div>

            {/* Required Evidence Types */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Required Proof Inputs</label>
              <div className="flex flex-wrap gap-2">
                {['IMAGE', 'VIDEO', 'AUDIO', 'TEXT'].map((ft) => (
                  <button
                    key={ft}
                    type="button"
                    onClick={() => toggleReqType(ft)}
                    className={`rounded-full px-3 py-1 text-[11px] font-mono border transition-colors cursor-pointer ${
                      reqTypes.includes(ft)
                        ? 'border-orange-500 bg-orange-500/15 text-orange-300 font-semibold'
                        : 'border-white/[0.08] bg-[#18181c] text-zinc-400'
                    }`}
                  >
                    {ft}
                  </button>
                ))}
              </div>
            </div>

            {/* Checklist Builder */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#18181c] p-3.5 space-y-2.5">
              <label className="block text-xs font-semibold text-zinc-200">
                Mandatory Pre-Completion Checklist ({checklistItems.length})
              </label>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {checklistItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 rounded-xl bg-[#121215] px-3 py-1.5 text-xs text-zinc-300">
                    <span className="truncate">{item}</span>
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
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCheck}
                  onChange={(e) => setNewCheck(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addChecklistLine();
                    }
                  }}
                  placeholder="Add checklist requirement..."
                  className="flex-1 rounded-xl border border-white/[0.08] bg-[#121215] px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={addChecklistLine}
                  className="flex items-center gap-1 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/[0.08] px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/[0.04] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !title}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Adding Task…' : 'Create Task'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
