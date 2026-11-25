'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Edit3, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/services/nexoraClient';
import { useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';
import { MARLO_EASE } from '@/components/ui/motion';

interface MemberOption {
  userId: string;
  fullName: string | null;
  email: string | null;
}

interface ProjectEditModalProps {
  isOpen: boolean;
  project: {
    projectId: string;
    title: string;
    description?: string;
    status: string;
    managerUserId?: string | null;
    leadBrief?: string;
    startDate?: string | null;
    targetEndDate?: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function ProjectEditModal({ isOpen, project, onClose, onSuccess }: ProjectEditModalProps) {
  const { token } = useWorkspaceAuth();
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || '');
  const [status, setStatus] = useState(project.status);
  const [managerUserId, setManagerUserId] = useState(project.managerUserId || '');
  const [leadBrief, setLeadBrief] = useState(project.leadBrief || '');
  const [startDate, setStartDate] = useState(project.startDate || '');
  const [targetEndDate, setTargetEndDate] = useState(project.targetEndDate || '');
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !token) return;
    apiRequest<{ members: MemberOption[] }>('/api/v1/org/members', {}, token)
      .then((res) => setMembers(res.members || []))
      .catch(() => {});
  }, [isOpen, token]);

  if (!isOpen) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await apiRequest(
        `/api/v1/projects/${project.projectId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            title,
            description,
            status,
            managerUserId: managerUserId || undefined,
            leadBrief,
            startDate: startDate || null,
            targetEndDate: targetEndDate || null,
          }),
        },
        token
      );
      onSuccess();
    } catch (err) {
      setError((err as Error).message || 'Failed to update project');
    } finally {
      setSaving(false);
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
          className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[26px] border border-white/[0.08] bg-[#141417] p-6 shadow-2xl space-y-4"
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 border border-orange-500/25 text-orange-400">
                <Edit3 size={16} />
              </div>
              <h3 className="font-display text-base font-bold text-white">Edit Project</h3>
            </div>
            <button onClick={onClose} className="rounded-xl p-1.5 text-zinc-400 hover:text-white cursor-pointer">
              <X size={16} />
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] px-3.5 py-2 text-xs text-white outline-none focus:border-orange-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Project Manager</label>
                <select
                  value={managerUserId}
                  onChange={(e) => setManagerUserId(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.fullName || m.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Project Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                >
                  <option value="LEAD">LEAD</option>
                  <option value="PLANNING">PLANNING</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="VERIFICATION">VERIFICATION</option>
                  <option value="FINALIZED">FINALIZED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Target End Date</label>
                <input
                  type="date"
                  value={targetEndDate}
                  onChange={(e) => setTargetEndDate(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] p-2.5 text-xs text-white outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Lead-to-Plan Scope Brief</label>
              <textarea
                rows={3}
                value={leadBrief}
                onChange={(e) => setLeadBrief(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] p-2.5 text-xs text-white outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/[0.08] px-4 py-2 text-xs text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-5 py-2 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
