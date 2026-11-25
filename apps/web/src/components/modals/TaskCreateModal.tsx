'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckSquare, User, Calendar, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/services/nexoraClient';
import { useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';

interface TaskCreateModalProps {
  isOpen: boolean;
  projectId: string;
  defaultStageId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function TaskCreateModal({
  isOpen,
  projectId,
  defaultStageId,
  onClose,
  onSuccess,
}: TaskCreateModalProps) {
  const { activeOrg, token } = useWorkspaceAuth();
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState('FIELD_INSPECTION');
  const [stageId, setStageId] = useState(defaultStageId || '');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !activeOrg) return;
    setLoading(true);
    setError('');

    try {
      await apiRequest(
        `/api/v1/tasks?orgId=${activeOrg.org_id}`,
        {
          method: 'POST',
          body: JSON.stringify({
            projectId,
            stageId,
            title,
            taskType,
            assignedUserId: assignedUserId || undefined,
            deadline: deadline || undefined,
            orgId: activeOrg.org_id,
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
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#121215] p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/15 border border-orange-500/20 text-orange-400">
                <CheckSquare size={16} />
              </div>
              <h3 className="font-display text-base font-bold text-white">Create Field Task</h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
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
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Task Title / Specification</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Grounding resistance measurement under 5 ohms"
                className="w-full rounded-xl border border-white/[0.08] bg-[#18181b] px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Task Category</label>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#18181b] px-3 py-2.5 text-xs text-zinc-100 outline-none focus:border-orange-500/60 cursor-pointer"
                >
                  <option value="FIELD_INSPECTION">Field Inspection</option>
                  <option value="INSTALLATION">Hardware Install</option>
                  <option value="SURVEY">Site Survey</option>
                  <option value="COMMISSIONING">Commissioning</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Target Deadline</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#18181b] px-3 py-2.5 text-xs text-zinc-100 outline-none focus:border-orange-500/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Assignee User ID (Optional)</label>
              <input
                type="text"
                value={assignedUserId}
                onChange={(e) => setAssignedUserId(e.target.value)}
                placeholder="Leave blank for unassigned pool"
                className="w-full rounded-xl border border-white/[0.08] bg-[#18181b] px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500/60 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/[0.08] px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/[0.04]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !title}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Adding Task…' : 'Add Task to Stage'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
