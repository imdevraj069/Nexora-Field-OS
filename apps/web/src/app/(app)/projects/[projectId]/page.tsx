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

          <button
            onClick={() => setShowTaskModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus size={14} /> Add Milestone Task
          </button>
        </div>
      </div>

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
