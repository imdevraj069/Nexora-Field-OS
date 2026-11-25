'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, ArrowUp, ArrowDown, Sliders } from 'lucide-react';
import { WorkflowStatusDef } from '@/stores/useAuthStore';
import { MARLO_EASE } from '@/components/ui/motion';

interface WorkflowStatusEditorProps {
  isOpen: boolean;
  title?: string;
  initialStatuses: WorkflowStatusDef[];
  onClose: () => void;
  onSave: (statuses: WorkflowStatusDef[]) => Promise<void>;
}

const PRESET_COLORS = ['#71717a', '#3b82f6', '#f59e0b', '#f97316', '#ef4444', '#10b981', '#8b5cf6'];

export function WorkflowStatusEditor({
  isOpen,
  title = 'Customize Workflow Statuses',
  initialStatuses,
  onClose,
  onSave,
}: WorkflowStatusEditorProps) {
  const [statuses, setStatuses] = useState<WorkflowStatusDef[]>(
    initialStatuses.length > 0 ? [...initialStatuses].sort((a, b) => a.order - b.order) : []
  );
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState<'OPEN' | 'ACTIVE' | 'DONE'>('ACTIVE');
  const [newColor, setNewColor] = useState('#f97316');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  function addStatus() {
    if (!newLabel.trim()) return;
    const key = newLabel
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    if (statuses.some((s) => s.key === key)) return;
    setStatuses([
      ...statuses,
      { key, label: newLabel.trim(), color: newColor, category: newCategory, order: statuses.length + 1 },
    ]);
    setNewLabel('');
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...statuses];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setStatuses(next.map((s, i) => ({ ...s, order: i + 1 })));
  }

  async function handleSave() {
    if (statuses.length === 0) return;
    setSaving(true);
    try {
      await onSave(statuses.map((s, i) => ({ ...s, order: i + 1 })));
      onClose();
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
          className="w-full max-w-lg rounded-[26px] border border-white/[0.08] bg-[#141417] p-6 shadow-2xl space-y-4"
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 border border-orange-500/25 text-orange-400">
                <Sliders size={16} />
              </div>
              <h3 className="font-display text-base font-bold text-white">{title}</h3>
            </div>
            <button onClick={onClose} className="rounded-xl p-1.5 text-zinc-400 hover:text-white cursor-pointer">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {statuses.map((s, idx) => (
              <div
                key={s.key}
                className="flex items-center gap-2.5 rounded-2xl border border-white/[0.06] bg-[#1a1a1f] p-2.5 text-xs"
              >
                <span className="h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <input
                  type="text"
                  value={s.label}
                  onChange={(e) =>
                    setStatuses(statuses.map((item, i) => (i === idx ? { ...item, label: e.target.value } : item)))
                  }
                  className="flex-1 bg-transparent font-semibold text-white outline-none"
                />
                <select
                  value={s.category}
                  onChange={(e) =>
                    setStatuses(
                      statuses.map((item, i) =>
                        i === idx ? { ...item, category: e.target.value as 'OPEN' | 'ACTIVE' | 'DONE' } : item
                      )
                    )
                  }
                  className="rounded-lg border border-white/[0.08] bg-[#121215] px-2 py-1 font-mono text-[10px] text-zinc-300 outline-none"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DONE">DONE</option>
                </select>
                <button type="button" onClick={() => move(idx, -1)} className="text-zinc-500 hover:text-white cursor-pointer">
                  <ArrowUp size={13} />
                </button>
                <button type="button" onClick={() => move(idx, 1)} className="text-zinc-500 hover:text-white cursor-pointer">
                  <ArrowDown size={13} />
                </button>
                {statuses.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setStatuses(statuses.filter((_, i) => i !== idx))}
                    className="text-zinc-500 hover:text-red-400 cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add new status */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#18181c] p-3 space-y-2.5">
            <div className="flex gap-2">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="New status label (e.g. QC Inspection)..."
                className="flex-1 rounded-xl border border-white/[0.08] bg-[#121215] px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-orange-500"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as 'OPEN' | 'ACTIVE' | 'DONE')}
                className="rounded-xl border border-white/[0.08] bg-[#121215] px-2.5 py-1.5 font-mono text-[11px] text-zinc-200 outline-none"
              >
                <option value="OPEN">OPEN</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DONE">DONE</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`h-5 w-5 rounded-full cursor-pointer transition-transform ${
                      newColor === c ? 'ring-2 ring-white scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={addStatus}
                className="flex items-center gap-1 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
              >
                <Plus size={12} /> Add Status
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/[0.08] px-4 py-2 text-xs text-zinc-300 hover:bg-white/[0.04] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-full bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-5 py-2 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Workflow'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
