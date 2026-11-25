"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Inbox as InboxIcon, Loader2, XCircle } from "lucide-react";
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

export default function InboxPage() {
  const { token, activeOrg } = useWorkspaceAuth();
  const { openTaskDrawer } = useDrawerStore();
  const [pendingVerifications, setPendingVerifications] = useState<InboxTask[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<InboxTask[]>([]);
  const [pendingClaims, setPendingClaims] = useState<InboxClaim[]>([]);
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
      const res = await fetch("/api/v1/inbox", { headers });
      if (res.ok) {
        const data = await res.json();
        setPendingVerifications(data.pendingVerifications || []);
        setOverdueTasks(data.overdueTasks || []);
        setPendingClaims(data.pendingClaims || []);
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

  return (
    <div className="space-y-6">
      <RevealInView>
        <div className="glass-card rounded-3xl p-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 text-xs font-semibold mb-2">
            <InboxIcon className="w-3.5 h-3.5" />
            Action Queue
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Verification & SLA Inbox</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Approve pending field verifications, resolve overdue SLAs, and clear finance claims.
          </p>
        </div>
      </RevealInView>

      {loading ? (
        <div className="glass-card rounded-3xl p-12 flex items-center justify-center gap-2 text-sm text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading inbox...
        </div>
      ) : (
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
                    {t.project_title || t.project_id} • {t.status}
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
                    {c.project_title || c.project_id} • ₹{(c.amount_paise / 100).toLocaleString()}
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
      )}
    </div>
  );
}
