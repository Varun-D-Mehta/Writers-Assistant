"use client";

import { diffWords } from "diff";

interface DiffViewProps {
  original: string;
  proposed: string;
}

export default function DiffView({ original, proposed }: DiffViewProps) {
  const changes = diffWords(original, proposed);

  return (
    <div className="rounded-lg border border-slate-600 bg-slate-900 p-3 text-sm leading-relaxed text-slate-300">
      {changes.map((change, i) => {
        if (change.added) {
          return (
            <span
              key={i}
              className="rounded bg-green-500/20 text-green-400"
            >
              {change.value}
            </span>
          );
        }
        if (change.removed) {
          return (
            <span
              key={i}
              className="rounded bg-red-500/20 text-red-400 line-through"
            >
              {change.value}
            </span>
          );
        }
        return <span key={i}>{change.value}</span>;
      })}
    </div>
  );
}
