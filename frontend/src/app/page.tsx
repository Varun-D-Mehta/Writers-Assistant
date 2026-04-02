"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { API_BASE } from "@/lib/constants";
import type { Project } from "@/lib/types";
import ProjectLogo from "@/components/ui/ProjectLogo";

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
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

  async function handleImportPDF(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/api/import/pdf`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.slug) {
        loadProjects();
      }
    } finally {
      setImporting(false);
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
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-100">Writers Assistant</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
          >
            {importing ? "Importing..." : "Import PDF"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleImportPDF}
            className="hidden"
          />
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            New Project
          </button>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={createProject} className="mb-8 flex gap-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Project title..."
            className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800"
          >
            Cancel
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-700 p-12 text-center">
          <p className="text-lg text-slate-400">No projects yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Create your first project to get started
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <Link
              key={project.slug}
              href={`/projects/${project.slug}`}
              className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 transition hover:border-blue-500/50 hover:bg-slate-800"
            >
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
                <ProjectLogo logo={project.logo} size="sm" />
                {project.title}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Created {new Date(project.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
