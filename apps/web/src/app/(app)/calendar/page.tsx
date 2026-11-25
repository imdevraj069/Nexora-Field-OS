"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  FolderKanban,
  Loader2,
} from "lucide-react";
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

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CalendarSchedulePage() {
  const { token, activeOrg } = useWorkspaceAuth();
  const { openTaskDrawer } = useDrawerStore();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(() => toDateKey(new Date()));

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

  const { tasksByDay, unscheduled } = useMemo(() => {
    const map: Record<string, TaskItem[]> = {};
    const noDate: TaskItem[] = [];
    for (const t of tasks) {
      if (!t.deadline) {
        noDate.push(t);
        continue;
      }
      const key = toDateKey(new Date(t.deadline));
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return { tasksByDay: map, unscheduled: noDate };
  }, [tasks]);

  const calendarCells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<{ date: Date; key: string; inMonth: boolean }> = [];
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      cells.push({ date: d, key: toDateKey(d), inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      cells.push({ date: d, key: toDateKey(d), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const nextIdx = cells.length - startOffset - daysInMonth + 1;
      const d = new Date(year, month + 1, nextIdx);
      cells.push({ date: d, key: toDateKey(d), inMonth: false });
    }
    return cells;
  }, [cursor]);

  const todayKey = toDateKey(new Date());
  const selectedTasks = tasksByDay[selectedDay] || [];

  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  function shiftMonth(delta: number) {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function jumpToToday() {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(toDateKey(now));
  }

  return (
    <div className="space-y-6">
      <RevealInView>
        <div className="glass-card rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 text-xs font-semibold mb-2">
              <CalendarIcon className="w-3.5 h-3.5" />
              Schedule & Deadlines
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Execution Calendar</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Inspect task deadlines by date or tap any day to manage deliverables.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => shiftMonth(-1)}
              className="glass-subtle rounded-xl p-2 hover:bg-white transition cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={jumpToToday}
              className="glass-subtle rounded-xl px-3.5 py-2 text-xs font-semibold hover:bg-white transition cursor-pointer"
            >
              Today
            </button>
            <span className="px-2 text-sm font-bold min-w-[130px] text-center">
              {monthLabel}
            </span>
            <button
              onClick={() => shiftMonth(1)}
              className="glass-subtle rounded-xl p-2 hover:bg-white transition cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </RevealInView>

      {loading ? (
        <div className="glass-card rounded-3xl p-12 flex items-center justify-center gap-2 text-sm text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading calendar...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Interactive Monthly Grid */}
          <div className="xl:col-span-3 glass-card rounded-3xl p-3 sm:p-5">
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
              {WEEKDAYS.map((wd) => (
                <div
                  key={wd}
                  className="text-center text-[11px] font-bold uppercase tracking-wider text-zinc-500 py-1.5"
                >
                  {wd}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarCells.map(({ date, key, inMonth }) => {
                const dayTasks = tasksByDay[key] || [];
                const isToday = key === todayKey;
                const isSelected = key === selectedDay;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDay(key)}
                    className={`min-h-[76px] sm:min-h-[104px] rounded-2xl p-1.5 sm:p-2 text-left flex flex-col justify-between transition cursor-pointer border ${
                      isSelected
                        ? "border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/25"
                        : inMonth
                        ? "glass-subtle hover:border-orange-400/50"
                        : "opacity-45 border-transparent bg-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                          isToday
                            ? "bg-gradient-to-r from-[#ff3b30] to-[#f97316] text-white"
                            : "text-zinc-700"
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      {dayTasks.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/15 text-orange-600 tabular-nums">
                          {dayTasks.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 mt-1 w-full overflow-hidden">
                      {dayTasks.slice(0, 2).map((t) => {
                        const overdue =
                          key < todayKey &&
                          !["DONE", "VERIFIED", "COMPLETED"].includes((t.status || "").toUpperCase());
                        return (
                          <div
                            key={t.task_id}
                            onClick={(e) => {
                              e.stopPropagation();
                              openTaskDrawer(t.task_id, t.project_id);
                            }}
                            className={`hidden sm:block truncate rounded-lg px-1.5 py-0.5 text-[10px] font-semibold ${
                              overdue
                                ? "bg-red-100 text-red-700"
                                : "bg-white/90 text-zinc-800 border border-zinc-200/70"
                            }`}
                            title={t.title}
                          >
                            {t.title}
                          </div>
                        );
                      })}
                      {dayTasks.length > 2 && (
                        <p className="hidden sm:block text-[10px] font-semibold text-zinc-500 pl-1">
                          +{dayTasks.length - 2} more
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Agenda + Unscheduled Backlog */}
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-orange-500" />
                  {new Date(`${selectedDay}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </h2>
                <span className="text-xs font-semibold text-zinc-500 tabular-nums">
                  {selectedTasks.length} tasks
                </span>
              </div>

              {selectedTasks.length === 0 ? (
                <p className="text-xs text-zinc-500 py-2">
                  No deadlines scheduled for this date.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedTasks.map((t) => (
                    <button
                      key={t.task_id}
                      onClick={() => openTaskDrawer(t.task_id, t.project_id)}
                      className="w-full text-left glass-subtle rounded-xl p-3 hover:bg-white transition cursor-pointer"
                    >
                      <p className="text-xs font-bold">{t.title}</p>
                      <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-1">
                        <FolderKanban className="w-3 h-3" />
                        {projects[t.project_id] || "Project"} • {t.status}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-bold">
                Unscheduled Backlog ({unscheduled.length})
              </h2>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {unscheduled.length === 0 ? (
                  <p className="text-xs text-zinc-500">All tasks have target deadlines.</p>
                ) : (
                  unscheduled.map((t) => (
                    <button
                      key={t.task_id}
                      onClick={() => openTaskDrawer(t.task_id, t.project_id)}
                      className="w-full text-left glass-subtle rounded-xl p-3 hover:bg-white transition cursor-pointer"
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
        </div>
      )}
    </div>
  );
}
