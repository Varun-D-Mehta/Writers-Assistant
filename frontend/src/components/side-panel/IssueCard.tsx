"use client";

import { useState } from "react";
import type { ContextIssue } from "@/lib/types";

interface IssueCardProps {
  issue: ContextIssue;
  onQuoteClick: (quote: string) => void;
  onAutoFix: (issue: ContextIssue) => Promise<void>;
}

const severityConfig = {
  error: {
    border: "border-red-500/30",
    bg: "bg-red-500/10",
    badge: "bg-red-500/20 text-red-400",
    icon: "🔴",
  },
  warning: {
    border: "border-yellow-500/30",
    bg: "bg-yellow-500/10",
    badge: "bg-yellow-500/20 text-yellow-400",
    icon: "🟡",
  },
  suggestion: {
    border: "border-indigo-500/30",
    bg: "bg-indigo-500/8",
    badge: "bg-indigo-500/10 text-indigo-400",
    icon: "🔵",
  },
};

export default function IssueCard({
  issue,
  onQuoteClick,
  onAutoFix,
}: IssueCardProps) {
  const [fixing, setFixing] = useState(false);
  const config = severityConfig[issue.severity] || severityConfig.suggestion;

  async function handleAutoFix() {
    setFixing(true);
    try {
      await onAutoFix(issue);
    } finally {
      setFixing(false);
    }
  }

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-4`}>
      <div className="mb-2 flex items-center gap-2">
        <span>{config.icon}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${config.badge}`}>
          {issue.severity}
        </span>
        <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-300">
          {issue.type.replace(/_/g, " ")}
        </span>
      </div>

      <h4 className="mb-1 text-sm font-semibold text-slate-200">
        {issue.title}
      </h4>
      <p className="mb-2 text-xs text-slate-400">{issue.description}</p>

      <button
        onClick={() => onQuoteClick(issue.quote)}
        className="mb-3 block w-full cursor-pointer rounded-lg border border-slate-600 bg-slate-800 p-2 text-left text-xs italic text-slate-400 transition hover:border-indigo-500/50 hover:bg-white/[0.07]"
      >
        &ldquo;{issue.quote}&rdquo;
      </button>

      <button
        onClick={handleAutoFix}
        disabled={fixing}
        className="w-full rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-indigo-400 hover:bg-white/[0.07] disabled:opacity-50"
      >
        {fixing ? "Generating fix..." : "Auto-Fix"}
      </button>
    </div>
  );
}
