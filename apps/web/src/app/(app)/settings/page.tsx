"use client";

import { useEffect, useState } from "react";
import { Database, HardDrive, Settings as SettingsIcon, Sliders } from "lucide-react";
import { useWorkspaceAuth } from "@/hooks/useWorkspaceAuth";
import { useAuthStore, WorkflowStatusDef } from "@/stores/useAuthStore";
import { WorkflowStatusEditor } from "@/components/modals/WorkflowStatusEditor";
import { RevealInView } from "@/components/ui/motion";

export default function SettingsPage() {
  const { token, activeOrg, user } = useWorkspaceAuth();
  const { defaultWorkflowStatuses, setContext, permissions, roleName } = useAuthStore();
  const [usedBytes, setUsedBytes] = useState(0);
  const [quotaBytes, setQuotaBytes] = useState(50 * 1024 * 1024 * 1024);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    if (!token || !activeOrg?.org_id) return;
    fetch("/api/v1/evidence", {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-org-id": activeOrg.org_id,
      },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setUsedBytes(Number(d.usedBytes || 0));
          setQuotaBytes(Number(d.quotaBytes || 50 * 1024 * 1024 * 1024));
        }
      })
      .catch(() => {});
  }, [token, activeOrg?.org_id]);

  const usedGB = (usedBytes / (1024 * 1024 * 1024)).toFixed(2);
  const quotaGB = (quotaBytes / (1024 * 1024 * 1024)).toFixed(0);
  const pct = quotaBytes > 0 ? Math.min(100, (usedBytes / quotaBytes) * 100) : 0;

  return (
    <div className="space-y-6">
      <RevealInView>
        <div className="glass-card rounded-3xl p-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 text-xs font-semibold mb-2">
            <SettingsIcon className="w-3.5 h-3.5" />
            Workspace & Organization Settings
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Organization Configuration</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Inspect tenant shard routing, MinIO storage quota, and default workflow statuses.
          </p>
        </div>
      </RevealInView>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Database className="w-4 h-4 text-orange-500" />
            Tenant & Shard Diagnostics
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-2 border-b border-zinc-200/60">
              <span className="text-zinc-500">Organization Name</span>
              <span className="font-semibold">{activeOrg?.org_name || "—"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-zinc-200/60">
              <span className="text-zinc-500">Organization ID</span>
              <span className="font-mono text-[11px]">{activeOrg?.org_id || "—"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-zinc-200/60">
              <span className="text-zinc-500">Active Shard</span>
              <span className="font-semibold">S{activeOrg?.shard_id || 1}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-zinc-500">Signed-in User</span>
              <span className="font-semibold">{user?.email || "—"}</span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <HardDrive className="w-4 h-4 text-orange-500" />
            MinIO Object Storage Quota
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-zinc-500">Used Storage</span>
              <span>
                {usedGB} GB / {quotaGB} GB ({pct.toFixed(2)}%)
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-zinc-200/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#ff3b30] to-[#f97316]"
                style={{ width: `${Math.max(pct, usedBytes > 0 ? 2 : 0)}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500">
              Hard 50 GB limit enforced across all field evidence, voice notes, and finance receipts.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold">
            <Sliders className="w-4 h-4 text-orange-500" />
            Default Organization Workflow Statuses
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Used as the starting Kanban columns when creating new projects ({defaultWorkflowStatuses.length} statuses configured).
          </p>
        </div>
        <button
          onClick={() => setEditorOpen(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff3b30] to-[#f97316] text-white text-xs font-semibold shrink-0"
        >
          Customize Default Statuses
        </button>
      </div>

      <WorkflowStatusEditor
        isOpen={editorOpen}
        initialStatuses={defaultWorkflowStatuses}
        onClose={() => setEditorOpen(false)}
        onSave={async (statuses: WorkflowStatusDef[]) => {
          if (!token || !activeOrg?.org_id) return;
          const res = await fetch("/api/v1/org/workflow-statuses", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "x-org-id": activeOrg.org_id,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ statuses }),
          });
          if (res.ok) {
            setContext(roleName, permissions, statuses);
            setEditorOpen(false);
          }
        }}
      />
    </div>
  );
}
