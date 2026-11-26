"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  DollarSign,
  ExternalLink,
  Loader2,
  Plus,
  Receipt,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { useWorkspaceAuth } from "@/hooks/useWorkspaceAuth";
import { RevealInView } from "@/components/ui/motion";

interface FinanceOverview {
  totalAllocatedPaise: number;
  totalDistributedPaise: number;
  totalFloatedPaise: number;
  totalSpentPaise: number;
  paidSpentPaise: number;
  pendingClaimsCount: number;
  pendingClaimsPaise: number;
  burnRatePct: number;
}

interface ProjectBudget {
  budget_id: string;
  project_id: string;
  project_title: string;
  total_budget_paise: number;
  distributed_budget_paise: number;
  floated_budget_paise: number;
  spent_paise: number;
  revisions_count: number;
  notes?: string;
}

interface ExpenseItem {
  expense_id: string;
  project_id: string;
  project_title: string;
  title: string;
  category: string;
  amount_paise: number;
  funding_source: string;
  payment_status: string;
  vendor_name?: string;
  invoice_number?: string;
  receipt_file_id?: string | null;
  created_at: string;
}

interface ReimbursementClaim {
  claim_id: string;
  project_id: string;
  project_title: string;
  user_id: string;
  title: string;
  amount_paise: number;
  receipt_file_id?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  created_at: string;
}

interface ProjectOption {
  projectId: string;
  project_id?: string;
  title: string;
}

function formatINR(paise: number): string {
  const rupees = Number(paise || 0) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

export default function FinancePage() {
  const { token, activeOrg } = useWorkspaceAuth();
  const [tab, setTab] = useState<"budgets" | "expenses" | "reimbursements">("budgets");
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [budgets, setBudgets] = useState<ProjectBudget[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [claims, setClaims] = useState<ReimbursementClaim[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [openRevisionsFor, setOpenRevisionsFor] = useState<string | null>(null);
  const [revisionsByProject, setRevisionsByProject] = useState<Record<string, any[]>>({});

  // Budget form
  const [bProjectId, setBProjectId] = useState("");
  const [bTotalRupees, setBTotalRupees] = useState("");
  const [bDistributedRupees, setBDistributedRupees] = useState("");
  const [bFloatedRupees, setBFloatedRupees] = useState("");
  const [bNotes, setBNotes] = useState("");

  // Expense form
  const [eProjectId, setEProjectId] = useState("");
  const [eTitle, setETitle] = useState("");
  const [eCategory, setECategory] = useState("MATERIAL");
  const [eAmountRupees, setEAmountRupees] = useState("");
  const [eFundingSource, setEFundingSource] = useState("PROJECT_BUDGET");
  const [eVendor, setEVendor] = useState("");
  const [eInvoice, setEInvoice] = useState("");
  const [eReceipt, setEReceipt] = useState<File | null>(null);

  // Reimbursement form
  const [rProjectId, setRProjectId] = useState("");
  const [rTitle, setRTitle] = useState("");
  const [rAmountRupees, setRAmountRupees] = useState("");
  const [rDesc, setRDesc] = useState("");
  const [rReceipt, setRReceipt] = useState<File | null>(null);

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "x-org-id": activeOrg?.org_id || "",
    }),
    [token, activeOrg?.org_id]
  );

  const loadFinance = useCallback(async () => {
    if (!token || !activeOrg?.org_id) return;
    setLoading(true);
    setError("");
    try {
      const [ovRes, budRes, expRes, clmRes, projRes] = await Promise.all([
        fetch("/api/v1/finance/overview", { headers }),
        fetch("/api/v1/finance/budgets", { headers }),
        fetch("/api/v1/finance/expenses", { headers }),
        fetch("/api/v1/finance/reimbursements", { headers }),
        fetch("/api/v1/projects", { headers }),
      ]);
      if (ovRes.ok) setOverview(await ovRes.json());
      if (budRes.ok) setBudgets((await budRes.json()).budgets || []);
      if (expRes.ok) setExpenses((await expRes.json()).expenses || []);
      if (clmRes.ok) setClaims((await clmRes.json()).claims || []);
      if (projRes.ok) {
        const list = ((await projRes.json()).projects || []).map((p: any) => ({
          projectId: p.projectId || p.project_id,
          title: p.title,
        }));
        setProjects(list);
        if (list.length > 0) {
          setBProjectId((p) => p || list[0].projectId);
          setEProjectId((p) => p || list[0].projectId);
          setRProjectId((p) => p || list[0].projectId);
        }
      }
    } catch {
      setError("Failed to load finance & budget records.");
    } finally {
      setLoading(false);
    }
  }, [token, activeOrg?.org_id, headers]);

  useEffect(() => {
    loadFinance();
  }, [loadFinance]);

  function handleTotalChange(val: string) {
    setBTotalRupees(val);
    const t = Math.max(0, Number(val || 0));
    if (!val) {
      setBDistributedRupees("");
      setBFloatedRupees("");
      return;
    }
    const d = bDistributedRupees === "" ? t : Math.min(t, Math.max(0, Number(bDistributedRupees || 0)));
    setBDistributedRupees(String(d));
    setBFloatedRupees(String(Math.max(0, t - d)));
  }

  function handleDistributedChange(val: string) {
    const t = Math.max(0, Number(bTotalRupees || 0));
    if (val === "") {
      setBDistributedRupees("");
      setBFloatedRupees(t > 0 ? String(t) : "");
      return;
    }
    const d = Math.min(t, Math.max(0, Number(val)));
    setBDistributedRupees(String(d));
    setBFloatedRupees(String(Math.max(0, t - d)));
  }

  function handleFloatedChange(val: string) {
    const t = Math.max(0, Number(bTotalRupees || 0));
    if (val === "") {
      setBFloatedRupees("");
      setBDistributedRupees(t > 0 ? String(t) : "");
      return;
    }
    const f = Math.min(t, Math.max(0, Number(val)));
    setBFloatedRupees(String(f));
    setBDistributedRupees(String(Math.max(0, t - f)));
  }

  async function toggleRevisions(projectId: string) {
    if (openRevisionsFor === projectId) {
      setOpenRevisionsFor(null);
      return;
    }
    setOpenRevisionsFor(projectId);
    if (!revisionsByProject[projectId]) {
      const res = await fetch(`/api/v1/finance/budgets/${projectId}/revisions`, { headers });
      if (res.ok) {
        const d = await res.json();
        setRevisionsByProject((prev) => ({ ...prev, [projectId]: d.revisions || [] }));
      }
    }
  }

  async function handleSaveBudget(e: FormEvent) {
    e.preventDefault();
    if (!bProjectId || !bTotalRupees) return;
    const totalNum = Number(bTotalRupees);
    const distNum = Number(bDistributedRupees || 0);
    const floatNum = Number(bFloatedRupees || 0);
    if (totalNum <= 0 || distNum + floatNum !== totalNum) {
      setError("Distributed + Floated budget must equal Total Budget.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/v1/finance/budgets", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: bProjectId,
          totalBudgetPaise: Math.round(Number(bTotalRupees) * 100),
          distributedBudgetPaise: Math.round(Number(bDistributedRupees || 0) * 100),
          floatedBudgetPaise: Math.round(Number(bFloatedRupees || 0) * 100),
          notes: bNotes,
          reason: "Budget allocation / revision",
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.message || "Failed to save budget.");
      } else {
        setBTotalRupees("");
        setBDistributedRupees("");
        setBFloatedRupees("");
        setBNotes("");
        await loadFinance();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateExpense(e: FormEvent) {
    e.preventDefault();
    if (!eProjectId || !eTitle || !eAmountRupees) return;
    setSubmitting(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("projectId", eProjectId);
      fd.append("title", eTitle);
      fd.append("category", eCategory);
      fd.append("amountPaise", String(Math.round(Number(eAmountRupees) * 100)));
      fd.append("fundingSource", eFundingSource);
      if (eVendor) fd.append("vendorName", eVendor);
      if (eInvoice) fd.append("invoiceNumber", eInvoice);
      if (eReceipt) fd.append("receipt", eReceipt);

      const res = await fetch("/api/v1/finance/expenses", {
        method: "POST",
        headers,
        body: fd,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.message || "Failed to record expense.");
      } else {
        setETitle("");
        setEAmountRupees("");
        setEVendor("");
        setEInvoice("");
        setEReceipt(null);
        await loadFinance();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkExpensePaid(expenseId: string) {
    const res = await fetch(`/api/v1/finance/expenses/${expenseId}/pay`, {
      method: "PATCH",
      headers,
    });
    if (res.ok) await loadFinance();
  }

  async function handleCreateClaim(e: FormEvent) {
    e.preventDefault();
    if (!rProjectId || !rTitle || !rAmountRupees) return;
    setSubmitting(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("projectId", rProjectId);
      fd.append("title", rTitle);
      fd.append("amountPaise", String(Math.round(Number(rAmountRupees) * 100)));
      if (rDesc) fd.append("description", rDesc);
      if (rReceipt) fd.append("receipt", rReceipt);

      const res = await fetch("/api/v1/finance/reimbursements", {
        method: "POST",
        headers,
        body: fd,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.message || "Failed to submit claim.");
      } else {
        setRTitle("");
        setRAmountRupees("");
        setRDesc("");
        setRReceipt(null);
        await loadFinance();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReviewClaim(claimId: string, status: "APPROVED" | "REJECTED" | "PAID") {
    const res = await fetch(`/api/v1/finance/reimbursements/${claimId}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await loadFinance();
  }

  async function openReceipt(projectId: string, fileId: string) {
    const res = await fetch(`/api/v1/projects/${projectId}/files/${fileId}/signed-url`, { headers });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.signed_url) {
      window.open(data.signed_url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="space-y-6">
      <RevealInView>
        <div className="glass-card rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 text-xs font-semibold mb-2">
              <Wallet className="w-3.5 h-3.5" />
              Budget Allocation & Financing
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Project Finance & Reimbursements</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Allocate project budgets, log vendor expenses with MinIO receipts, and review claims.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(["budgets", "expenses", "reimbursements"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-full text-xs font-semibold capitalize transition ${
                  tab === t
                    ? "bg-gradient-to-r from-[#ff3b30] to-[#f97316] text-white shadow-sm"
                    : "glass-subtle text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </RevealInView>

      {/* Financial Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Total Allocated</span>
            <DollarSign className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold mt-2">
            {formatINR(overview?.totalAllocatedPaise || 0)}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            Distributed: {formatINR(overview?.totalDistributedPaise || 0)}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Total Spent</span>
            <Receipt className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{formatINR(overview?.totalSpentPaise || 0)}</p>
          <p className="text-[11px] text-zinc-500 mt-1">
            Paid: {formatINR(overview?.paidSpentPaise || 0)}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Burn Rate</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-2">
            {Number(overview?.burnRatePct || 0).toFixed(1)}%
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            Floated: {formatINR(overview?.totalFloatedPaise || 0)}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Pending Claims</span>
            <CreditCard className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{overview?.pendingClaimsCount || 0}</p>
          <p className="text-[11px] text-zinc-500 mt-1">
            Amount: {formatINR(overview?.pendingClaimsPaise || 0)}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="glass-card rounded-3xl p-12 flex items-center justify-center gap-2 text-sm text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading financial ledger...
        </div>
      ) : tab === "budgets" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleSaveBudget} className="glass-card rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-orange-500" />
              Allocate / Revise Project Budget
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-zinc-500 block mb-1">Project</label>
                <select
                  value={bProjectId}
                  onChange={(e) => setBProjectId(e.target.value)}
                  className="w-full glass-subtle rounded-xl px-3 py-2 outline-none"
                  required
                >
                  {projects.map((p) => (
                    <option key={p.projectId} value={p.projectId}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-zinc-500 block mb-1">Total Budget (INR)</label>
                <input
                  type="number"
                  min="1"
                  value={bTotalRupees}
                  onChange={(e) => handleTotalChange(e.target.value)}
                  placeholder="e.g. 500000"
                  className="w-full glass-subtle rounded-xl px-3 py-2 outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-zinc-500 block mb-1">Distributed (INR)</label>
                  <input
                    type="number"
                    min="0"
                    max={bTotalRupees || undefined}
                    value={bDistributedRupees}
                    onChange={(e) => handleDistributedChange(e.target.value)}
                    placeholder="0"
                    className="w-full glass-subtle rounded-xl px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-500 block mb-1">Floated (Auto)</label>
                  <input
                    type="number"
                    min="0"
                    max={bTotalRupees || undefined}
                    value={bFloatedRupees}
                    onChange={(e) => handleFloatedChange(e.target.value)}
                    placeholder="0"
                    className="w-full glass-subtle rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              </div>
              {bTotalRupees && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
                  Distributed ({formatINR(Number(bDistributedRupees || 0) * 100)}) + Floated ({formatINR(Number(bFloatedRupees || 0) * 100)}) = {formatINR(Number(bTotalRupees) * 100)} ✓
                </div>
              )}
              <div>
                <label className="font-semibold text-zinc-500 block mb-1">Notes</label>
                <textarea
                  value={bNotes}
                  onChange={(e) => setBNotes(e.target.value)}
                  rows={2}
                  placeholder="Allocation phase or revision rationale"
                  className="w-full glass-subtle rounded-xl px-3 py-2 outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#ff3b30] to-[#f97316] text-white text-xs font-semibold shadow-sm"
            >
              {submitting ? "Saving..." : "Save Budget Allocation"}
            </button>
          </form>

          <div className="lg:col-span-2 space-y-3">
            {budgets.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center text-xs text-zinc-500">
                No project budgets allocated yet.
              </div>
            ) : (
              budgets.map((b) => {
                const rawPct =
                  b.total_budget_paise > 0
                    ? (b.spent_paise / b.total_budget_paise) * 100
                    : 0;
                const pct = Math.min(100, rawPct);
                const remainingPaise = Math.max(0, b.total_budget_paise - b.spent_paise);
                const healthLabel =
                  rawPct > 100 ? "Overrun" : rawPct >= 80 ? "Warning" : "Healthy";
                const healthBadge =
                  rawPct > 100
                    ? "bg-red-100 text-red-700"
                    : rawPct >= 80
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700";
                return (
                  <div key={b.budget_id} className="glass-card rounded-2xl p-5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold">{b.project_title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${healthBadge}`}>
                            {healthLabel}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Revisions: {b.revisions_count} {b.notes ? `• ${b.notes}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatINR(b.total_budget_paise)}</p>
                        <p className="text-[11px] text-zinc-500">
                          Spent {formatINR(b.spent_paise)} ({rawPct.toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-200/80 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#ff3b30] to-[#f97316]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                      <div className="glass-subtle rounded-lg px-2.5 py-1.5">
                        <span className="text-zinc-500 block">Distributed</span>
                        <span className="font-bold">{formatINR(b.distributed_budget_paise)}</span>
                      </div>
                      <div className="glass-subtle rounded-lg px-2.5 py-1.5">
                        <span className="text-zinc-500 block">Floated</span>
                        <span className="font-bold">{formatINR(b.floated_budget_paise)}</span>
                      </div>
                      <div className="glass-subtle rounded-lg px-2.5 py-1.5">
                        <span className="text-zinc-500 block">Remaining</span>
                        <span className="font-bold text-emerald-700">{formatINR(remainingPaise)}</span>
                      </div>
                    </div>
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void toggleRevisions(b.project_id)}
                        className="text-[11px] font-semibold text-orange-600 hover:underline cursor-pointer"
                      >
                        {openRevisionsFor === b.project_id ? "Hide Revision History" : "View Revision History"}
                      </button>
                    </div>
                    {openRevisionsFor === b.project_id && (
                      <div className="pt-2 border-t border-zinc-200/60 space-y-1.5 text-[11px]">
                        {(revisionsByProject[b.project_id] || []).length === 0 ? (
                          <p className="text-zinc-500">No budget revisions recorded yet.</p>
                        ) : (
                          (revisionsByProject[b.project_id] || []).map((rev: any) => (
                            <div key={rev.revision_id} className="flex items-center justify-between glass-subtle rounded-lg px-2.5 py-1.5">
                              <span>
                                {formatINR(rev.previous_total_paise)} → <strong>{formatINR(rev.new_total_paise)}</strong>
                                {rev.reason ? ` (${rev.reason})` : ""}
                              </span>
                              <span className="text-zinc-400">{new Date(rev.created_at).toLocaleDateString()}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : tab === "expenses" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleCreateExpense} className="glass-card rounded-2xl p-5 space-y-3 text-xs">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-orange-500" />
              Log Project / Admin Expense
            </h2>
            <select
              value={eProjectId}
              onChange={(e) => setEProjectId(e.target.value)}
              className="w-full glass-subtle rounded-xl px-3 py-2 outline-none"
              required
            >
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  {p.title}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={eTitle}
              onChange={(e) => setETitle(e.target.value)}
              placeholder="Expense title (e.g. Steel rods batch 2)"
              className="w-full glass-subtle rounded-xl px-3 py-2 outline-none"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={eCategory}
                onChange={(e) => setECategory(e.target.value)}
                className="glass-subtle rounded-xl px-3 py-2 outline-none"
              >
                <option value="MATERIAL">MATERIAL</option>
                <option value="LABOR">LABOR</option>
                <option value="LOGISTICS">LOGISTICS</option>
                <option value="EQUIPMENT">EQUIPMENT</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <input
                type="number"
                min="1"
                value={eAmountRupees}
                onChange={(e) => setEAmountRupees(e.target.value)}
                placeholder="Amount (INR)"
                className="glass-subtle rounded-xl px-3 py-2 outline-none"
                required
              />
            </div>
            <select
              value={eFundingSource}
              onChange={(e) => setEFundingSource(e.target.value)}
              className="w-full glass-subtle rounded-xl px-3 py-2 outline-none"
            >
              <option value="PROJECT_BUDGET">PROJECT_BUDGET</option>
              <option value="ADMIN_FUNDS">ADMIN_FUNDS</option>
              <option value="PETTY_CASH">PETTY_CASH</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={eVendor}
                onChange={(e) => setEVendor(e.target.value)}
                placeholder="Vendor name"
                className="glass-subtle rounded-xl px-3 py-2 outline-none"
              />
              <input
                type="text"
                value={eInvoice}
                onChange={(e) => setEInvoice(e.target.value)}
                placeholder="Invoice #"
                className="glass-subtle rounded-xl px-3 py-2 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-zinc-500 block mb-1">
                Receipt / Invoice (MinIO nexora-docs)
              </label>
              <input
                type="file"
                onChange={(e) => setEReceipt(e.target.files?.[0] || null)}
                className="w-full text-[11px]"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#ff3b30] to-[#f97316] text-white font-semibold"
            >
              {submitting ? "Uploading..." : "Record Expense"}
            </button>
          </form>

          <div className="lg:col-span-2 space-y-3">
            {expenses.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center text-xs text-zinc-500">
                No expenses recorded yet.
              </div>
            ) : (
              expenses.map((ex) => (
                <div
                  key={ex.expense_id}
                  className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{ex.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600">
                        {ex.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ex.payment_status === "PAID"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {ex.payment_status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      {ex.project_title} • {ex.funding_source}
                      {ex.vendor_name ? ` • ${ex.vendor_name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold mr-2">{formatINR(ex.amount_paise)}</span>
                    {ex.receipt_file_id && (
                      <button
                        onClick={() => openReceipt(ex.project_id, ex.receipt_file_id!)}
                        className="px-2.5 py-1.5 rounded-xl glass-subtle text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Receipt
                      </button>
                    )}
                    {ex.payment_status !== "PAID" && (
                      <button
                        onClick={() => handleMarkExpensePaid(ex.expense_id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleCreateClaim} className="glass-card rounded-2xl p-5 space-y-3 text-xs">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-orange-500" />
              Submit Reimbursement Claim
            </h2>
            <select
              value={rProjectId}
              onChange={(e) => setRProjectId(e.target.value)}
              className="w-full glass-subtle rounded-xl px-3 py-2 outline-none"
              required
            >
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  {p.title}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={rTitle}
              onChange={(e) => setRTitle(e.target.value)}
              placeholder="Claim title (e.g. Site travel fuel)"
              className="w-full glass-subtle rounded-xl px-3 py-2 outline-none"
              required
            />
            <input
              type="number"
              min="1"
              value={rAmountRupees}
              onChange={(e) => setRAmountRupees(e.target.value)}
              placeholder="Amount (INR)"
              className="w-full glass-subtle rounded-xl px-3 py-2 outline-none"
              required
            />
            <textarea
              value={rDesc}
              onChange={(e) => setRDesc(e.target.value)}
              rows={2}
              placeholder="Claim description"
              className="w-full glass-subtle rounded-xl px-3 py-2 outline-none"
            />
            <div>
              <label className="font-semibold text-zinc-500 block mb-1">
                Receipt Attachment (MinIO)
              </label>
              <input
                type="file"
                onChange={(e) => setRReceipt(e.target.files?.[0] || null)}
                className="w-full text-[11px]"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#ff3b30] to-[#f97316] text-white font-semibold"
            >
              {submitting ? "Submitting..." : "Submit Claim"}
            </button>
          </form>

          <div className="lg:col-span-2 space-y-3">
            {claims.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center text-xs text-zinc-500">
                No reimbursement claims submitted yet.
              </div>
            ) : (
              claims.map((c) => (
                <div
                  key={c.claim_id}
                  className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{c.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status === "PAID" || c.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-700"
                            : c.status === "REJECTED"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      {c.project_title} • {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold mr-2">{formatINR(c.amount_paise)}</span>
                    {c.receipt_file_id && (
                      <button
                        onClick={() => openReceipt(c.project_id, c.receipt_file_id!)}
                        className="px-2.5 py-1.5 rounded-xl glass-subtle text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Receipt
                      </button>
                    )}
                    {c.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => handleReviewClaim(c.claim_id, "APPROVED")}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReviewClaim(c.claim_id, "REJECTED")}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </>
                    )}
                    {c.status === "APPROVED" && (
                      <button
                        onClick={() => handleReviewClaim(c.claim_id, "PAID")}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold"
                      >
                        Mark Paid
                      </button>
                    )}
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
