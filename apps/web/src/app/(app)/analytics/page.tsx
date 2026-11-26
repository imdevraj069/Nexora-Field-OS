"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BrainCircuit, Loader2, Sparkles } from "lucide-react";
import { useWorkspaceAuth } from "@/hooks/useWorkspaceAuth";
import { AnimatedRing, RevealInView } from "@/components/ui/motion";

interface EfficiencyScore {
  task_id: string;
  project_id: string;
  task_title?: string;
  project_title?: string;
  user_id?: string;
  timeliness_score: number;
  evidence_completeness: number;
  overall_efficiency: number;
  ai_risk_flags?: string[];
  evaluated_at: string;
}

interface AnalyticsData {
  avgEfficiency: number;
  avgTimeliness: number;
  avgEvidence: number;
  evaluatedCount: number;
  scores: EfficiencyScore[];
  reports?: Array<{
    projectId: string;
    overall_health_score: number;
    completion_percentage: number;
    executive_summary: string;
    recommendations?: string;
    createdAt?: string;
  }>;
}

export default function AnalyticsGovernancePage() {
  const { token, activeOrg } = useWorkspaceAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [projects, setProjects] = useState<Array<{ projectId: string; title: string }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthesisMsg, setSynthesisMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "x-org-id": activeOrg?.org_id || "",
    }),
    [token, activeOrg?.org_id]
  );

  const loadAnalytics = useCallback(async () => {
    if (!token || !activeOrg?.org_id) return;
    setLoading(true);
    try {
      const [aRes, pRes] = await Promise.all([
        fetch("/api/v1/analytics/efficiency", { headers }),
        fetch("/api/v1/projects", { headers }),
      ]);
      if (aRes.ok) setData(await aRes.json());
      if (pRes.ok) {
        const list = ((await pRes.json()).projects || []).map((p: any) => ({
          projectId: p.projectId || p.project_id,
          title: p.title,
        }));
        setProjects(list);
        if (list.length > 0) setSelectedProjectId((p) => p || list[0].projectId);
      }
    } finally {
      setLoading(false);
    }
  }, [token, activeOrg?.org_id, headers]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  async function handleRunSynthesis() {
    if (!selectedProjectId) return;
    setSynthesizing(true);
    setSynthesisMsg("");
    try {
      const res = await fetch(`/api/v1/projects/${selectedProjectId}/analyze-ai`, {
        method: "POST",
        headers,
      });
      const body = await res.json().catch(() => ({}));
      setSynthesisMsg(
        res.ok
          ? body.executive_summary || "AI Governance synthesis completed."
          : body.message || "AI synthesis failed."
      );
      await loadAnalytics();
    } finally {
      setSynthesizing(false);
    }
  }

  return (
    <div className="space-y-6">
      <RevealInView>
        <div className="glass-card rounded-3xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 text-xs font-semibold mb-2">
              <BrainCircuit className="w-3.5 h-3.5" />
              Gemini 2.5 AI Governance
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Efficiency & Risk Intelligence</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Automated timeliness, evidence completeness, and voice/field risk detection.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="glass-subtle rounded-xl px-3 py-2 text-xs font-medium outline-none"
            >
              {projects.map((p) => (
                <option key={p.projectId} value={p.projectId}>
                  {p.title}
                </option>
              ))}
            </select>
            <button
              onClick={handleRunSynthesis}
              disabled={synthesizing || !selectedProjectId}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff3b30] to-[#f97316] text-white text-xs font-semibold shadow-sm"
            >
              {synthesizing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Run AI Synthesis
            </button>
          </div>
        </div>
      </RevealInView>

      {synthesisMsg && (
        <div className="glass-card rounded-2xl p-4 text-xs text-zinc-700 border border-orange-200">
          {synthesisMsg}
        </div>
      )}

      {loading ? (
        <div className="glass-card rounded-3xl p-12 flex items-center justify-center gap-2 text-sm text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading AI governance scores...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-500">Overall Efficiency</p>
                <p className="text-2xl font-bold mt-1">
                  {Math.round(data?.avgEfficiency || 0)}%
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  {data?.evaluatedCount || 0} tasks evaluated
                </p>
              </div>
              <AnimatedRing percent={Math.round(data?.avgEfficiency || 0)} size={64} />
            </div>

            <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-500">Timeliness Score</p>
                <p className="text-2xl font-bold mt-1">
                  {Math.round(data?.avgTimeliness || 0)}%
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">SLA adherence</p>
              </div>
              <AnimatedRing percent={Math.round(data?.avgTimeliness || 0)} size={64} />
            </div>

            <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-500">Evidence Completeness</p>
                <p className="text-2xl font-bold mt-1">
                  {Math.round(data?.avgEvidence || 0)}%
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">Checklist & media proof</p>
              </div>
              <AnimatedRing percent={Math.round(data?.avgEvidence || 0)} size={64} />
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-bold">Evaluated Task Breakdown</h2>
            {!data?.scores || data.scores.length === 0 ? (
              <p className="text-xs text-zinc-500">
                No AI evaluations recorded yet. Submit task evidence or trigger AI Synthesis.
              </p>
            ) : (
              <div className="space-y-2">
                {data.scores.map((s, idx) => (
                  <div
                    key={`${s.task_id}-${idx}`}
                    className="glass-subtle rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">{s.task_title || s.task_id}</p>
                      <p className="text-xs text-zinc-500">
                        {s.project_title || s.project_id} •{" "}
                        {new Date(s.evaluated_at).toLocaleString()}
                      </p>
                      {s.ai_risk_flags && s.ai_risk_flags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {s.ai_risk_flags.map((flag, fIdx) => (
                            <span
                              key={fIdx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              {flag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold shrink-0">
                      <span>Timeliness: {Math.round(s.timeliness_score)}%</span>
                      <span>Evidence: {Math.round(s.evidence_completeness)}%</span>
                      <span className="px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-600">
                        Overall: {Math.round(s.overall_efficiency)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {data?.reports && data.reports.length > 0 && (
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-bold">Saved Gemini 2.5 Project Reports</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {data.reports.map((rep, idx) => (
                  <div key={`${rep.projectId}-${idx}`} className="glass-subtle rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>{rep.projectId}</span>
                      <span className="text-orange-600">Health: {rep.overall_health_score}/100 ({rep.completion_percentage}%)</span>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed">{rep.executive_summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
