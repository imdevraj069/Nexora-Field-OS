"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AudioLines,
  ExternalLink,
  FileText,
  Filter,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  Languages,
  Loader2,
  Trash2,
  Video,
} from "lucide-react";
import { useWorkspaceAuth } from "@/hooks/useWorkspaceAuth";
import { useDrawerStore } from "@/stores/useDrawerStore";
import { RevealInView } from "@/components/ui/motion";

interface EvidenceFile {
  fileId: string;
  projectId: string;
  projectTitle?: string;
  taskId?: string | null;
  taskTitle?: string | null;
  bucket?: string;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy?: string;
  createdAt: string;
  audioTranscript?: string | null;
  identifiedLanguages?: string[] | null;
  overallEfficiency?: number | null;
}

interface ProjectOption {
  project_id: string;
  title: string;
}

const FILE_TYPES = ["ALL", "IMAGE", "VIDEO", "AUDIO", "DOCUMENT"] as const;

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, idx);
  return `${val.toFixed(idx >= 2 ? 2 : 1)} ${units[idx]}`;
}

function getFileCategory(mime: string): "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" {
  const lower = (mime || "").toLowerCase();
  if (lower.startsWith("image/")) return "IMAGE";
  if (lower.startsWith("video/")) return "VIDEO";
  if (lower.startsWith("audio/")) return "AUDIO";
  return "DOCUMENT";
}

export default function EvidenceMediaDirectoryPage() {
  const { token, activeOrg } = useWorkspaceAuth();
  const { openTaskDrawer } = useDrawerStore();
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [usedBytes, setUsedBytes] = useState(0);
  const [quotaBytes, setQuotaBytes] = useState(50 * 1024 * 1024 * 1024);
  const [projectId, setProjectId] = useState("");
  const [typeFilter, setTypeFilter] = useState<(typeof FILE_TYPES)[number]>("ALL");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "x-org-id": activeOrg?.org_id || "",
    }),
    [token, activeOrg?.org_id]
  );

  const loadData = useCallback(async () => {
    if (!token || !activeOrg?.org_id) return;
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      if (projectId) qs.set("projectId", projectId);
      if (typeFilter !== "ALL") qs.set("type", typeFilter);

      const [evRes, projRes] = await Promise.all([
        fetch(`/api/v1/evidence?${qs.toString()}`, { headers }),
        fetch("/api/v1/projects", { headers }),
      ]);

      if (evRes.ok) {
        const data = await evRes.json();
        setFiles(data.files || []);
        setUsedBytes(Number(data.usedBytes || 0));
        setQuotaBytes(Number(data.quotaBytes || 50 * 1024 * 1024 * 1024));
      } else {
        const err = await evRes.json().catch(() => ({}));
        setError(err.message || "Failed to load media directory.");
      }

      if (projRes.ok) {
        const pData = await projRes.json();
        setProjects(pData.projects || []);
      }
    } catch {
      setError("Network error while loading MinIO media directory.");
    } finally {
      setLoading(false);
    }
  }, [token, activeOrg?.org_id, projectId, typeFilter, headers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleOpenSignedUrl(file: EvidenceFile) {
    setOpeningId(file.fileId);
    setError("");
    try {
      const res = await fetch(
        `/api/v1/projects/${file.projectId}/files/${file.fileId}/signed-url`,
        { headers }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.signed_url) {
        window.open(data.signed_url, "_blank", "noopener,noreferrer");
      } else {
        setError(data.message || "Unable to generate signed preview URL.");
      }
    } catch {
      setError("Failed to fetch signed URL.");
    } finally {
      setOpeningId(null);
    }
  }

  async function handleDelete(file: EvidenceFile) {
    if (!confirm("Delete this file permanently from MinIO and the media directory?")) return;
    setDeletingId(file.fileId);
    setError("");
    try {
      const res = await fetch(
        `/api/v1/projects/${file.projectId}/files/${file.fileId}`,
        { method: "DELETE", headers }
      );
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.fileId !== file.fileId));
        setUsedBytes((prev) => Math.max(0, prev - (file.sizeBytes || 0)));
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Delete failed.");
      }
    } catch {
      setError("Network error deleting file.");
    } finally {
      setDeletingId(null);
    }
  }

  const usedPct = quotaBytes > 0 ? Math.min(100, (usedBytes / quotaBytes) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header + 50 GB Storage Quota Meter */}
      <RevealInView>
        <div className="glass-card rounded-3xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 text-xs font-semibold mb-2">
              <HardDrive className="w-3.5 h-3.5" />
              MinIO Object Storage Directory
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Evidence & Media Directory</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Browse field photos, videos, voice notes (with AI transcripts), and project documents.
            </p>
          </div>

          <div className="w-full lg:w-80 glass-subtle rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-zinc-500">Organization Quota (50 GB Limit)</span>
              <span>
                {formatBytes(usedBytes)} / {formatBytes(quotaBytes)}
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-zinc-200/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#ff3b30] to-[#f97316] transition-all duration-500"
                style={{ width: `${Math.max(usedPct, usedBytes > 0 ? 2 : 0)}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              {usedPct.toFixed(2)}% used across all projects in {activeOrg?.org_name || "Organization"}
            </p>
          </div>
        </div>
      </RevealInView>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-400 mr-1" />
          {FILE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                typeFilter === t
                  ? "bg-gradient-to-r from-[#ff3b30] to-[#f97316] text-white shadow-sm"
                  : "glass-subtle text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-zinc-400" />
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="glass-subtle rounded-xl px-3 py-2 text-xs font-medium outline-none min-w-[200px]"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.project_id} value={p.project_id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Media Grid */}
      {loading ? (
        <div className="glass-card rounded-3xl p-12 flex items-center justify-center gap-2 text-sm text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading MinIO assets...
        </div>
      ) : files.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center">
          <p className="text-sm font-semibold">No media files match your current filters</p>
          <p className="text-xs text-zinc-500 mt-1">
            Upload photos, voice notes, or documents from any task to see them indexed here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {files.map((file) => {
            const cat = getFileCategory(file.mimeType);
            const filename = file.objectKey.split("/").pop() || file.fileId;
            return (
              <div
                key={file.fileId}
                className="glass-card rounded-2xl p-4 flex flex-col justify-between gap-4 hover:shadow-md transition"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
                        {cat === "IMAGE" && <ImageIcon className="w-5 h-5" />}
                        {cat === "VIDEO" && <Video className="w-5 h-5" />}
                        {cat === "AUDIO" && <AudioLines className="w-5 h-5" />}
                        {cat === "DOCUMENT" && <FileText className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" title={filename}>
                          {filename}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate">
                          {file.projectTitle || "Project"} • {formatBytes(file.sizeBytes)}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 shrink-0">
                      {cat}
                    </span>
                  </div>

                  {file.taskId && (
                    <button
                      onClick={() => openTaskDrawer(file.taskId!, file.projectId)}
                      className="text-xs font-medium text-orange-600 hover:underline text-left block truncate w-full"
                    >
                      Task: {file.taskTitle || file.taskId}
                    </button>
                  )}

                  {file.audioTranscript && (
                    <div className="glass-subtle rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
                          Voice-to-Text Transcript
                        </span>
                        {file.identifiedLanguages && file.identifiedLanguages.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-500">
                            <Languages className="w-3 h-3" />
                            {file.identifiedLanguages.join(", ")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-700 line-clamp-3 leading-relaxed">
                        {file.audioTranscript}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60">
                  <span className="text-[11px] text-zinc-400">
                    {new Date(file.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenSignedUrl(file)}
                      disabled={openingId === file.fileId}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold glass-subtle hover:bg-white transition"
                    >
                      {openingId === file.fileId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ExternalLink className="w-3.5 h-3.5" />
                      )}
                      Preview
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      disabled={deletingId === file.fileId}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                      title="Delete file from MinIO"
                    >
                      {deletingId === file.fileId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
