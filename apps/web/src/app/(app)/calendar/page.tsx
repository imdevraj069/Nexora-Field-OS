"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, Clock, FolderKanban, Loader2 } from "lucide-react";
import { useWorkspaceAuth } from "@/hooks/useWorkspaceAuth";
import { useDrawerStore } from "@/stores/useDrawerStore";
import { RevealInView } from "@/components/ui/motion";

interface TaskItem {
  task_id: string;
  project_id: string;
  title: string;
  status: string;
  priority: string;
  deadline?: string | null;
}

interface ProjectItem {
  project_id: string;
  title: string;
  status: string;
}

export default function CalendarSchedulePage() {
  const { token, activeOrg } = useWorkspaceAuth();
  const { openTaskDrawer } = useDrawerStore();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<Record<string, string>>({});
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
        const [tRes, pRes] = await Promise.all([
          fetch("/api/v1/tasks", { headers }),
          fetch("/api/v1/projects", { headers }),
        ]);
        if (!active) return;
        if (tRes.ok) {
          const data = await tRes.json();
          setTasks(data.tasks || []);
        }
        if (pRes.ok) {
          const pData = await pRes.json();
          const map: Record<string, string> = {};
          (pData.projects || []).forEach((p: ProjectItem) => {
            map[p.project_id] = p.title;
          });
          setProjects(map);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token, activeOrg?.org_id, headers]);

  const grouped = useMemo(() => {
    const withDeadlines = tasks
      .filter((t) => !!t.deadline)
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
    const unscheduled = tasks.filter((t) => !t.deadline);

    const byDate: Record<string, TaskItem[]> = {};
    for (const t of withDeadlines) {
      const key = new Date(t.deadline!).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(t);
    }
    return { byDate, unscheduled };
  }, [tasks]);

  return (
    <div className="space-y-6">
      <RevealInView>
        <div className="glass-card rounded-3xl p-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 text-xs font-semibold mb-2">
            <CalendarIcon className="w-3.5 h-3.5" />
            Schedule & Deadlines
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Execution Timeline</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Chronological view of task deadlines and unscheduled field deliverables.
          </p>
        </div>
      </RevealInView>

      {loading ? (
        <div className="glass-card rounded-3xl p-12 flex items-center justify-center gap-2 text-sm text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading schedule...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {Object.keys(grouped.byDate).length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center text-xs text-zinc-500">
                No tasks with deadlines scheduled yet.
              </div>
            ) : (
              Object.entries(grouped.byDate).map(([dateLabel, items]) => (
                <div key={dateLabel} className="glass-card rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600">
                    <Clock className="w-3.5 h-3.5" />
                    {dateLabel}
                  </div>
                  <div className="space-y-2">
                    {items.map((t) => {
                      const overdue =
                        t.deadline &&
                        new Date(t.deadline).getTime() < Date.now() &&
                        !["DONE", "VERIFIED", "COMPLETED"].includes((t.status || "").toUpperCase());
                      return (
                        <button
                          key={t.task_id}
                          onClick={() => openTaskDrawer(t.task_id, t.project_id)}
                          className="w-full text-left glass-subtle rounded-xl p-3 flex items-center justify-between gap-3 hover:bg-white transition"
                        >
                          <div>
                            <p className="text-sm font-semibold">{t.title}</p>
                            <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                              <FolderKanban className="w-3 h-3" />
                              {projects[t.project_id] || "Project"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {overdue && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                                OVERDUE
                              </span>
                            )}
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700">
                              {t.status}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="glass-card rounded-2xl p-5 space-y-3 h-fit">
            <h2 className="text-sm font-bold">Unscheduled Backlog ({grouped.unscheduled.length})</h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {grouped.unscheduled.length === 0 ? (
                <p className="text-xs text-zinc-500">All tasks have target deadlines.</p>
              ) : (
                grouped.unscheduled.map((t) => (
                  <button
                    key={t.task_id}
                    onClick={() => openTaskDrawer(t.task_id, t.project_id)}
                    className="w-full text-left glass-subtle rounded-xl p-3 hover:bg-white transition"
                  >
                    <p className="text-xs font-semibold truncate">{t.title}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {projects[t.project_id] || "Project"} • {t.status}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
