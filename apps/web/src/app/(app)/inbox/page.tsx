"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Inbox as InboxIcon,
  Loader2,
  Users,
  XCircle,
} from "lucide-react";
import { useWorkspaceAuth } from "@/hooks/useWorkspaceAuth";
import { useDrawerStore } from "@/stores/useDrawerStore";
import { RevealInView } from "@/components/ui/motion";

interface InboxTask {
  task_id: string;
  project_id: string;
  title: string;
  status: string;
  deadline?: string | null;
  project_title?: string;
}

interface InboxClaim {
  claim_id: string;
  project_id: string;
  project_title?: string;
  title: string;
  amount_paise: number;
  status: string;
}

interface IncomingCollab {
  collab_id: string;
  project_id: string;
  project_title?: string;
  owner_org_id: string;
  owner_org_name?: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  notes?: string | null;
  created_at: string;
}

interface OrgMemberOption {
  userId: string;
  fullName: string | null;
  email: string | null;
}

export default function InboxPage() {
  const { token, activeOrg } = useWorkspaceAuth();
  const { openTaskDrawer } = useDrawerStore();
  const [pendingVerifications, setPendingVerifications] = useState<InboxTask[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<InboxTask[]>([]);
  const [pendingClaims, setPendingClaims] = useState<InboxClaim[]>([]);
  const [incomingCollabs, setIncomingCollabs] = useState<IncomingCollab[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrgMemberOption[]>([]);
  const [selectedByCollab, setSelectedByCollab] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "x-org-id": activeOrg?.org_id || "",
    }),
    [token, activeOrg?.org_id]
  );

  const loadInbox = useCallback(async () => {
    if (!token || !activeOrg?.org_id) return;
    setLoading(true);
    try {
      const [res, colRes, memRes] = await Promise.all([
        fetch("/api/v1/inbox", { headers }),
        fetch("/api/v1/collaborations/incoming", { headers }),
        fetch("/api/v1/org/members", { headers }),
      ]);
      if (res.ok) {
        const data = await res.json();
        setPendingVerifications(data.pendingVerifications || []);
        setOverdueTasks(data.overdueTasks || []);
        setPendingClaims(data.pendingClaims || []);
      }
      if (colRes.ok) {
        const cData = await colRes.json();
        setIncomingCollabs(cData.incoming || []);
      }
      if (memRes.ok) {
        const mData = await memRes.json();
        setOrgMembers(mData.members || []);
      }
    } finally {
      setLoading(false);
    }
  }, [token, activeOrg?.org_id, headers]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  async function handleTaskTransition(task: InboxTask, status: string) {
    const res = await fetch(`/api/v1/projects/${task.project_id}/tasks/${task.task_id}/status`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await loadInbox();
  }

  async function handleClaimReview(claimId: string, status: "APPROVED" | "REJECTED") {
    const res = await fetch(`/api/v1/finance/reimbursements/${claimId}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await loadInbox();
  }

  function toggleMemberForCollab(collabId: string, userId: string) {
    setSelectedByCollab((prev) => {
      const curr = prev[collabId] || [];
      return {
        ...prev,
        [collabId]: curr.includes(userId) ? curr.filter((x) => x !== userId) : [...curr, userId],
      };
    });
  }

  async function handleCollabRespond(collab: IncomingCollab, status: "ACCEPTED" | "REJECTED") {
    const assignedUserIds = selectedByCollab[collab.collab_id] || [];
    const res = await fetch(`/api/v1/collaborations/${collab.collab_id}/respond`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        assignedUserIds,
        roleName: "Partner Specialist",
      }),
    });
    if (res.ok) await loadInbox();
  }

  async function handleAssignAfterAccept(collab: IncomingCollab) {
    const userIds = selectedByCollab[collab.collab_id] || [];
    if (userIds.length === 0) return;
    const res = await fetch(`/api/v1/projects/${collab.project_id}/collaborators/assign`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerOrgId: activeOrg?.org_id,
        userIds,
        roleName: "Partner Specialist",
      }),
    });
    if (res.ok) {
      setSelectedByCollab((prev) => ({ ...prev, [collab.collab_id]: [] }));
      await loadInbox();
    }
  }

  return (
    <div className="space-y-6">
      <RevealInView>
        <div className="glass-card rounded-3xl p-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 text-xs font-semibold mb-2">
            <InboxIcon className="w-3.5 h-3.5" />
            Action Queue & Cross-Org Invitations
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Verification, SLA & Collaboration Inbox</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Accept cross-organization project invitations, assign team members, verify tasks, and clear claims.
          </p>
        </div>
      </RevealInView>

      {loading ? (
        <div className="glass-card rounded-3xl p-12 flex items-center justify-center gap-2 text-sm text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading inbox...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Incoming Cross-Org Project Invitations */}
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-500" />
              Cross-Organization Project Invitations ({incomingCollabs.length})
            </h2>
            {incomingCollabs.length === 0 ? (
              <p className="text-xs text-zinc-500">
                No incoming project collaboration requests for {activeOrg?.org_name}.
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {incomingCollabs.map((c) => {
                  const chosen = selectedByCollab[c.collab_id] || [];
                  return (
                    <div key={c.collab_id} className="glass-subtle rounded-2xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link
                            href={`/projects/${c.project_id}`}
                            className="text-sm font-bold hover:underline"
                          >
                            {c.project_title || c.project_id}
                          </Link>
                          <p className="text-xs text-zinc-500">
                            Invited by {c.owner_org_name || c.owner_org_id}
                            {c.notes ? ` · ${c.notes}` : ""}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === "ACCEPTED"
                              ? "bg-emerald-100 text-emerald-700"
                              : c.status === "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>

                      {c.status !== "REJECTED" && orgMembers.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-semibold text-zinc-500 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {c.status === "PENDING"
                              ? "Assign team members while accepting:"
                              : "Add more team members to this project:"}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {orgMembers.map((m) => {
                              const picked = chosen.includes(m.userId);
                              return (
                                <button
                                  key={m.userId}
                                  type="button"
                                  onClick={() => toggleMemberForCollab(c.collab_id, m.userId)}
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer transition ${
                                    picked
                                      ? "bg-orange-500 text-white border-orange-500"
                                      : "glass-card text-zinc-600"
                                  }`}
                                >
                                  {m.fullName || m.email}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {c.status === "PENDING" ? (
                          <>
                            <button
                              onClick={() => handleCollabRespond(c, "ACCEPTED")}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Accept & Assign Team
                            </button>
                            <button
                              onClick={() => handleCollabRespond(c, "REJECTED")}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Decline
                            </button>
                          </>
                        ) : (
                          c.status === "ACCEPTED" && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAssignAfterAccept(c)}
                                disabled={chosen.length === 0}
                                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#ff3b30] to-[#f97316] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                              >
                                Assign Selected ({chosen.length})
                              </button>
                              <Link
                                href={`/projects/${c.project_id}`}
                                className="px-3 py-1.5 rounded-xl glass-card text-xs font-semibold"
                              >
                                Open Project
                              </Link>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pending QA Verifications */}
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-bold">
                Pending Verifications ({pendingVerifications.length})
              </h2>
              {pendingVerifications.length === 0 ? (
                <p className="text-xs text-zinc-500">No tasks waiting for QA sign-off.</p>
              ) : (
                pendingVerifications.map((t) => (
                  <div key={t.task_id} className="glass-subtle rounded-xl p-3 space-y-2">
                    <button
                      onClick={() => openTaskDrawer(t.task_id, t.project_id)}
                      className="text-xs font-bold hover:underline text-left block"
                    >
                      {t.title}
                    </button>
                    <p className="text-[11px] text-zinc-500">
                      {t.project_title || t.project_id} · {t.status}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleTaskTransition(t, "VERIFIED")}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleTaskTransition(t, "IN_PROGRESS")}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 text-white text-[11px] font-semibold"
                      >
                        <XCircle className="w-3 h-3" />
                        Return
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Overdue SLA Alerts */}
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-bold flex items-center gap-1.5 text-red-600">
                <AlertCircle className="w-4 h-4" />
                Overdue SLA Alerts ({overdueTasks.length})
              </h2>
              {overdueTasks.length === 0 ? (
                <p className="text-xs text-zinc-500">All tasks are within SLA deadlines.</p>
              ) : (
                overdueTasks.map((t) => (
                  <button
                    key={t.task_id}
                    onClick={() => openTaskDrawer(t.task_id, t.project_id)}
                    className="w-full text-left glass-subtle rounded-xl p-3 hover:bg-white transition block"
                  >
                    <p className="text-xs font-bold">{t.title}</p>
                    <p className="text-[11px] text-red-600 mt-0.5">
                      Due: {t.deadline ? new Date(t.deadline).toLocaleDateString() : "Overdue"}
                    </p>
                  </button>
                ))
              )}
            </div>

            {/* Pending Reimbursement Claims */}
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-bold">
                Pending Reimbursement Claims ({pendingClaims.length})
              </h2>
              {pendingClaims.length === 0 ? (
                <p className="text-xs text-zinc-500">No pending financial claims.</p>
              ) : (
                pendingClaims.map((c) => (
                  <div key={c.claim_id} className="glass-subtle rounded-xl p-3 space-y-2">
                    <p className="text-xs font-bold">{c.title}</p>
                    <p className="text-[11px] text-zinc-500">
                      {c.project_title || c.project_id} · ₹{(c.amount_paise / 100).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleClaimReview(c.claim_id, "APPROVED")}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleClaimReview(c.claim_id, "REJECTED")}
                        className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[11px] font-semibold"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
