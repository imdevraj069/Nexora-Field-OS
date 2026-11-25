'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FolderPlus, Layers, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/services/nexoraClient';
import { useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';

interface ProjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProjectCreateModal({ isOpen, onClose, onSuccess }: ProjectCreateModalProps) {
  const { activeOrg, token } = useWorkspaceAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState<'standard' | 'solar' | 'telecom'>('solar');
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
        `/api/v1/projects?orgId=${activeOrg.org_id}`,
        {
          method: 'POST',
          body: JSON.stringify({
            title,
            description,
            template,
            orgId: activeOrg.org_id,
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
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#121215] p-6 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/15 border border-orange-500/20 text-orange-400">
                <FolderPlus size={16} />
              </div>
              <h3 className="font-display text-base font-bold text-white">Create New Field Project</h3>
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
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Project Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Apex Solar Farm - Phase 1 Grid Connection"
                className="w-full rounded-xl border border-white/[0.08] bg-[#18181b] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Description / Scope of Work</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Site grading, tracker installation, inverter cable wiring and final verification."
                className="w-full rounded-xl border border-white/[0.08] bg-[#18181b] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Milestone Template</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'solar', label: 'Solar & Renewable', stages: '4 Stages' },
                  { id: 'telecom', label: 'Telecom Towers', stages: '3 Stages' },
                  { id: 'standard', label: 'General Field Work', stages: '2 Stages' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id as any)}
                    className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                      template === t.id
                        ? 'border-orange-500 bg-orange-500/10 text-white'
                        : 'border-white/[0.06] bg-[#18181b] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <p className="font-semibold text-xs">{t.label}</p>
                    <p className="font-mono text-[10px] text-zinc-500 mt-0.5">{t.stages}</p>
                  </button>
                ))}
              </div>
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
                {loading ? 'Creating…' : 'Create Project'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
