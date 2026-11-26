'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Layers,
  Plus,
  Clock,
  Sparkles,
  UserPlus,
  CheckSquare,
  Edit3,
  Trash2,
  Sliders,
  LayoutGrid,
  Columns,
  Check,
  X,
} from 'lucide-react';
import { PERMISSION_FLAGS } from '@nexora/shared-types';
import { useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';
import { useAuthStore, WorkflowStatusDef, DEFAULT_STATUSES } from '@/stores/useAuthStore';
import { useDrawerStore } from '@/stores/useDrawerStore';
import { apiRequest } from '@/services/nexoraClient';
import { TaskCreateModal } from '@/components/modals/TaskCreateModal';
import { ProjectEditModal } from '@/components/modals/ProjectEditModal';
import { WorkflowStatusEditor } from '@/components/modals/WorkflowStatusEditor';
import { RevealInView, AnimatedRing, MARLO_BACK_SPRING } from '@/components/ui/motion';

export default function ProjectDetailView() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const { activeOrg, token } = useWorkspaceAuth();
  const { permissions } = useAuthStore();
  const { openTaskDrawer, refreshTick, notifyDataChanged } = useDrawerStore();

  const [project, setProject] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'stages' | 'board'>('stages');

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showStatusEditor, setShowStatusEditor] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string>('');

  const [newStageName, setNewStageName] = useState('');
  const [newStageDeadline, setNewStageDeadline] = useState('');
  const [addingStage, setAddingStage] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editStageName, setEditStageName] = useState('');
  const [editStageDeadline, setEditStageDeadline] = useState('');

  const [showBlueprintPanel, setShowBlueprintPanel] = useState(false);
  const [blueprintBrief, setBlueprintBrief] = useState('');
  const [applyingBlueprint, setApplyingBlueprint] = useState(false);

  const [partnerOrgId, setPartnerOrgId] = useState('');
  const [collabNotes, setCollabNotes] = useState('');
  const [orgDirectory, setOrgDirectory] = useState<Array<{ orgId: string; orgName: string; shardId: number }>>([]);
  const [orgCollaborations, setOrgCollaborations] = useState<any[]>([]);
  const [memberCollaborators, setMemberCollaborators] = useState<any[]>([]);
  const [orgMembers, setOrgMembers] = useState<Array<{ userId: string; fullName: string | null; email: string | null }>>([]);
  const [assignMemberId, setAssignMemberId] = useState('');
  const [assignRoleName, setAssignRoleName] = useState('Partner Specialist');
  const [showCollabForm, setShowCollabForm] = useState(false);

  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [boardError, setBoardError] = useState('');

  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiReport, setAiReport] = useState<any>(null);

  const canManageProject = Boolean(
    permissions[PERMISSION_FLAGS.PROJECT_MANAGE] || permissions[PERMISSION_FLAGS.ORG_MANAGE_SETTINGS]
  );
  const canManageStages = Boolean(
    canManageProject || permissions[PERMISSION_FLAGS.STAGE_MANAGE_ALL]
  );

  async function load() {
    if (!token || !activeOrg || !projectId) return;
    setLoading(true);
    try {
      const [res, dirRes, colRes, memRes] = await Promise.all([
        apiRequest<{ project: any; stages: any[] }>(`/api/v1/projects/${projectId}`, {}, token),
        apiRequest<{ orgs: any[] }>('/api/v1/orgs/directory', {}, token).catch(() => ({ orgs: [] })),
        apiRequest<{ orgCollaborations: any[]; memberCollaborators: any[] }>(
          `/api/v1/projects/${projectId}/collaborations`,
          {},
          token
        ).catch(() => ({ orgCollaborations: [], memberCollaborators: [] })),
        apiRequest<{ members: any[] }>('/api/v1/org/members', {}, token).catch(() => ({ members: [] })),
      ]);
      setProject(res.project);
      setStages(res.stages || []);
      setBlueprintBrief(res.project?.leadBrief || '');
      setOrgDirectory(dirRes.orgs || []);
      setOrgCollaborations(colRes.orgCollaborations || []);
      setMemberCollaborators(colRes.memberCollaborators || []);
      setOrgMembers(memRes.members || []);
      if (dirRes.orgs?.[0] && !partnerOrgId) setPartnerOrgId(dirRes.orgs[0].orgId);
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
          body: JSON.stringify({
            name: newStageName.trim(),
            orderIndex: stages.length + 1,
            deadline: newStageDeadline || undefined,
          }),
        },
        token
      );
      setNewStageName('');
      setNewStageDeadline('');
      await load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setAddingStage(false);
    }
  }

  async function handleSaveStageEdit(stageId: string) {
    if (!token || !editStageName.trim()) return;
    try {
      await apiRequest(
        `/api/v1/projects/${projectId}/stages/${stageId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: editStageName.trim(),
            deadline: editStageDeadline || null,
          }),
        },
        token
      );
      setEditingStageId(null);
      await load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleDeleteStage(stageId: string) {
    if (!token || !confirm('Delete this milestone stage and its tasks?')) return;
    try {
      await apiRequest(`/api/v1/projects/${projectId}/stages/${stageId}`, { method: 'DELETE' }, token);
      await load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleApplyBlueprint(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !blueprintBrief.trim()) return;
    setApplyingBlueprint(true);
    try {
      await apiRequest(
        `/api/v1/projects/${projectId}/apply-blueprint`,
        { method: 'POST', body: JSON.stringify({ leadBrief: blueprintBrief.trim() }) },
        token
      );
      setShowBlueprintPanel(false);
      await load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setApplyingBlueprint(false);
    }
  }

  async function handleSaveStatuses(statuses: WorkflowStatusDef[]) {
    if (!token) return;
    await apiRequest(
      `/api/v1/projects/${projectId}`,
      { method: 'PATCH', body: JSON.stringify({ workflowStatuses: statuses }) },
      token
    );
    await load();
  }

  async function handleDropTask(targetStatus: string) {
    if (!dragTaskId || !token) return;
    const taskId = dragTaskId;
    setDragTaskId(null);
    setBoardError('');
    try {
      await apiRequest(
        `/api/v1/projects/${projectId}/tasks/${taskId}/status`,
        { method: 'PATCH', body: JSON.stringify({ status: targetStatus }) },
        token
      );
      notifyDataChanged();
      await load();
    } catch (err) {
      setBoardError((err as Error).message);
    }
  }

  async function handleInvitePartner(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !partnerOrgId.trim()) return;
    try {
      await apiRequest(
        `/api/v1/projects/${projectId}/org-invites`,
        {
          method: 'POST',
          body: JSON.stringify({
            partnerOrgId: partnerOrgId.trim().toUpperCase(),
            allocatedStageIds: stages.map((s) => s.stageId),
            notes: collabNotes.trim() || undefined,
          }),
        },
        token
      );
      setCollabNotes('');
      await load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleAssignMemberToProject(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !assignMemberId) return;
    try {
      await apiRequest(
        `/api/v1/projects/${projectId}/collaborators/assign`,
        {
          method: 'POST',
          body: JSON.stringify({
            partnerOrgId: activeOrg?.org_id,
            userIds: [assignMemberId],
            roleName: assignRoleName,
            allocatedStageIds: stages.map((s) => s.stageId),
          }),
        },
        token
      );
      setAssignMemberId('');
      await load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleRemoveCollaborator(userId: string) {
    if (!token) return;
    await apiRequest(`/api/v1/projects/${projectId}/collaborators/${userId}`, { method: 'DELETE' }, token);
    await load();
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

  const workflowStatuses: WorkflowStatusDef[] =
    project?.workflowStatuses?.length > 0 ? project.workflowStatuses : DEFAULT_STATUSES;
  const doneKeys = new Set(workflowStatuses.filter((s) => s.category === 'DONE').map((s) => s.key));
  const allTasks = stages.flatMap((s) => s.tasks || []);
  const doneTasks = allTasks.filter((t) => doneKeys.has(t.status) || ['DONE', 'COMPLETED', 'VERIFIED'].includes(t.status)).length;
  const pct = allTasks.length > 0 ? Math.round((doneTasks / allTasks.length) * 100) : 0;

  if (loading && !project) {
    return <div className="py-16 text-center text-xs text-zinc-500">Loading project milestones…</div>;
  }

  return (
    <div className="space-y-5">
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-orange-400 transition-colors">
        <ArrowLeft size={13} /> Back to Projects
      </Link>

      {/* Project Header */}
      <RevealInView className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-6 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-display text-2xl font-bold tracking-tight text-white">{project?.title}</h1>
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-xs font-mono text-orange-300">
                {project?.status}
              </span>
              {canManageProject && (
                <button
                  onClick={() => setShowEditProject(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-[#18181c] px-2.5 py-1 text-[11px] text-zinc-300 hover:text-orange-300 cursor-pointer"
                >
                  <Edit3 size={11} /> Edit Project
                </button>
              )}
            </div>
            <p className="text-xs font-mono text-zinc-500 mt-1">
              {projectId} {project?.managerUserId && `· Manager: ${project.managerUserId}`}
              {project?.targetEndDate && ` · Due: ${project.targetEndDate}`}
            </p>
            {project?.description && (
              <p className="text-sm text-zinc-400 mt-2 max-w-3xl leading-relaxed">{project.description}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManageProject && (
              <>
                <button
                  onClick={() => setShowStatusEditor(true)}
                  className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#18181c] px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:border-orange-500/40 cursor-pointer"
                >
                  <Sliders size={13} className="text-orange-400" /> Statuses
                </button>
                <button
                  onClick={() => setShowBlueprintPanel(!showBlueprintPanel)}
                  className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#18181c] px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:border-orange-500/40 cursor-pointer"
                >
                  <Sparkles size={13} className="text-orange-400" /> Lead-to-Plan
                </button>
                <button
                  onClick={() => setShowCollabForm(!showCollabForm)}
                  className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#18181c] px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:border-orange-500/40 cursor-pointer"
                >
                  <UserPlus size={13} className="text-orange-400" /> Partner
                </button>
              </>
            )}
            <button
              onClick={() => void triggerAiAnalysis()}
              disabled={analyzingAi}
              className="flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-2 text-xs font-semibold text-orange-300 hover:bg-orange-500/20 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles size={13} className={analyzingAi ? 'animate-spin' : ''} />
              {analyzingAi ? 'Analyzing…' : 'AI Synthesis'}
            </button>
            <button
              onClick={() => setShowTaskModal(true)}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 cursor-pointer"
            >
              <Plus size={14} /> Add Task
            </button>
          </div>
        </div>
      </RevealInView>

      {/* Post-Creation Editable Lead-to-Plan Blueprint Textarea */}
      {showBlueprintPanel && (
        <form onSubmit={handleApplyBlueprint} className="rounded-[22px] border border-orange-500/30 bg-[#151314] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-orange-300 flex items-center gap-1.5">
              <Sparkles size={13} /> Lead-to-Plan Scope Brief (Generate & Append Milestones)
            </span>
          </div>
          <textarea
            rows={5}
            required
            value={blueprintBrief}
            onChange={(e) => setBlueprintBrief(e.target.value)}
            placeholder="Describe project scope, site details, or client changes to automatically generate and append milestone stages..."
            className="w-full rounded-2xl border border-white/[0.08] bg-[#121215] p-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-orange-500"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowBlueprintPanel(false)} className="rounded-xl border border-white/[0.08] px-3.5 py-1.5 text-xs text-zinc-300 cursor-pointer">
              Close
            </button>
            <button type="submit" disabled={applyingBlueprint} className="rounded-full bg-gradient-to-r from-red-600 to-orange-500 px-4 py-1.5 text-xs font-semibold text-white cursor-pointer disabled:opacity-50">
              {applyingBlueprint ? 'Generating Stages…' : 'Save Brief & Append AI Stages'}
            </button>
          </div>
        </form>
      )}

      {/* Cross-Organization Collaboration Panel */}
      {showCollabForm && (
        <div className="rounded-[22px] border border-orange-500/30 bg-[#151314] p-5 space-y-5">
          <form onSubmit={handleInvitePartner} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Invite Partner Organization
              </label>
              {orgDirectory.length > 0 ? (
                <select
                  value={partnerOrgId}
                  onChange={(e) => setPartnerOrgId(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#121215] px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                >
                  {orgDirectory.map((o) => (
                    <option key={o.orgId} value={o.orgId}>
                      {o.orgName} ({o.orgId})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  value={partnerOrgId}
                  onChange={(e) => setPartnerOrgId(e.target.value)}
                  placeholder="Partner Org ID (e.g. PTR-26-XXXXX)"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#121215] px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                />
              )}
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Collaboration Scope / Note
              </label>
              <input
                type="text"
                value={collabNotes}
                onChange={(e) => setCollabNotes(e.target.value)}
                placeholder="e.g. Handle solar inverter commissioning"
                className="w-full rounded-xl border border-white/[0.08] bg-[#121215] px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-[#ff3b30] to-[#f97316] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
            >
              Send Org Invite
            </button>
          </form>

          {/* Assign Team Members from Current Org (for Accepted Partner Orgs or Owner) */}
          <form onSubmit={handleAssignMemberToProject} className="flex flex-wrap items-end gap-3 pt-3 border-t border-white/[0.06]">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Assign Team Member ({activeOrg?.org_name}) to Project
              </label>
              <select
                value={assignMemberId}
                onChange={(e) => setAssignMemberId(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#121215] px-3 py-2 text-xs text-white outline-none"
              >
                <option value="">Select member...</option>
                {orgMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.fullName || m.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[160px]">
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Project Role</label>
              <input
                type="text"
                value={assignRoleName}
                onChange={(e) => setAssignRoleName(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#121215] px-3 py-2 text-xs text-white outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!assignMemberId}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
            >
              Assign Member
            </button>
          </form>

          {/* Collaborating Organizations & Assigned Members List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Partner Organizations ({orgCollaborations.length})
              </p>
              {orgCollaborations.length === 0 ? (
                <p className="text-xs text-zinc-500">No partner organizations invited yet.</p>
              ) : (
                orgCollaborations.map((oc) => (
                  <div key={oc.collab_id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#121215] px-3 py-2 text-xs">
                    <div>
                      <p className="font-semibold text-white">{oc.partner_org_name}</p>
                      <p className="text-[10px] text-zinc-400">{oc.partner_org_id}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        oc.status === 'ACCEPTED'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : oc.status === 'REJECTED'
                          ? 'bg-red-500/15 text-red-400'
                          : 'bg-amber-500/15 text-amber-400'
                      }`}
                    >
                      {oc.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Assigned Collaborating Users ({memberCollaborators.length})
              </p>
              {memberCollaborators.length === 0 ? (
                <p className="text-xs text-zinc-500">No external collaborators assigned yet.</p>
              ) : (
                memberCollaborators.map((mc) => (
                  <div key={mc.user_id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#121215] px-3 py-2 text-xs">
                    <div>
                      <p className="font-semibold text-white">{mc.full_name || mc.email || mc.user_id}</p>
                      <p className="text-[10px] text-zinc-400">
                        {mc.partner_org_name || mc.partner_org_id} · {mc.project_role_name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRemoveCollaborator(mc.user_id)}
                      className="text-[11px] font-semibold text-red-400 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4-Stat Hero Strip */}
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
          <span className="text-[11px] font-mono uppercase text-zinc-500">Custom Statuses</span>
          <p className="font-display text-2xl font-bold text-orange-400 mt-1 tabular-nums">{workflowStatuses.length}</p>
          <p className="text-xs text-zinc-400">Kanban workflow lanes</p>
        </RevealInView>
        <RevealInView delay={0.12} className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-5">
          <span className="text-[11px] font-mono uppercase text-zinc-500">Collaborators</span>
          <p className="font-display text-2xl font-bold text-emerald-400 mt-1 tabular-nums">{project?.collaborators?.length || 0}</p>
          <p className="text-xs text-zinc-400">Cross-org partners</p>
        </RevealInView>
      </div>

      {/* AI Report */}
      {aiReport && (
        <RevealInView className="rounded-[22px] border border-orange-500/30 bg-[#151212] p-6 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="text-orange-400" size={17} /> Gemini 2.5 Intelligence Report
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-orange-500/15 px-3 py-1 text-orange-300">
                Health: {aiReport.overall_health_score}/100
              </span>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-300">
                Completion: {aiReport.completion_percentage}% ({aiReport.completed_tasks}/{aiReport.total_tasks} tasks)
              </span>
              <span className="rounded-full bg-white/[0.08] px-3 py-1 text-zinc-300">
                Files: {aiReport.total_files_submitted || 0} · Pending Checks: {aiReport.pending_checklists || 0}
              </span>
            </div>
          </div>

          <p className="text-xs text-zinc-200 leading-relaxed bg-[#18181c] p-4 rounded-2xl border border-white/[0.06]">
            {aiReport.executive_summary}
          </p>

          {aiReport.recommendations && (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-xs text-emerald-200">
              <span className="font-bold text-emerald-300 block mb-1">AI Recommendations:</span>
              {aiReport.recommendations}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[#18181c] p-4 border border-white/[0.06] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-300 block">
                Voice-to-Text Transcripts ({(aiReport.voice_transcripts || []).length})
              </span>
              {(!aiReport.voice_transcripts || aiReport.voice_transcripts.length === 0) ? (
                <p className="text-xs text-zinc-500">No voice transcripts processed yet.</p>
              ) : (
                <ul className="space-y-1.5 text-xs text-zinc-200">
                  {aiReport.voice_transcripts.map((vt: string, i: number) => (
                    <li key={i} className="rounded-xl bg-[#121215] p-2.5 border border-white/[0.04]">
                      “{vt}”
                    </li>
                  ))}
                </ul>
              )}
              {aiReport.identified_languages && aiReport.identified_languages.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {aiReport.identified_languages.map((lang: string) => (
                    <span key={lang} className="rounded-full bg-orange-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-orange-300">
                      {lang}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-[#18181c] p-4 border border-white/[0.06] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 block">
                Detected Risk Flags ({(aiReport.risk_flags || []).length})
              </span>
              {(!aiReport.risk_flags || aiReport.risk_flags.length === 0) ? (
                <p className="text-xs text-emerald-400">No operational risks flagged.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {aiReport.risk_flags.map((rf: string) => (
                    <span key={rf} className="rounded-full bg-red-500/15 border border-red-500/30 px-2.5 py-1 text-[11px] font-semibold text-red-300">
                      {rf}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </RevealInView>
      )}

      {/* Stages | Project Kanban Board Toggle + Add Stage */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex rounded-full border border-white/[0.07] bg-[#121215] p-1">
            <button
              onClick={() => setViewMode('stages')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium cursor-pointer ${
                viewMode === 'stages' ? 'bg-orange-500/20 text-orange-300' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LayoutGrid size={13} /> Milestones
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium cursor-pointer ${
                viewMode === 'board' ? 'bg-orange-500/20 text-orange-300' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Columns size={13} /> Kanban Board
            </button>
          </div>
        </div>

        {canManageStages && (
          <form onSubmit={handleAddStage} className="flex flex-wrap gap-2">
            <input
              type="text"
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              placeholder="New milestone name…"
              className="rounded-full border border-white/[0.08] bg-[#121215] px-4 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-orange-500"
            />
            <input
              type="date"
              value={newStageDeadline}
              onChange={(e) => setNewStageDeadline(e.target.value)}
              className="rounded-full border border-white/[0.08] bg-[#121215] px-3 py-1.5 text-xs text-zinc-300 outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              disabled={addingStage || !newStageName.trim()}
              className="rounded-full border border-white/[0.08] bg-[#18181c] px-4 py-1.5 text-xs font-semibold text-zinc-200 hover:border-orange-500/40 disabled:opacity-50 cursor-pointer"
            >
              + Add Milestone
            </button>
          </form>
        )}
      </div>

      {boardError && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">{boardError}</div>
      )}

      {viewMode === 'stages' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
          {stages.length === 0 ? (
            <div className="col-span-full rounded-[22px] border border-dashed border-white/[0.08] py-12 text-center text-xs text-zinc-500">
              No milestones yet. Add a custom milestone above or use Lead-to-Plan AI to generate them.
            </div>
          ) : (
            stages.map((stage, idx) => (
              <RevealInView key={stage.stageId} delay={idx * 0.04} className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-4 shadow-xl space-y-3">
                {editingStageId === stage.stageId ? (
                  <div className="space-y-2 pb-2 border-b border-white/[0.06]">
                    <input
                      type="text"
                      value={editStageName}
                      onChange={(e) => setEditStageName(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.1] bg-[#18181c] px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={editStageDeadline}
                        onChange={(e) => setEditStageDeadline(e.target.value)}
                        className="flex-1 rounded-xl border border-white/[0.1] bg-[#18181c] px-2.5 py-1 text-[11px] text-zinc-300 outline-none"
                      />
                      <button onClick={() => void handleSaveStageEdit(stage.stageId)} className="rounded-lg bg-emerald-500/20 p-1.5 text-emerald-300 cursor-pointer">
                        <Check size={13} />
                      </button>
                      <button onClick={() => setEditingStageId(null)} className="rounded-lg bg-zinc-800 p-1.5 text-zinc-400 cursor-pointer">
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500/15 border border-orange-500/30 font-mono text-xs font-bold text-orange-400">
                        {stage.orderIndex || idx + 1}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-display text-sm font-bold text-white truncate">{stage.name}</h3>
                        <p className="text-[10px] font-mono text-zinc-500">
                          {stage.tasks?.length || 0} tasks {stage.deadline ? `· Due ${stage.deadline}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {canManageStages && (
                        <>
                          <button
                            onClick={() => {
                              setEditingStageId(stage.stageId);
                              setEditStageName(stage.name);
                              setEditStageDeadline(stage.deadline || '');
                            }}
                            className="p-1.5 text-zinc-500 hover:text-white cursor-pointer"
                            title="Edit Milestone"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => void handleDeleteStage(stage.stageId)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 cursor-pointer"
                            title="Delete Milestone"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
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
                  </div>
                )}

                <div className="space-y-2">
                  {(!stage.tasks || stage.tasks.length === 0) ? (
                    <div className="rounded-2xl border border-dashed border-white/[0.08] py-6 text-center text-xs text-zinc-500">
                      No tasks in this milestone
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
            ))
          )}
        </div>
      ) : (
        /* Project-Scoped Dynamic Kanban Board */
        <div className="flex gap-4 overflow-x-auto pb-4 items-start">
          {workflowStatuses.map((lane) => {
            const laneTasks = allTasks.filter((t) => t.status === lane.key);
            return (
              <div
                key={lane.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => void handleDropTask(lane.key)}
                className="w-[290px] shrink-0 rounded-[22px] border border-white/[0.07] bg-[#141418] p-3 min-h-[280px]"
              >
                <div className="flex items-center justify-between px-1.5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: lane.color }} />
                    <span className="font-display text-sm font-bold text-white">{lane.label}</span>
                  </div>
                  <span className="rounded-full bg-[#1e1e24] px-2 py-0.5 font-mono text-[11px] text-zinc-400 tabular-nums">
                    {laneTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {laneTasks.map((t: any) => (
                    <motion.div
                      key={t.taskId}
                      layout
                      transition={MARLO_BACK_SPRING}
                      draggable
                      onDragStart={() => setDragTaskId(t.taskId)}
                      onClick={() => openTaskDrawer(t.taskId, projectId)}
                      className="relative rounded-2xl border border-white/[0.06] bg-[#1a1a20] p-3.5 pl-4 cursor-grab active:cursor-grabbing hover:border-orange-500/40"
                    >
                      <span className="absolute left-0 top-3.5 bottom-3.5 w-[3px] rounded-r" style={{ backgroundColor: lane.color }} />
                      <p className="text-xs font-semibold text-white">{t.title}</p>
                      <p className="mt-1.5 text-[10px] font-mono text-zinc-500">
                        {(t.checklist || []).length} checks · {(t.fileRequirements || []).length} file slots
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

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

      {project && (
        <>
          <ProjectEditModal
            isOpen={showEditProject}
            project={project}
            onClose={() => setShowEditProject(false)}
            onSuccess={() => {
              setShowEditProject(false);
              void load();
            }}
          />
          <WorkflowStatusEditor
            isOpen={showStatusEditor}
            title={`Workflow Statuses: ${project.title}`}
            initialStatuses={workflowStatuses}
            onClose={() => setShowStatusEditor(false)}
            onSave={handleSaveStatuses}
          />
        </>
      )}
    </div>
  );
}
