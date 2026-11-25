"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, Loader2 } from "lucide-react";
import { useWorkspaceAuth } from "@/hooks/useWorkspaceAuth";
import { RevealInView } from "@/components/ui/motion";

interface ActivityEntry {
  transition_id: string;
  project_id: string;
  project_title?: string;
  entity_type: string;
  entity_id: string;
  from_status?: string | null;
  to_status: string;
  actor_user_id?: string;
  created_at: string;
}

export default function ActivityLogPage() {
  const { token, activeOrg } = useWorkspaceAuth();
  const [items, setItems] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "x-org-id": activeOrg?.org_id || "",
    }),
    [token, activeOrg?.org_id]
  );

  useEffect(() => {
    if (!token || !activeOrg?.org_id) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/v1/activity", { headers });
        if (res.ok && active) {
          const data = await res.json();
          setItems(data.activity || []);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token, activeOrg?.org_id, headers]);

  return (
    <div className="space-y-6">
      <RevealInView>
        <div className="glass-card rounded-3xl p-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 text-xs font-semibold mb-2">
            <Activity className="w-3.5 h-3.5" />
            Immutable Audit Stream
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Workflow & Execution Activity</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Chronological log of all project, stage, and task state transitions across your shard.
          </p>
        </div>
      </RevealInView>

      {loading ? (
        <div className="glass-card rounded-3xl p-12 flex items-center justify-center gap-2 text-sm text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading activity log...
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center text-xs text-zinc-500">
          No workflow transitions recorded yet.
        </div>
      ) : (
        <div className="glass-card rounded-2xl divide-y divide-zinc-200/60">
          {items.map((a) => (
            <div
              key={a.transition_id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full font-bold bg-zinc-100 text-zinc-700">
                    {a.entity_type}
                  </span>
                  <span className="font-semibold">{a.project_title || a.project_id}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <span>{a.from_status || "INITIAL"}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-orange-500" />
                  <span className="font-semibold text-zinc-900">{a.to_status}</span>
                </div>
              </div>
              <span className="text-[11px] text-zinc-400 shrink-0">
                {new Date(a.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
