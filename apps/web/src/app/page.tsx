'use client';

import React, { useState } from 'react';
import { PERMISSION_FLAGS } from '@nexora/shared-types';
import { CheckCircle2, AlertTriangle, ArrowRight, Sparkles, Database, Activity } from 'lucide-react';
import { NexoraMark } from '../components/svg/NexoraMark';
import { DynamicIslandNav, NavTabId } from '../components/dashboard/DynamicIslandNav';
import { AuthSession, apiRequest, graphqlRequest } from '../services/nexoraClient';

interface ProjectItem {
  projectId: string;
  orgId: string;
  title: string;
  status: string;
  stages: Array<{
    stageId: string;
    name: string;
    orderIndex: number;
    status: string;
    tasks: Array<{ taskId: string; title: string; status: string; efficiencyScore?: number | null }>;
  }>;
}

export default function CommandCenterPage() {
  const [activeTab, setActiveTab] = useState<NavTabId>('auth');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Auth form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgInitials, setOrgInitials] = useState('SOL');
  const [otp, setOtp] = useState('');

  // Projects & AI state
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [aiPrompt, setAiPrompt] = useState('Deploy 50kW solar rooftop with transit dispatch and safety verification');
  const [aiPreview, setAiPreview] = useState<{
    suggestedTitle: string;
    summary: string;
    stages: Array<{ name: string; orderIndex: number; recommendedRole: string }>;
  } | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // Dynamic RBAC Flags state
  const [roleName, setRoleName] = useState('Stage Supervisor');
  const [roleFlags, setRoleFlags] = useState<Record<string, boolean>>({
    [PERMISSION_FLAGS.STAGE_MANAGE_ALLOCATED_ONLY]: true,
    [PERMISSION_FLAGS.TASK_CREATE_ASSIGN]: true,
    [PERMISSION_FLAGS.TASK_VERIFY_APPROVE]: true,
    [PERMISSION_FLAGS.AI_VIEW_EFFICIENCY_REPORTS]: true,
  });

  // Cross-org & Evidence state
  const [partnerOrgId, setPartnerOrgId] = useState('');
  const [partnerUserId, setPartnerUserId] = useState('');
  const [partnerRole, setPartnerRole] = useState('Transit Partner');
  const [evidenceTaskId, setEvidenceTaskId] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('Installed 12 panels, roof sealed, awaiting inspection');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  const notify = (kind: 'ok' | 'err', text: string) => setStatusMsg({ kind, text });

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await apiRequest<{ userId: string; org: { orgId: string; shardId: number } | null; message: string }>(
        '/api/v1/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ email, password, fullName, orgName, orgInitials }),
        },
      );
      notify('ok', `Registered ${res.userId}${res.org ? ` • Org ${res.org.orgId} (Shard ${res.org.shardId})` : ''}`);
    } catch (err) {
      notify('err', (err as Error).message);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await apiRequest<AuthSession>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setSession(res);
      notify('ok', `Signed in to ${res.activeOrg.org_id} (Shard ${res.activeOrg.shard_id})`);
      await loadProjects(res.accessToken);
    } catch (err) {
      notify('err', (err as Error).message);
    }
  }

  async function handleVerifyOtp() {
    try {
      await apiRequest('/api/v1/auth/verify-email', { method: 'POST', body: JSON.stringify({ email, otp }) });
      notify('ok', 'Email verified successfully.');
    } catch (err) {
      notify('err', (err as Error).message);
    }
  }

  async function loadProjects(token = session?.accessToken) {
    if (!token) return;
    try {
      const data = await graphqlRequest<{ projects: ProjectItem[] }>(
        `query { projects { projectId orgId title status } }`,
        {},
        token,
      );
      setProjects(data.projects);
      if (data.projects[0] && !selectedProjectId) {
        setSelectedProjectId(data.projects[0].projectId);
      }
    } catch (err) {
      notify('err', (err as Error).message);
    }
  }

  async function handleAiPlan() {
    if (!session) return notify('err', 'Sign in first.');
    try {
      const data = await graphqlRequest<{
        generateAiProjectPlan: {
          suggestedTitle: string;
          summary: string;
          stages: Array<{ name: string; orderIndex: number; recommendedRole: string }>;
        };
      }>(
        `mutation($prompt: String!) { generateAiProjectPlan(prompt: $prompt) { suggestedTitle summary stages { name orderIndex recommendedRole } } }`,
        { prompt: aiPrompt },
        session.accessToken,
      );
      setAiPreview(data.generateAiProjectPlan);
      notify('ok', 'AI blueprint generated — review stages below and publish.');
    } catch (err) {
      notify('err', (err as Error).message);
    }
  }

  async function handlePublishAiProject() {
    if (!session || !aiPreview) return;
    try {
      const created = await graphqlRequest<{ createProject: ProjectItem }>(
        `mutation($title: String!, $desc: String) { createProject(title: $title, description: $desc) { projectId orgId title status } }`,
        { title: aiPreview.suggestedTitle, desc: aiPreview.summary },
        session.accessToken,
      );
      const pid = created.createProject.projectId;
      for (const st of aiPreview.stages) {
        await graphqlRequest(
          `mutation($pid: ID!, $name: String!, $idx: Int!) { createStage(projectId: $pid, name: $name, orderIndex: $idx) { stageId } }`,
          { pid, name: st.name, idx: st.orderIndex },
          session.accessToken,
        );
      }
      setSelectedProjectId(pid);
      await loadProjects();
      notify('ok', `Created project ${pid} with ${aiPreview.stages.length} stages.`);
    } catch (err) {
      notify('err', (err as Error).message);
    }
  }

  async function handleSaveRole(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return notify('err', 'Sign in first.');
    try {
      const res = await apiRequest<{ roleId: string }>(
        '/api/v1/roles',
        { method: 'POST', body: JSON.stringify({ name: roleName, flags: roleFlags }) },
        session.accessToken,
      );
      notify('ok', `Saved dynamic role ${res.roleId}.`);
    } catch (err) {
      notify('err', (err as Error).message);
    }
  }

  async function handleEvidenceUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !selectedProjectId || !evidenceTaskId) {
      return notify('err', 'Sign in and provide Project ID & Task ID.');
    }
    try {
      const form = new FormData();
      form.append('textNote', evidenceNote);
      if (evidenceFile) form.append('file', evidenceFile);
      const res = await apiRequest<{ aiQueued: boolean; file?: { fileId: string } }>(
        `/api/v1/projects/${selectedProjectId}/tasks/${evidenceTaskId}/evidence`,
        { method: 'POST', body: form },
        session.accessToken,
      );
      notify('ok', `Evidence accepted${res.file?.fileId ? ` (${res.file.fileId})` : ''} • AI Queued: ${res.aiQueued}`);
    } catch (err) {
      notify('err', (err as Error).message);
    }
  }

  return (
    <div className="min-h-screen bg-[#080a0f] text-slate-100">
      <header className="border-b border-white/[0.08] bg-[#0e121a]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <NexoraMark className="h-8 w-8" />
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-slate-100">Nexora Field OS</h1>
              <p className="text-xs text-slate-400">Multi-Tenant • 3-Shard Routed • AI Operations Governance</p>
            </div>
          </div>

          <DynamicIslandNav activeTab={activeTab} onSelect={setActiveTab} />

          <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
            {session ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-300">
                <Database className="h-3.5 w-3.5" />
                <span>{session.activeOrg.org_id}</span>
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[11px]">S{session.activeOrg.shard_id}</span>
              </div>
            ) : (
              <span className="rounded-lg border border-white/10 bg-[#131924] px-3 py-1.5 text-slate-400">
                Not Signed In
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {statusMsg && (
          <div
            role="status"
            className={`mb-6 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${
              statusMsg.kind === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
            }`}
          >
            {statusMsg.kind === 'ok' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {activeTab === 'auth' && (
          <section className="grid gap-6 lg:grid-cols-2">
            <form onSubmit={handleRegister} className="rounded-2xl border border-white/[0.08] bg-[#0e121a] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold">Create Organization &amp; Admin Account</h2>
                <span className="font-mono text-xs text-emerald-400">0-C / D-O / P-Z Sharded</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full Name"
                  className="rounded-lg border border-white/10 bg-[#080a0f] px-3 py-2 text-sm text-slate-100"
                  required
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Admin Email"
                  className="rounded-lg border border-white/10 bg-[#080a0f] px-3 py-2 text-sm text-slate-100"
                  required
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="rounded-lg border border-white/10 bg-[#080a0f] px-3 py-2 text-sm text-slate-100"
                  required
                />
                <input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Organization Name"
                  className="rounded-lg border border-white/10 bg-[#080a0f] px-3 py-2 text-sm text-slate-100"
                />
                <input
                  value={orgInitials}
                  maxLength={3}
                  onChange={(e) => setOrgInitials(e.target.value.toUpperCase())}
                  placeholder="3-Letter Prefix (SOL)"
                  className="font-mono rounded-lg border border-white/10 bg-[#080a0f] px-3 py-2 text-sm uppercase text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Register &amp; Assign Shard <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="space-y-6">
              <form onSubmit={handleLogin} className="rounded-2xl border border-white/[0.08] bg-[#0e121a] p-6 space-y-4">
                <h2 className="font-display text-base font-semibold">Sign In to Organization</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="rounded-lg border border-white/10 bg-[#080a0f] px-3 py-2 text-sm text-slate-100"
                    required
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="rounded-lg border border-white/10 bg-[#080a0f] px-3 py-2 text-sm text-slate-100"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg border border-white/15 bg-[#131924] px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-white/10"
                >
                  Login via Identity Service
                </button>
              </form>

              <div className="rounded-2xl border border-white/[0.08] bg-[#0e121a] p-6 space-y-3">
                <h3 className="text-sm font-semibold text-slate-200">Verify Email OTP (from Worker logs / Gmail)</h3>
                <div className="flex gap-3">
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.toUpperCase())}
                    placeholder="6-Char OTP"
                    className="font-mono flex-1 rounded-lg border border-white/10 bg-[#080a0f] px-3 py-2 text-sm uppercase text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
                  >
                    Verify
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'projects' && (
          <section className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3 rounded-2xl border border-white/[0.08] bg-[#0e121a] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" /> AI Lead-to-Plan Architect
                </h2>
                <span className="text-xs text-slate-400">GraphQL → gRPC AI Governance</span>
              </div>
              <textarea
                rows={3}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#080a0f] p-3 text-sm text-slate-100"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleAiPlan}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  Generate Stage Blueprint
                </button>
                {aiPreview && (
                  <button
                    type="button"
                    onClick={handlePublishAiProject}
                    className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/25"
                  >
                    Approve &amp; Create Project
                  </button>
                )}
              </div>

              {aiPreview && (
                <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-[#080a0f] p-4">
                  <div className="font-display text-sm font-semibold text-slate-100">{aiPreview.suggestedTitle}</div>
                  <p className="text-xs text-slate-400">{aiPreview.summary}</p>
                  <div className="mt-3 space-y-1.5">
                    {aiPreview.stages.map((st) => (
                      <div key={st.orderIndex} className="flex items-center justify-between rounded-lg bg-[#131924] px-3 py-2 text-xs">
                        <span className="font-medium text-slate-200">
                          {st.orderIndex}. {st.name}
                        </span>
                        <span className="font-mono text-amber-400">{st.recommendedRole}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 rounded-2xl border border-white/[0.08] bg-[#0e121a] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-400" /> Active Projects
                </h2>
                <button
                  type="button"
                  onClick={() => loadProjects()}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  Refresh
                </button>
              </div>
              <div className="space-y-2">
                {projects.length === 0 ? (
                  <p className="text-xs text-slate-400">No projects loaded yet. Sign in and create or refresh.</p>
                ) : (
                  projects.map((p) => (
                    <button
                      key={p.projectId}
                      type="button"
                      onClick={() => setSelectedProjectId(p.projectId)}
                      className={`w-full rounded-xl border p-3 text-left transition-colors ${
                        selectedProjectId === p.projectId
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : 'border-white/[0.08] bg-[#080a0f] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                        <span>{p.projectId}</span>
                        <span className="text-emerald-400">{p.status}</span>
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-100">{p.title}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'roles' && (
          <form onSubmit={handleSaveRole} className="rounded-2xl border border-white/[0.08] bg-[#0e121a] p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-display text-base font-semibold">Dynamic Role &amp; Permission Flag Builder</h2>
              <input
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="Role Name (e.g., Volunteer, Reporter)"
                className="rounded-lg border border-white/10 bg-[#080a0f] px-3 py-2 text-sm text-slate-100"
              />
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {Object.values(PERMISSION_FLAGS).map((flag) => (
                <label
                  key={flag}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.08] bg-[#080a0f] px-3.5 py-2.5 text-xs hover:border-emerald-500/40"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(roleFlags[flag])}
                    onChange={(e) => setRoleFlags((prev) => ({ ...prev, [flag]: e.target.checked }))}
                    className="h-4 w-4 accent-emerald-500"
                  />
                  <span className="font-mono text-slate-200">{flag}</span>
                </label>
              ))}
            </div>

            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Save Role Flags to Org Shard
            </button>
          </form>
        )}

        {activeTab === 'evidence' && (
          <section className="grid gap-6 lg:grid-cols-2">
            <form onSubmit={handleEvidenceUpload} className="rounded-2xl border border-white/[0.08] bg-[#0e121a] p-6 space-y-4">
              <h2 className="font-display text-base font-semibold">Multimodal Evidence Upload (MinIO + AI Queue)</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  placeholder="Project ID (PRJ-...)"
                  className="font-mono rounded-lg border border-white/10 bg-[#080a0f] px-3 py-2 text-sm text-slate-100"
                />
                <input
                  value={evidenceTaskId}
                  onChange={(e) => setEvidenceTaskId(e.target.value)}
                  placeholder="Task ID (TSK-...)"
                  className="font-mono rounded-lg border border-white/10 bg-[#080a0f] px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <textarea
                rows={3}
                value={evidenceNote}
                onChange={(e) => setEvidenceNote(e.target.value)}
                placeholder="Field / Transit update note..."
                className="w-full rounded-lg border border-white/10 bg-[#080a0f] p-3 text-sm text-slate-100"
              />
              <input
                type="file"
                accept="image/*,video/*,audio/*,.pdf"
                onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[#131924] file:px-3 file:py-2 file:text-slate-200"
              />
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Upload &amp; Run AI Efficiency Check
              </button>
            </form>

            <div className="rounded-2xl border border-white/[0.08] bg-[#0e121a] p-6 space-y-4">
              <h2 className="font-display text-base font-semibold">Cross-Organization Partner Allocation</h2>
              <p className="text-xs text-slate-400">
                Invite partner org users onto specific project stages without granting org-wide permissions.
              </p>
              <div className="grid gap-3">
                <input
                  value={partnerOrgId}
                  onChange={(e) => setPartnerOrgId(e.target.value.toUpperCase())}
                  placeholder="Partner Org ID (e.g., LOG-26-D9K2A)"
                  className="font-mono rounded-lg border border-white/10 bg-[#080a0f] px-3 py-2 text-sm text-slate-100"
                />
                <input
                  value={partnerUserId}
                  onChange={(e) => setPartnerUserId(e.target.value)}
                  placeholder="Partner User ID (USR-...)"
                  className="font-mono rounded-lg border border-white/10 bg-[#080a0f] px-3 py-2 text-sm text-slate-100"
                />
                <input
                  value={partnerRole}
                  onChange={(e) => setPartnerRole(e.target.value)}
                  placeholder="Project Role (e.g., Transit Partner)"
                  className="rounded-lg border border-white/10 bg-[#080a0f] px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!session || !selectedProjectId) return notify('err', 'Sign in and select a project.');
                  try {
                    await graphqlRequest(
                      `mutation($pid: ID!, $porg: String!, $uid: String!, $role: String!, $stages: [String!]!) {
                        invitePartnerOrg(projectId: $pid, partnerOrgId: $porg, userId: $uid, roleName: $role, allocatedStageIds: $stages)
                      }`,
                      { pid: selectedProjectId, porg: partnerOrgId, uid: partnerUserId, role: partnerRole, stages: [] },
                      session.accessToken,
                    );
                    notify('ok', `Invited ${partnerUserId} (${partnerOrgId}) onto ${selectedProjectId}.`);
                  } catch (err) {
                    notify('err', (err as Error).message);
                  }
                }}
                className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-500"
              >
                Grant Stage-Scoped Cross-Org Access
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
