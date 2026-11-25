'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Layers,
  Plus,
  CheckCircle2,
  Clock,
  User,
  Sparkles,
  UserPlus,
  CheckSquare,
} from 'lucide-react';
import { useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';
import { useDrawerStore } from '@/stores/useDrawerStore';
import { apiRequest } from '@/services/nexoraClient';
import { TaskCreateModal } from '@/components/modals/TaskCreateModal';
import { RevealInView, AnimatedRing } from '@/components/ui/motion';

export default function ProjectDetailView() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const { activeOrg, token } = useWorkspaceAuth();
  const { openTaskDrawer, refreshTick } = useDrawerStore();

  const [project, setProject] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [newStageName, setNewStageName] = useState('');
  const [addingStage, setAddingStage] = useState(false);

  const [partnerOrgId, setPartnerOrgId] = useState('');
  const [partnerUserId, setPartnerUserId] = useState('');
  const [partnerRoleName, setPartnerRoleName] = useState('Transit Partner');
  const [showCollabForm, setShowCollabForm] = useState(false);

  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiReport, setAiReport] = useState<any>(null);

  async function load() {
    if (!token || !activeOrg || !projectId) return;
    setLoading(true);
    try {
      const res = await apiRequest<{ project: any; stages: any[] }>(
        `/api/v1/projects/${projectId}`,
        {},
        token
      );
      setProject(res.project);
      setStages(res.stages || []);
      if (res.stages?.[0] && !selectedStageId) setSelectedStageId(res.stages[0].stageId);
    } catch (e) {
      console.error('Project detail load error:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [projectId, token, activeOrg, refreshTick]);

  async function handleAddStage(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !newStageName.trim()) return;
    setAddingStage(true);
    try {
      await apiRequest(
        `/api/v1/projects/${projectId}/stages`,
        {
          method: 'POST',
          body: JSON.stringify({ name: newStageName.trim(), orderIndex: stages.length + 1 }),
        },
        token
      );
      setNewStageName('');
      await load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setAddingStage(false);
    }
  }

  async function handleInvitePartner(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !partnerOrgId.trim() || !partnerUserId.trim()) return;
    try {
      await apiRequest(
        `/api/v1/projects/${projectId}/collaborators`,
        {
          method: 'POST',
          body: JSON.stringify({
            partnerOrgId: partnerOrgId.trim().toUpperCase(),
            userId: partnerUserId.trim(),
            roleName: partnerRoleName,
            allocatedStageIds: stages.map((s) => s.stageId),
          }),
        },
        token
      );
      setPartnerOrgId('');
      setPartnerUserId('');
      setShowCollabForm(false);
      await load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function triggerAiAnalysis() {
    if (!token || !projectId) return;
    setAnalyzingAi(true);
    try {
      const res = await apiRequest<any>(`/api/v1/projects/${projectId}/analyze-ai`, { method: 'POST' }, token);
      setAiReport(res);
    } catch (e) {
      alert((e as Error).message || 'Failed to generate AI analysis');
    } finally {
      setAnalyzingAi(false);
    }
  }

  const allTasks = stages.flatMap((s) => s.tasks || []);
  const doneTasks = allTasks.filter((t) => ['COMPLETED', 'VERIFIED', 'SUBMITTED'].includes(t.status)).length;
  const pct = allTasks.length > 0 ? Math.round((doneTasks / allTasks.length) * 100) : 0;

  if (loading && !project) {
    return <div className="py-16 text-center text-xs text-zinc-500">Loading project milestones…</div>;
  }

  return (
    <div className="space-y-5">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-orange-400 transition-colors"
      >
        <ArrowLeft size={13} /> Back to Projects
      </Link>

      {/* Project Header */}
      <RevealInView className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-6 shadow-xl">
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCollabForm(!showCollabForm)}
              className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#18181c] px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:border-orange-500/40 transition-all cursor-pointer"
            >
              <UserPlus size={13} className="text-orange-400" /> Partner Org
            </button>
            <button
              onClick={() => void triggerAiAnalysis()}
              disabled={analyzingAi}
              className="flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-2 text-xs font-semibold text-orange-300 hover:bg-orange-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Sparkles size={13} className={analyzingAi ? 'animate-spin' : ''} />
              {analyzingAi ? 'Analyzing…' : 'AI Synthesis'}
            </button>
            <button
              onClick={() => setShowTaskModal(true)}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus size={14} /> Add Task
            </button>
          </div>
        </div>
      </RevealInView>

      {/* Marlo 4-Stat Hero Strip (.pd__stats) */}
      <div className="grid grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-4">
        <RevealInView className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono uppercase text-zinc-500">Overall Progress</span>
            <p className="font-display text-2xl font-bold text-white mt-1 tabular-nums">{pct}% Complete</p>
            <p className="text-xs text-zinc-400">{doneTasks} of {allTasks.length} tasks done</p>
          </div>
          <AnimatedRing percent={pct} size={58} strokeWidth={5} />
        </RevealInView>

        <RevealInView delay={0.04} className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-5">
          <span className="text-[11px] font-mono uppercase text-zinc-500">Milestones</span>
          <p className="font-display text-2xl font-bold text-white mt-1 tabular-nums">{stages.length}</p>
          <p className="text-xs text-zinc-400">Execution stages</p>
        </RevealInView>

        <RevealInView delay={0.08} className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-5">
          <span className="text-[11px] font-mono uppercase text-zinc-500">Active Tasks</span>
          <p className="font-display text-2xl font-bold text-orange-400 mt-1 tabular-nums">{allTasks.length - doneTasks}</p>
          <p className="text-xs text-zinc-400">Remaining in pipeline</p>
        </RevealInView>

        <RevealInView delay={0.12} className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-5">
          <span className="text-[11px] font-mono uppercase text-zinc-500">Collaborators</span>
          <p className="font-display text-2xl font-bold text-emerald-400 mt-1 tabular-nums">
            {project?.collaborators?.length || 0}
          </p>
          <p className="text-xs text-zinc-400">Cross-org partners</p>
        </RevealInView>
      </div>

      {/* Cross-Org Partner Invite Drawer/Panel */}
      {showCollabForm && (
        <form
          onSubmit={handleInvitePartner}
          className="rounded-[22px] border border-orange-500/30 bg-[#151314] p-5 flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-[160px]">
            <label className="block text-[11px] font-mono text-zinc-400 mb-1">Partner Org ID</label>
            <input
              type="text"
              required
              value={partnerOrgId}
              onChange={(e) => setPartnerOrgId(e.target.value)}
              placeholder="PTR-26-XXXXX"
              className="w-full rounded-xl border border-white/[0.08] bg-[#121215] px-3 py-2 text-xs text-white font-mono outline-none focus:border-orange-500"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-[11px] font-mono text-zinc-400 mb-1">Partner User ID</label>
            <input
              type="text"
              required
              value={partnerUserId}
              onChange={(e) => setPartnerUserId(e.target.value)}
              placeholder="USR-..."
              className="w-full rounded-xl border border-white/[0.08] bg-[#121215] px-3 py-2 text-xs text-white font-mono outline-none focus:border-orange-500"
            />
          </div>
          <div className="min-w-[160px]">
            <label className="block text-[11px] font-mono text-zinc-400 mb-1">Project Role</label>
            <input
              type="text"
              value={partnerRoleName}
              onChange={(e) => setPartnerRoleName(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#121215] px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-red-600 to-orange-500 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
          >
            Grant Stage Access
          </button>
        </form>
      )}

      {/* AI Report */}
      {aiReport && (
        <RevealInView className="rounded-[22px] border border-orange-500/30 bg-[#151212] p-6 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-orange-400" size={18} />
              <h2 className="font-display text-base font-bold text-white">Gemini 2.5 Field Intelligence Report</h2>
            </div>
            <div className="flex items-center gap-4 font-mono text-xs">
              <span>Health: <strong className="text-orange-400">{aiReport.overall_health_score}/100</strong></span>
              <span>Progress: <strong className="text-emerald-400">{aiReport.completion_percentage}%</strong></span>
            </div>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed bg-[#18181c] p-4 rounded-2xl border border-white/[0.05]">
            {aiReport.executive_summary}
          </p>
          {aiReport.recommendations && (
            <div className="text-xs text-orange-200 bg-orange-950/25 p-3.5 rounded-2xl border border-orange-500/20">
              <strong>Recommendations:</strong> {aiReport.recommendations}
            </div>
          )}
        </RevealInView>
      )}

      {/* Milestone Stages & Inline Stage Creator */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-orange-400" />
          <h2 className="font-display text-base font-bold text-white">Milestone Execution Stages</h2>
        </div>

        <form onSubmit={handleAddStage} className="flex gap-2">
          <input
            type="text"
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            placeholder="New milestone stage name…"
            className="rounded-full border border-white/[0.08] bg-[#121215] px-4 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-orange-500"
          />
          <button
            type="submit"
            disabled={addingStage || !newStageName.trim()}
            className="rounded-full border border-white/[0.08] bg-[#18181c] px-3.5 py-1.5 text-xs font-semibold text-zinc-200 hover:border-orange-500/40 disabled:opacity-50 cursor-pointer"
          >
            + Add Stage
          </button>
        </form>
      </div>

      {/* Marlo Stage Columns (.pd__cols) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
        {stages.map((stage, idx) => (
          <RevealInView
            key={stage.stageId}
            delay={idx * 0.05}
            className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-4 shadow-xl space-y-3"
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500/15 border border-orange-500/30 font-mono text-xs font-bold text-orange-400">
                  {stage.orderIndex || idx + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-sm font-bold text-white truncate">{stage.name}</h3>
                  <p className="text-[10px] font-mono text-zinc-500">{stage.tasks?.length || 0} tasks</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedStageId(stage.stageId);
                  setShowTaskModal(true);
                }}
                className="rounded-full border border-white/[0.08] bg-[#18181c] px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:text-orange-400 cursor-pointer"
              >
                + Task
              </button>
            </div>

            <div className="space-y-2">
              {(!stage.tasks || stage.tasks.length === 0) ? (
                <div className="rounded-2xl border border-dashed border-white/[0.08] py-6 text-center text-xs text-zinc-500">
                  No tasks in this stage
                </div>
              ) : (
                stage.tasks.map((t: any) => {
                  const chkDone = (t.checklist || []).filter((c: any) => c.completed).length;
                  const chkTotal = (t.checklist || []).length;
                  return (
                    <button
                      key={t.taskId}
                      onClick={() => openTaskDrawer(t.taskId, projectId)}
                      className="w-full text-left rounded-2xl border border-white/[0.05] bg-[#18181c] p-3.5 hover:border-orange-500/40 hover:bg-[#1d1d22] transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-zinc-100 group-hover:text-orange-300 transition-colors">
                          {t.title}
                        </p>
                        <span className="shrink-0 rounded-full border border-orange-500/25 bg-orange-500/10 px-2 py-0.5 text-[10px] font-mono text-orange-300">
                          {t.status}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                        <span className="flex items-center gap-1">
                          <CheckSquare size={11} className="text-orange-400" />
                          {chkTotal > 0 ? `${chkDone}/${chkTotal} checks` : 'No checklist'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> {t.deadline ? t.deadline.slice(0, 10) : 'No due'}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </RevealInView>
        ))}
      </div>

      <TaskCreateModal
        isOpen={showTaskModal}
        projectId={projectId}
        stages={stages}
        defaultStageId={selectedStageId}
        onClose={() => setShowTaskModal(false)}
        onSuccess={() => {
          setShowTaskModal(false);
          void load();
        }}
      />
    </div>
  );
}
