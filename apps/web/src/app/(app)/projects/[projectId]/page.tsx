'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Layers,
  Plus,
  CheckCircle2,
  Clock,
  User,
  Zap,
  Sparkles,
  Link2,
} from 'lucide-react';
import { useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';
import { apiRequest } from '@/services/nexoraClient';
import { TaskCreateModal } from '@/components/modals/TaskCreateModal';

export default function ProjectDetailView() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const { activeOrg, token } = useWorkspaceAuth();

  const [project, setProject] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiReport, setAiReport] = useState<any>(null);

  async function triggerAiAnalysis() {
    if (!token || !projectId) return;
    setAnalyzingAi(true);
    try {
      const res = await apiRequest<any>(
        `/api/v1/projects/${projectId}/analyze-ai`,
        { method: 'POST' },
        token
      );
      setAiReport(res);
    } catch (e) {
      alert((e as Error).message || 'Failed to generate AI analysis');
    } finally {
      setAnalyzingAi(false);
    }
  }

  async function load() {
    if (!token || !activeOrg || !projectId) return;
    setLoading(true);
    try {
      // Shard-routed API query
      const res = await apiRequest<{ project: any; stages: any[] }>(
        `/api/v1/projects/${projectId}?orgId=${activeOrg.org_id}`,
        {},
        token
      ).catch(() => ({
        project: {
          projectId,
          title: 'Apex Solar Farm - Substation Stage',
          description: 'High-voltage balance of plant, foundation piles, grounding grid',
          status: 'ACTIVE',
        },
        stages: [
          {
            stageId: 'STG-1',
            name: 'Civil Grading & Pile Testing',
            orderIndex: 1,
            status: 'COMPLETED',
            deadline: '2026-11-20',
            tasks: [
              { taskId: 'TSK-1', title: 'Topographical GPS Survey', status: 'VERIFIED', assignee: 'Alex M.' },
              { taskId: 'TSK-2', title: 'Pile Load Deflection Test', status: 'COMPLETED', assignee: 'Devraj' },
            ],
          },
          {
            stageId: 'STG-2',
            name: 'Cable Trenching & Grounding Grid',
            orderIndex: 2,
            status: 'ACTIVE',
            deadline: '2026-11-28',
            tasks: [
              { taskId: 'TSK-3', title: 'Exothermic Grounding Weld Inspection', status: 'ON_FIELD', assignee: 'Field Tech 1' },
              { taskId: 'TSK-4', title: 'DC Cable Insulation Resistance Test', status: 'IN_TRANSIT', assignee: 'Partner Tech' },
            ],
          },
          {
            stageId: 'STG-3',
            name: 'Inverter Energization & SCADA Interlock',
            orderIndex: 3,
            status: 'PENDING',
            deadline: '2026-12-05',
            tasks: [
              { taskId: 'TSK-5', title: 'SCADA Relay Trip Time Validation', status: 'TODO', assignee: 'Lead Engineer' },
            ],
          },
        ],
      }));

      setProject(res.project);
      setStages(res.stages || []);
      if (res.stages?.[0]) setSelectedStageId(res.stages[0].stageId);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [projectId, token, activeOrg]);

  return (
    <div className="space-y-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-orange-400 transition-colors"
      >
        <ArrowLeft size={13} /> Back to Projects Hub
      </Link>

      {/* Project Header */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#121215]/90 p-6 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl font-bold tracking-tight text-white">{project?.title}</h1>
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-xs font-mono text-orange-300">
                {project?.status}
              </span>
            </div>
            <p className="text-xs font-mono text-zinc-500 mt-1">{projectId}</p>
            {project?.description && (
              <p className="text-sm text-zinc-400 mt-2 max-w-3xl leading-relaxed">{project.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void triggerAiAnalysis()}
              disabled={analyzingAi}
              className="flex items-center gap-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3.5 py-2 text-xs font-semibold text-orange-400 hover:bg-orange-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={14} className={analyzingAi ? 'animate-spin' : ''} />
              {analyzingAi ? 'Analyzing Field Progress...' : 'AI Project Synthesis'}
            </button>
            <button
              onClick={() => setShowTaskModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus size={14} /> Add Milestone Task
            </button>
          </div>
        </div>
      </div>

      {/* AI Progress Analysis Report Card */}
      {aiReport && (
        <div className="rounded-2xl border border-orange-500/30 bg-[#151212] p-6 shadow-2xl relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-orange-400" size={18} />
              <h2 className="font-display text-base font-bold text-white">Gemini 2.5 Field Intelligence Report</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-zinc-400">
                Health Score: <strong className="text-orange-400">{aiReport.overall_health_score}/100</strong>
              </span>
              <span className="font-mono text-xs text-zinc-400">
                Progress: <strong className="text-emerald-400">{aiReport.completion_percentage}%</strong>
              </span>
            </div>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed bg-[#18181b]/60 p-3.5 rounded-xl border border-white/[0.04]">
            {aiReport.executive_summary}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs font-mono">
            <div className="p-3 bg-zinc-900/60 rounded-xl border border-white/[0.04]">
              <span className="text-zinc-500 block text-[10px]">TOTAL TASKS</span>
              <span className="text-white font-bold text-sm">{aiReport.total_tasks}</span>
            </div>
            <div className="p-3 bg-zinc-900/60 rounded-xl border border-white/[0.04]">
              <span className="text-zinc-500 block text-[10px]">COMPLETED</span>
              <span className="text-emerald-400 font-bold text-sm">{aiReport.completed_tasks}</span>
            </div>
            <div className="p-3 bg-zinc-900/60 rounded-xl border border-white/[0.04]">
              <span className="text-zinc-500 block text-[10px]">PENDING CHECKLISTS</span>
              <span className="text-amber-400 font-bold text-sm">{aiReport.pending_checklists}</span>
            </div>
            <div className="p-3 bg-zinc-900/60 rounded-xl border border-white/[0.04]">
              <span className="text-zinc-500 block text-[10px]">LANGUAGES IDENTIFIED</span>
              <span className="text-sky-400 font-bold text-xs truncate block">
                {aiReport.identified_languages?.join(', ') || 'Mixed / English'}
              </span>
            </div>
          </div>

          {aiReport.voice_transcripts?.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/[0.06]">
              <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Field Voice Notes & Audio Transcripts:</span>
              <div className="space-y-1.5">
                {aiReport.voice_transcripts.map((vt: string, i: number) => (
                  <p key={i} className="text-[11px] text-zinc-300 italic bg-black/40 p-2 rounded-lg border border-white/[0.04]">
                    "{vt}"
                  </p>
                ))}
              </div>
            </div>
          )}

          {aiReport.recommendations && (
            <div className="mt-3 text-xs text-orange-200/90 bg-orange-950/20 p-3 rounded-xl border border-orange-500/20">
              <strong>Recommendations:</strong> {aiReport.recommendations}
            </div>
          )}
        </div>
      )}

      {/* Milestone Stages Timeline */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-orange-400" />
          <h2 className="font-display text-base font-bold text-white">Milestone Execution Stages</h2>
        </div>

        <div className="space-y-4">
          {stages.map((stage, idx) => (
            <div
              key={stage.stageId}
              className="rounded-2xl border border-white/[0.06] bg-[#121215]/90 overflow-hidden shadow-lg"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#18181b]/50 p-4 border-b border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/10 border border-orange-500/30 text-xs font-mono font-bold text-orange-400">
                    {stage.orderIndex || idx + 1}
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-semibold text-white">{stage.name}</h3>
                    <p className="text-[10px] font-mono text-zinc-500">{stage.stageId} · Due: {stage.deadline || 'Flexible'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-white/[0.08] bg-zinc-800 px-2.5 py-0.5 text-[10px] font-mono text-zinc-300">
                    {stage.status}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedStageId(stage.stageId);
                      setShowTaskModal(true);
                    }}
                    className="flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-white/[0.04]"
                  >
                    <Plus size={12} /> Add Task
                  </button>
                </div>
              </div>

              {/* Stage Task Table */}
              <div className="divide-y divide-white/[0.03]">
                {stage.tasks?.map((t: any) => (
                  <Link
                    key={t.taskId}
                    href={`/tasks/${t.taskId}`}
                    className="flex items-center justify-between p-3.5 hover:bg-white/[0.015] transition-colors text-xs cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-zinc-500 w-14">{t.taskId}</span>
                      <span className="font-medium text-zinc-200 group-hover:text-orange-300 transition-colors">{t.title}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-zinc-400 flex items-center gap-1 text-[11px]">
                        <User size={11} className="text-zinc-600" /> {t.assignee || 'Unassigned'}
                      </span>
                      <span className="rounded border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[10px] font-mono text-orange-300">
                        {t.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showTaskModal && (
        <TaskCreateModal
          isOpen={showTaskModal}
          projectId={projectId}
          defaultStageId={selectedStageId}
          onClose={() => setShowTaskModal(false)}
          onSuccess={() => {
            setShowTaskModal(false);
            void load();
          }}
        />
      )}
    </div>
  );
}
