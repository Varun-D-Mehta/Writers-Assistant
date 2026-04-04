"use client";

import type { Character } from "@/lib/types";

export default function CharactersEditor({
  characters,
  onChange,
}: {
  characters: Character[];
  onChange: (c: Character[]) => void;
}) {
  function addCharacter() {
    onChange([
      ...characters,
      { name: "", description: "", traits: [], notes: "" },
    ]);
  }

  function update(
    index: number,
    field: keyof Character,
    value: string | string[]
  ) {
    const updated = [...characters];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  }

  function remove(index: number) {
    onChange(characters.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-5">
      {characters.map((char, i) => (
        <div
          key={i}
          className="rounded-xl border p-5"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        >
          {/* Header: name + remove */}
          <div className="mb-5 flex items-start justify-between">
            <input
              value={char.name}
              onChange={(e) => update(i, "name", e.target.value)}
              placeholder="Character name"
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
                value={char.description}
                onChange={(e) => update(i, "description", e.target.value)}
                placeholder="Background, appearance, personality, abilities..."
                rows={3}
                className="w-full resize-none rounded-lg border px-3 py-2.5 text-sm leading-relaxed text-slate-200 placeholder-slate-600 transition focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
              />
            </div>

            {/* Traits */}
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Traits
              </label>
              <input
                value={char.traits.join(", ")}
                onChange={(e) =>
                  update(i, "traits", e.target.value.split(",").map((t) => t.trim()))
                }
                placeholder="brave, loyal, secretive..."
                className="w-full rounded-lg border px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 transition focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
              />
              <p className="mt-1 text-[10px] text-slate-600">Comma-separated</p>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Notes
              </label>
              <textarea
                value={char.notes}
                onChange={(e) => update(i, "notes", e.target.value)}
                placeholder="Relationships, arc notes, key scenes..."
                rows={2}
                className="w-full resize-none rounded-lg border px-3 py-2.5 text-sm leading-relaxed text-slate-200 placeholder-slate-600 transition focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
              />
            </div>
          </div>
        </div>
      ))}
      <button
        onClick={addCharacter}
        className="w-full rounded-xl border-2 border-dashed py-4 text-sm text-slate-500 transition hover:border-indigo-500/30 hover:text-indigo-400"
        style={{ borderColor: "var(--border)" }}
      >
        + Add Character
      </button>
    </div>
  );
}
