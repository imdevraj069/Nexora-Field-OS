'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FolderPlus, Sparkles, AlertCircle, Plus, Trash2, User } from 'lucide-react';
import { apiRequest } from '@/services/nexoraClient';
import { useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';
import { MARLO_EASE } from '@/components/ui/motion';

interface MemberOption {
  userId: string;
  fullName: string | null;
  email: string | null;
}

interface ProjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProjectCreateModal({ isOpen, onClose, onSuccess }: ProjectCreateModalProps) {
  const { activeOrg, token, user } = useWorkspaceAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [managerUserId, setManagerUserId] = useState(user?.userId || '');
  const [leadBrief, setLeadBrief] = useState('');
  const [startDate, setStartDate] = useState('');
  const [targetEndDate, setTargetEndDate] = useState('');
  const [stages, setStages] = useState<Array<{ name: string; deadline: string }>>([]);
  const [newStageName, setNewStageName] = useState('');
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !token) return;
    apiRequest<{ members: MemberOption[] }>('/api/v1/org/members', {}, token)
      .then((res) => {
        setMembers(res.members || []);
        if (!managerUserId && user?.userId) setManagerUserId(user.userId);
      })
      .catch(() => {});
  }, [isOpen, token, user?.userId, managerUserId]);

  if (!isOpen) return null;

  async function handleAiDraft() {
    if (!token || !leadBrief.trim()) return;
    setAiLoading(true);
    setError('');
    try {
      const plan = await apiRequest<{
        suggestedTitle: string;
        summary: string;
        stages: Array<{ name: string }>;
      }>(
        '/api/v1/projects/ai-blueprint',
        { method: 'POST', body: JSON.stringify({ prompt: leadBrief, industryHint: 'general' }) },
        token
      );
      if (plan.suggestedTitle && !title) setTitle(plan.suggestedTitle);
      if (plan.summary && !description) setDescription(plan.summary);
      if (Array.isArray(plan.stages) && plan.stages.length > 0) {
        setStages(plan.stages.map((s) => ({ name: s.name, deadline: '' })));
      }
    } catch (err) {
      setError((err as Error).message || 'AI blueprint unavailable');
    } finally {
      setAiLoading(false);
    }
  }

  function addCustomStage() {
    if (!newStageName.trim()) return;
    setStages([...stages, { name: newStageName.trim(), deadline: '' }]);
    setNewStageName('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !activeOrg) return;
    setLoading(true);
    setError('');

    try {
      await apiRequest(
        `/api/v1/projects?orgId=${activeOrg.org_id}`,
        {
          method: 'POST',
          body: JSON.stringify({
            title,
            description,
            managerUserId: managerUserId || undefined,
            leadBrief: leadBrief || undefined,
            startDate: startDate || undefined,
            targetEndDate: targetEndDate || undefined,
            stages,
          }),
        },
        token
      );
      onSuccess();
    } catch (err) {
      setError((err as Error).message || 'Failed to create project.');
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
                <FolderPlus size={16} />
              </div>
              <h3 className="font-display text-base font-bold text-white">Create Project</h3>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Project Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="North Sector Grid Rollout"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500/60"
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-zinc-300 mb-1.5">
                  <User size={12} className="text-orange-400" /> Project Manager *
                </label>
                <select
                  required
                  value={managerUserId}
                  onChange={(e) => setManagerUserId(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] px-3 py-2.5 text-xs text-zinc-100 outline-none focus:border-orange-500/60 cursor-pointer"
                >
                  {members.length === 0 && user && (
                    <option value={user.userId}>{user.fullName} (You)</option>
                  )}
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.fullName || m.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief operational summary..."
                className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] px-3 py-2 text-xs text-zinc-100 outline-none focus:border-orange-500/60"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Target End Date</label>
                <input
                  type="date"
                  value={targetEndDate}
                  onChange={(e) => setTargetEndDate(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#18181c] px-3 py-2 text-xs text-zinc-100 outline-none focus:border-orange-500/60"
                />
              </div>
            </div>

            {/* Lead-to-Plan Textarea */}
            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/[0.05] p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-orange-300">
                  <Sparkles size={12} /> Lead-to-Plan Blueprint Brief (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => void handleAiDraft()}
                  disabled={aiLoading || !leadBrief.trim()}
                  className="rounded-full bg-orange-500/20 border border-orange-500/30 px-3 py-1 text-[11px] font-semibold text-orange-300 hover:bg-orange-500/30 disabled:opacity-50 cursor-pointer"
                >
                  {aiLoading ? 'Generating…' : 'AI Draft Milestones'}
                </button>
              </div>
              <textarea
                rows={3}
                value={leadBrief}
                onChange={(e) => setLeadBrief(e.target.value)}
                placeholder="Paste client requirements, site scope, or operational notes here. You can also edit or refine this after creating the project..."
                className="w-full rounded-xl border border-white/[0.08] bg-[#121215] p-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-orange-500/60"
              />
            </div>

            {/* Custom Milestones Builder (Zero forced templates) */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#18181c] p-3.5 space-y-2.5">
              <label className="block text-xs font-semibold text-zinc-200">
                Custom Milestones / Stages ({stages.length})
              </label>

              {stages.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {stages.map((st, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-xl bg-[#121215] p-2 text-xs">
                      <span className="font-mono text-[10px] text-orange-400 w-5">{idx + 1}.</span>
                      <input
                        type="text"
                        value={st.name}
                        onChange={(e) =>
                          setStages(stages.map((s, i) => (i === idx ? { ...s, name: e.target.value } : s)))
                        }
                        className="flex-1 bg-transparent text-white outline-none"
                      />
                      <input
                        type="date"
                        value={st.deadline}
                        onChange={(e) =>
                          setStages(stages.map((s, i) => (i === idx ? { ...s, deadline: e.target.value } : s)))
                        }
                        className="rounded-lg border border-white/[0.08] bg-[#18181c] px-2 py-1 text-[10px] text-zinc-300 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setStages(stages.filter((_, i) => i !== idx))}
                        className="text-zinc-500 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomStage();
                    }
                  }}
                  placeholder="Add custom milestone (or leave empty & add later)..."
                  className="flex-1 rounded-xl border border-white/[0.08] bg-[#121215] px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={addCustomStage}
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
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Creating…' : 'Create Project'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
