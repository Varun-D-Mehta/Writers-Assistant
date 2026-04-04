"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { API_BASE } from "@/lib/constants";
import type { Project } from "@/lib/types";
import ProjectLogo from "@/components/ui/ProjectLogo";
import WelcomeModal from "@/components/WelcomeModal";

const PROGRESS_STEPS: Record<string, { pct: number; label: string }> = {
  extract: { pct: 10, label: "Reading file..." },
  extract_done: { pct: 30, label: "Text extracted" },
  parse: { pct: 50, label: "Parsing export format..." },
  parse_done: { pct: 75, label: "Structure parsed" },
  create: { pct: 90, label: "Creating project..." },
  done: { pct: 100, label: "Import complete!" },
};

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    pct: number;
    label: string;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const data = await apiFetch<Project[]>("/api/projects");
      setProjects(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportProgress({ pct: 5, label: "Uploading..." });
    setImportError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/api/import/pdf`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok || !res.body) {
        setImportError("Upload failed");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.error) {
              setImportError(data.error);
              setImportProgress(null);
              return;
            }

            if (data.step && PROGRESS_STEPS[data.step]) {
              setImportProgress(PROGRESS_STEPS[data.step]);
            }

            if (data.step === "done" && data.project?.slug) {
              await loadProjects();
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      }
    } catch (err) {
      setImportError("Import failed — check the console for details");
      console.error("Import error:", err);
    } finally {
      setTimeout(() => {
        setImporting(false);
        setImportProgress(null);
      }, 1500);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await apiFetch<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ title: title.trim() }),
    });
    setTitle("");
    setShowCreate(false);
    loadProjects();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <WelcomeModal />
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">
            Writers Assistant
          </h1>
          <p className="mt-1 text-sm text-slate-500">Your creative writing workspace</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="rounded-lg border px-4 py-2 text-sm text-slate-400 transition hover:text-indigo-400 disabled:opacity-50"
            style={{ borderColor: "var(--border-strong)" }}
          >
            {importing ? "Importing..." : "Import Project"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-500 hover:shadow-indigo-500/30"
          >
            New Project
          </button>
        </div>
      </div>

      {/* Import progress bar */}
      {importProgress && (
        <div className="mb-6 rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-slate-300">{importProgress.label}</span>
            <span className="text-xs text-slate-500">{importProgress.pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-3)" }}>
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500 ease-out"
              style={{ width: `${importProgress.pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Import error */}
      {importError && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm text-red-400">{importError}</p>
          <button
            onClick={() => setImportError(null)}
            className="mt-2 text-xs text-red-500 hover:text-red-400"
          >
            Dismiss
          </button>
        </div>
      )}

      {showCreate && (
        <form onSubmit={createProject} className="mb-8 flex gap-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Project title..."
            className="flex-1 rounded-lg border px-4 py-2 text-sm text-slate-200 placeholder-slate-600 transition focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            style={{ borderColor: "var(--border-strong)", background: "var(--surface-2)" }}
          />
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            className="rounded-lg border px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
            style={{ borderColor: "var(--border-strong)" }}
          >
            Cancel
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : projects.length === 0 ? (
        <div
          className="rounded-2xl border-2 border-dashed p-16 text-center"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="text-lg text-slate-400">No projects yet</p>
          <p className="mt-1 text-sm text-slate-600">
            Create your first project or import an exported file
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <Link
              key={project.slug}
              href={`/projects/${project.slug}`}
              className="group rounded-xl border p-6 transition-all duration-200 hover:glow-sm"
              style={{
                borderColor: "var(--border)",
                background: "linear-gradient(135deg, var(--surface-1) 0%, var(--surface-2) 100%)",
              }}
            >
              <h2 className="flex items-center gap-2.5 text-lg font-semibold text-slate-100 transition group-hover:text-indigo-300">
                <ProjectLogo logo={project.logo} size="sm" />
                {project.title}
              </h2>
              <p className="mt-2 text-xs text-slate-500">
                Created {new Date(project.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
