"use client";

import type { StoryObject } from "@/lib/types";

export default function ObjectsEditor({
  objects,
  onChange,
}: {
  objects: StoryObject[];
  onChange: (o: StoryObject[]) => void;
}) {
  function addObject() {
    onChange([
      ...objects,
      { name: "", description: "", significance: "", notes: "" },
    ]);
  }

  function update(index: number, field: keyof StoryObject, value: string) {
    const updated = [...objects];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  }

  function remove(index: number) {
    onChange(objects.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-5">
      {objects.map((obj, i) => (
        <div
          key={i}
          className="rounded-xl border p-5"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        >
          {/* Header */}
          <div className="mb-5 flex items-start justify-between">
            <input
              value={obj.name}
              onChange={(e) => update(i, "name", e.target.value)}
              placeholder="Object name"
              className="bg-transparent text-lg font-semibold text-slate-100 placeholder-slate-600 focus:outline-none"
            />
            <button
              onClick={() => remove(i)}
              className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-600 transition hover:bg-red-500/10 hover:text-red-400"
            >
              Remove
            </button>
          </div>

          <div className="space-y-4">
            {/* Description */}
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Description
              </label>
              <textarea
                value={obj.description}
                onChange={(e) => update(i, "description", e.target.value)}
                placeholder="What it looks like, where it's found, how it works..."
                rows={3}
                className="w-full resize-none rounded-lg border px-3 py-2.5 text-sm leading-relaxed text-slate-200 placeholder-slate-600 transition focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
              />
            </div>

            {/* Significance */}
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Significance
              </label>
              <input
                value={obj.significance}
                onChange={(e) => update(i, "significance", e.target.value)}
                placeholder="Why this object matters to the story..."
                className="w-full rounded-lg border px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 transition focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Notes
              </label>
              <textarea
                value={obj.notes}
                onChange={(e) => update(i, "notes", e.target.value)}
                placeholder="Location, history, who possesses it..."
                rows={2}
                className="w-full resize-none rounded-lg border px-3 py-2.5 text-sm leading-relaxed text-slate-200 placeholder-slate-600 transition focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
              />
            </div>
          </div>
        </div>
      ))}
      <button
        onClick={addObject}
        className="w-full rounded-xl border-2 border-dashed py-4 text-sm text-slate-500 transition hover:border-indigo-500/30 hover:text-indigo-400"
        style={{ borderColor: "var(--border)" }}
      >
        + Add Object
      </button>
    </div>
  );
}
