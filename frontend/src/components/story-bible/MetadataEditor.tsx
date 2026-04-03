"use client";

import type { StoryMetadata } from "@/lib/types";

export default function MetadataEditor({
  metadata,
  onChange,
}: {
  metadata: StoryMetadata;
  onChange: (m: StoryMetadata) => void;
}) {
  function update(field: keyof StoryMetadata, value: string) {
    onChange({ ...metadata, [field]: value });
  }

  const fields: {
    key: keyof StoryMetadata;
    label: string;
    type: "input" | "textarea";
  }[] = [
    { key: "title", label: "Story Title", type: "input" },
    { key: "genre", label: "Genre", type: "input" },
    { key: "setting", label: "Setting", type: "input" },
    { key: "time_period", label: "Time Period", type: "input" },
    { key: "pov", label: "Point of View", type: "input" },
    { key: "tone", label: "Tone & Style", type: "input" },
    { key: "synopsis", label: "Synopsis", type: "textarea" },
  ];

  return (
    <div className="rounded-xl border border-slate-700 bg-[var(--surface-2)] p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-300">
        General Information
      </h3>
      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              {field.label}
            </label>
            {field.type === "textarea" ? (
              <textarea
                value={metadata[field.key]}
                onChange={(e) => update(field.key, e.target.value)}
                placeholder={`Enter ${field.label.toLowerCase()}...`}
                rows={4}
                className="w-full resize-none rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            ) : (
              <input
                value={metadata[field.key]}
                onChange={(e) => update(field.key, e.target.value)}
                placeholder={`Enter ${field.label.toLowerCase()}...`}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
