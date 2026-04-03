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
    <div className="space-y-4">
      {characters.map((char, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-700 bg-[var(--surface-2)] p-4"
        >
          <div className="mb-3 flex items-start justify-between">
            <input
              value={char.name}
              onChange={(e) => update(i, "name", e.target.value)}
              placeholder="Character name"
              className="bg-transparent text-lg font-semibold text-slate-100 placeholder-slate-500 focus:outline-none"
            />
            <button
              onClick={() => remove(i)}
              className="text-xs text-slate-500 hover:text-red-400"
            >
              Remove
            </button>
          </div>
          <textarea
            value={char.description}
            onChange={(e) => update(i, "description", e.target.value)}
            placeholder="Description..."
            rows={2}
            className="mb-2 w-full resize-none rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          <input
            value={char.traits.join(", ")}
            onChange={(e) =>
              update(
                i,
                "traits",
                e.target.value.split(",").map((t) => t.trim())
              )
            }
            placeholder="Traits (comma-separated)"
            className="mb-2 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          <textarea
            value={char.notes}
            onChange={(e) => update(i, "notes", e.target.value)}
            placeholder="Notes..."
            rows={1}
            className="w-full resize-none rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      ))}
      <button
        onClick={addCharacter}
        className="w-full rounded-xl border-2 border-dashed border-slate-600 py-3 text-sm text-slate-400 hover:border-indigo-500/50 hover:text-indigo-400"
      >
        + Add Character
      </button>
    </div>
  );
}
