"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { API_BASE } from "@/lib/constants";
import type { StoryBible, StoryMetadata } from "@/lib/types";
import MetadataEditor from "@/components/story-bible/MetadataEditor";
import StoryBibleChat from "@/components/side-panel/StoryBibleChat";

const DEFAULT_METADATA: StoryMetadata = {
  title: "",
  genre: "",
  setting: "",
  time_period: "",
  pov: "",
  tone: "",
  synopsis: "",
};

export default function ProjectPage() {
  const params = useParams<{ projectSlug: string }>();
  const [bible, setBible] = useState<StoryBible | null>(null);
  const [saving, setSaving] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);

  useEffect(() => {
    apiFetch<StoryBible>(
      `/api/projects/${params.projectSlug}/story-bible`
    ).then((data) => {
      setBible({ ...data, metadata: data.metadata ?? DEFAULT_METADATA });
    });
  }, [params.projectSlug]);

  async function saveBible(updated: StoryBible) {
    setSaving(true);
    setBible(updated);
    try {
      await apiFetch(`/api/projects/${params.projectSlug}/story-bible`, {
        method: "PUT",
        body: JSON.stringify(updated),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleExport(format: "pdf" | "txt") {
    const url = `${API_BASE}/api/projects/${params.projectSlug}/export/${format}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${params.projectSlug}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error("Export failed:", err);
    }
  }

  if (!bible) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-500">Loading story bible...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div
        className={`overflow-y-auto p-6 transition-all ${chatCollapsed ? "flex-1" : "w-[65%]"}`}
      >
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-100">
              Story Bible &mdash; Overview
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleExport("txt")}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
              >
                Export TXT
              </button>
              <button
                onClick={() => handleExport("pdf")}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
              >
                Export PDF
              </button>
              <span className="text-xs text-slate-500">
                {saving ? "Saving..." : ""}
              </span>
            </div>
          </div>

          <MetadataEditor
            metadata={bible.metadata ?? DEFAULT_METADATA}
            onChange={(metadata) => saveBible({ ...bible, metadata })}
          />
        </div>
      </div>

      <div
        className={`overflow-hidden border-l border-slate-700/50 bg-slate-900 transition-all ${chatCollapsed ? "w-12" : "w-[35%]"}`}
      >
        {chatCollapsed ? (
          <div className="flex flex-col items-center gap-3 pt-3">
            <button
              onClick={() => setChatCollapsed(false)}
              className="rounded p-1.5 text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"
              title="Expand chat"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setChatCollapsed(false)}
              className="rounded p-1.5 text-slate-500 hover:bg-white/[0.05]"
              title="Chat"
            >
              💬
            </button>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="flex items-center border-b border-slate-700/50 bg-slate-900 px-3 py-2.5">
              <span className="flex-1 text-xs font-medium text-blue-400">
                💬 Story Bible Chat
              </span>
              <button
                onClick={() => setChatCollapsed(true)}
                className="px-2 py-1 text-slate-500 hover:text-slate-300"
                title="Collapse chat"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <StoryBibleChat projectSlug={params.projectSlug} />
          </div>
        )}
      </div>
    </div>
  );
}
