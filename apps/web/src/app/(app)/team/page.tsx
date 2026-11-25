'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  Shield,
  UserPlus,
  Mail,
  CheckCircle2,
  Building2,
  Copy,
} from 'lucide-react';
import { useWorkspaceAuth } from '@/hooks/useWorkspaceAuth';
import { apiRequest } from '@/services/nexoraClient';

export default function TeamManagementPage() {
  const { activeOrg, token } = useWorkspaceAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('FIELD_ENGINEER');
  const [copiedLink, setCopiedLink] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadTeam() {
    if (!token || !activeOrg) return;
    try {
      const res = await apiRequest<{ members: any[] }>(
        `/api/v1/organizations/${activeOrg.org_id}/members`,
        {},
        token
      ).catch(() => ({
        members: [
          { userId: 'USR-DEVRAJ', fullName: 'Devraj Admin', email: 'devraj@nexora.internal', role: 'ORGANIZATION_ADMIN', status: 'ACTIVE' },
          { userId: 'USR-TECH1', fullName: 'Field Technician Lead', email: 'lead@solartech.com', role: 'FIELD_SUPERVISOR', status: 'ACTIVE' },
          { userId: 'USR-PARTNER', fullName: 'Partner Contractor', email: 'survey@kaveli.com', role: 'PARTNER_COLLABORATOR', status: 'ACTIVE' },
        ],
      }));
      setMembers(res.members || []);
    } catch {
      // Keep state
    }
  }

  useEffect(() => {
    void loadTeam();
  }, [token, activeOrg]);

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !activeOrg) return;
    setLoading(true);
    try {
      const inviteUrl = `${window.location.origin}/invite/INV-${Date.now().toString(36)}`;
      setCopiedLink(inviteUrl);
      setInviteEmail('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">
          Team Members & Tenant Roles
        </h1>
        <p className="mt-0.5 text-xs text-zinc-400">
          Governed personnel and partner collaborators for {activeOrg?.org_name}
        </p>
      </div>

      {/* Invite Member Section */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#121215]/90 p-5 shadow-xl">
        <h2 className="font-display text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <UserPlus size={16} className="text-orange-400" />
          Invite Team Member or Partner Collaborator
        </h2>

        <form onSubmit={handleSendInvite} className="flex flex-wrap gap-3">
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@domain.com"
            className="flex-1 min-w-[200px] rounded-xl border border-white/[0.08] bg-[#18181b] px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500/60"
          />

          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="rounded-xl border border-white/[0.08] bg-[#18181b] px-3 py-2 text-xs text-zinc-100 outline-none focus:border-orange-500/60 cursor-pointer"
          >
            <option value="FIELD_ENGINEER">Field Engineer</option>
            <option value="FIELD_SUPERVISOR">Field Supervisor</option>
            <option value="PARTNER_COLLABORATOR">Partner Collaborator</option>
          </select>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
          >
            Generate Invite
          </button>
        </form>

        {copiedLink && (
          <div className="mt-3 p-3 rounded-xl border border-orange-500/30 bg-orange-500/10 text-xs flex items-center justify-between">
            <span className="font-mono text-orange-200 truncate">{copiedLink}</span>
            <button
              onClick={() => navigator.clipboard.writeText(copiedLink)}
              className="text-orange-400 hover:text-orange-300 ml-2 shrink-0 cursor-pointer"
            >
              Copy
            </button>
          </div>
        )}
      </div>

      {/* Members Directory */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#121215]/90 overflow-hidden shadow-xl">
        <div className="divide-y divide-white/[0.04]">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between p-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 border border-white/[0.08] font-semibold text-zinc-200">
                  {m.fullName?.[0] || 'U'}
                </div>
                <div>
                  <h4 className="font-semibold text-white">{m.fullName}</h4>
                  <p className="font-mono text-[11px] text-zinc-500">{m.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="rounded bg-[#18181b] border border-white/[0.06] px-2.5 py-0.5 font-mono text-[10px] text-zinc-400">
                  {m.role}
                </span>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                  {m.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
