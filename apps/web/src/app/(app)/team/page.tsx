'use client';

import React, { useEffect, useState } from 'react';
import { Shield, UserPlus, CheckCircle2, Plus, Copy, Sliders } from 'lucide-react';
import { PERMISSION_FLAGS } from '@nexora/shared-types';
import { useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';
import { useAuthStore, WorkflowStatusDef } from '@/stores/useAuthStore';
import { apiRequest } from '@/services/nexoraClient';
import { WorkflowStatusEditor } from '@/components/modals/WorkflowStatusEditor';
import { RevealInView } from '@/components/ui/motion';

interface MemberRow {
  userId: string;
  email: string | null;
  fullName: string | null;
  status: string;
  roleIds: string[];
  roleNames: string[];
}

interface RoleRow {
  role_id: string;
  name: string;
  flags: Record<string, boolean>;
  is_system: boolean;
}

const ALL_FLAGS = Object.values(PERMISSION_FLAGS);

export default function TeamManagementPage() {
  const { activeOrg, token } = useWorkspaceAuth();
  const { permissions, defaultWorkflowStatuses, setContext, roleName } = useAuthStore();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [showStatusEditor, setShowStatusEditor] = useState(false);

  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleFlags, setNewRoleFlags] = useState<Record<string, boolean>>({
    [PERMISSION_FLAGS.TASK_EXECUTE_OWN]: true,
    [PERMISSION_FLAGS.TASK_UPLOAD_EVIDENCE]: true,
    [PERMISSION_FLAGS.STAGE_VIEW_ONLY]: true,
  });
  const [savingRole, setSavingRole] = useState(false);
  const [teamError, setTeamError] = useState('');

  async function loadTeam() {
    if (!token || !activeOrg) return;
    try {
      const [mRes, rRes] = await Promise.all([
        apiRequest<{ members: MemberRow[] }>('/api/v1/org/members', {}, token),
        apiRequest<{ roles: RoleRow[] }>('/api/v1/roles', {}, token),
      ]);
      setMembers(mRes.members || []);
      setRoles(rRes.roles || []);
      if (rRes.roles?.[0] && !selectedRoleId) setSelectedRoleId(rRes.roles[0].role_id);
    } catch (err) {
      console.error('Failed to load team/roles:', err);
    }
  }

  useEffect(() => {
    void loadTeam();
  }, [token, activeOrg]);

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !inviteEmail.trim()) return;
    setLoadingInvite(true);
    setInviteUrl('');
    try {
      const roleObj = roles.find((r) => r.role_id === selectedRoleId);
      const res = await apiRequest<{ inviteUrl: string }>(
        '/api/v1/auth/invites',
        {
          method: 'POST',
          body: JSON.stringify({
            email: inviteEmail.trim(),
            roleId: roleObj?.role_id,
            roleName: roleObj?.name || 'Member',
          }),
        },
        token
      );
      setInviteUrl(res.inviteUrl);
      setInviteEmail('');
    } catch (err) {
      setTeamError((err as Error).message || 'Failed to send invite');
    } finally {
      setLoadingInvite(false);
    }
  }

  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !newRoleName.trim()) return;
    setSavingRole(true);
    try {
      await apiRequest(
        '/api/v1/roles',
        { method: 'POST', body: JSON.stringify({ name: newRoleName.trim(), flags: newRoleFlags }) },
        token
      );
      setNewRoleName('');
      await loadTeam();
    } catch (err) {
      setTeamError((err as Error).message);
    } finally {
      setSavingRole(false);
    }
  }

  async function handleAssignRole(userId: string, roleId: string) {
    if (!token || !roleId) return;
    try {
      const target = members.find((m) => m.userId === userId);
      const existing = target?.roleIds || [];
      const nextRoles = existing.includes(roleId)
        ? existing.length > 1
          ? existing.filter((r) => r !== roleId)
          : existing
        : [...existing, roleId];
      await apiRequest(
        `/api/v1/org/members/${userId}/roles`,
        { method: 'PUT', body: JSON.stringify({ roleIds: nextRoles }) },
        token
      );
      await loadTeam();
    } catch (err) {
      setTeamError((err as Error).message);
    }
  }

  async function handleSaveOrgStatuses(statuses: WorkflowStatusDef[]) {
    if (!token) return;
    await apiRequest('/api/v1/org/workflow-statuses', { method: 'PUT', body: JSON.stringify({ statuses }) }, token);
    setContext(roleName, permissions, statuses);
  }

  return (
    <div className="space-y-5">
      {teamError && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
          <span>{teamError}</span>
          <button type="button" onClick={() => setTeamError('')} className="hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">Team & Dynamic RBAC</h1>
          <p className="mt-0.5 text-xs text-zinc-400">
            Invite field personnel via Gmail SMTP, define custom permission roles, and customize org workflow statuses
          </p>
        </div>

        {permissions[PERMISSION_FLAGS.ORG_MANAGE_SETTINGS] && (
          <button
            onClick={() => setShowStatusEditor(true)}
            className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#121215] px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-orange-500/40 cursor-pointer"
          >
            <Sliders size={14} className="text-orange-400" /> Default Workflow Statuses
          </button>
        )}
      </div>

      {/* Invite Member Card */}
      <RevealInView className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-5 shadow-xl">
        <h2 className="font-display text-sm font-bold text-white mb-3 flex items-center gap-2">
          <UserPlus size={16} className="text-orange-400" />
          Invite Team Member (Sends Real Email + Onboarding Link)
        </h2>

        <form onSubmit={handleSendInvite} className="flex flex-wrap gap-3">
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="engineer@company.com"
            className="flex-1 min-w-[220px] rounded-xl border border-white/[0.08] bg-[#18181c] px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500/60"
          />

          <select
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            className="rounded-xl border border-white/[0.08] bg-[#18181c] px-3 py-2 text-xs text-zinc-100 outline-none focus:border-orange-500/60 cursor-pointer"
          >
            {roles.map((r) => (
              <option key={r.role_id} value={r.role_id}>
                {r.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={loadingInvite}
            className="rounded-full bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 disabled:opacity-50 cursor-pointer"
          >
            {loadingInvite ? 'Sending…' : 'Send Invite'}
          </button>
        </form>

        {inviteUrl && (
          <div className="mt-3 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs flex items-center justify-between gap-2">
            <span className="font-mono text-emerald-300 truncate">
              <CheckCircle2 size={13} className="inline mr-1.5" />
              Invite sent! Link: {inviteUrl}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(inviteUrl)}
              className="flex items-center gap-1 text-orange-300 hover:text-orange-200 shrink-0 cursor-pointer"
            >
              <Copy size={12} /> Copy
            </button>
          </div>
        )}
      </RevealInView>

      {/* Members Directory with Multi-Role Assignment */}
      <RevealInView delay={0.05} className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-white">Organization Members ({members.length})</h2>
        </div>
        <div className="divide-y divide-white/[0.05]">
          {members.map((m) => (
            <div key={m.userId} className="flex flex-wrap items-center justify-between gap-3 p-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1c1c22] border border-white/[0.08] font-semibold text-zinc-200">
                  {m.fullName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h4 className="font-semibold text-white">{m.fullName || m.userId}</h4>
                  <p className="font-mono text-[11px] text-zinc-500">{m.email}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {roles.map((r) => {
                  const has = m.roleIds.includes(r.role_id);
                  return (
                    <button
                      key={r.role_id}
                      onClick={() => void handleAssignRole(m.userId, r.role_id)}
                      className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] border transition-colors cursor-pointer ${
                        has
                          ? 'border-orange-500/40 bg-orange-500/15 text-orange-300 font-semibold'
                          : 'border-white/[0.06] bg-[#18181c] text-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      {r.name}
                    </button>
                  );
                })}
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                  {m.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </RevealInView>

      {/* Custom Role Builder */}
      <RevealInView delay={0.1} className="rounded-[22px] border border-white/[0.07] bg-[#121215]/95 p-5 shadow-xl space-y-4">
        <h2 className="font-display text-sm font-bold text-white flex items-center gap-2">
          <Shield size={16} className="text-orange-400" />
          Dynamic Role & Permission Flag Builder
        </h2>

        <form onSubmit={handleCreateRole} className="space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              required
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="Role Name (e.g. Site Supervisor, Quality Auditor)"
              className="flex-1 rounded-xl border border-white/[0.08] bg-[#18181c] px-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              disabled={savingRole || !newRoleName.trim()}
              className="flex items-center gap-1 rounded-full bg-[#1e1e24] border border-white/[0.1] hover:border-orange-500/50 px-4 py-2 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
            >
              <Plus size={13} /> Save Role
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ALL_FLAGS.map((flag) => {
              const active = Boolean(newRoleFlags[flag]);
              return (
                <button
                  key={flag}
                  type="button"
                  onClick={() => setNewRoleFlags((prev) => ({ ...prev, [flag]: !prev[flag] }))}
                  className={`rounded-full px-2.5 py-1 font-mono text-[10px] border transition-colors cursor-pointer ${
                    active
                      ? 'border-orange-500/40 bg-orange-500/15 text-orange-300'
                      : 'border-white/[0.06] bg-[#18181c] text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {flag}
                </button>
              );
            })}
          </div>
        </form>
      </RevealInView>

      <WorkflowStatusEditor
        isOpen={showStatusEditor}
        title="Organization Default Workflow Statuses"
        initialStatuses={defaultWorkflowStatuses}
        onClose={() => setShowStatusEditor(false)}
        onSave={handleSaveOrgStatuses}
      />
    </div>
  );
}
