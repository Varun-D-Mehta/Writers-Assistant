"use client";

import type { Environment } from "@/lib/types";

export default function EnvironmentEditor({
  environment,
  onChange,
}: {
  environment: Environment[];
  onChange: (e: Environment[]) => void;
}) {
  function addEnvironment() {
    onChange([...environment, { name: "", description: "", details: {} }]);
  }

  function update(
    index: number,
    field: keyof Environment,
    value: string | Record<string, string>
  ) {
    const updated = [...environment];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  }

  function remove(index: number) {
    onChange(environment.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      {environment.map((env, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-700 bg-slate-800/50 p-4"
        >
          <div className="mb-3 flex items-start justify-between">
            <input
              value={env.name}
              onChange={(e) => update(i, "name", e.target.value)}
              placeholder="Environment / Setting name"
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
            value={env.description}
            onChange={(e) => update(i, "description", e.target.value)}
            placeholder="Description (rules, geography, physics, magic system, etc.)..."
            rows={4}
            className="w-full resize-none rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      ))}
      <button
        onClick={addEnvironment}
        className="w-full rounded-xl border-2 border-dashed border-slate-600 py-3 text-sm text-slate-400 hover:border-blue-500/50 hover:text-blue-400"
      >
        + Add Environment / Setting
      </button>
    </div>
  );
}
