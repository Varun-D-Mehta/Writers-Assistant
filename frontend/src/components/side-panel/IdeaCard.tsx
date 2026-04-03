"use client";

import type { ChapterIdea } from "@/lib/types";
import DiffView from "@/components/ui/DiffView";

interface IdeaCardProps {
  idea: ChapterIdea;
  onAccept: () => void;
  onReject: () => void;
}

export default function IdeaCard({
  idea,
  onAccept,
  onReject,
}: IdeaCardProps) {
  const sourceBadgeClass =
    idea.source === "chat"
      ? "bg-indigo-500/10 text-indigo-400"
      : "bg-amber-500/20 text-amber-400";

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sourceBadgeClass}`}
        >
          {idea.source === "chat" ? "From Chat" : "Auto-Fix"}
        </span>
        <span className="text-xs text-slate-500">{idea.source_label}</span>
      </div>

      <DiffView
        original={idea.original_text}
        proposed={idea.proposed_text}
      />

      <div className="mt-3 flex gap-2">
        <button
          onClick={onAccept}
          className="flex-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500"
        >
          Accept
        </button>
        <button
          onClick={onReject}
          className="flex-1 rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-white/[0.07]"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
