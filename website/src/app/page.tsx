const APP_URL = "https://app.writersassistant.com";

const FEATURES = [
  {
    icon: "✍️",
    title: "Rich Text Editor",
    description: "A distraction-free Tiptap editor with inline AI predictions that complete your sentences as you write.",
  },
  {
    icon: "💬",
    title: "AI Writing Chat",
    description: "Context-aware conversations about your chapter. Ask for suggestions, brainstorm plot points, or get unstuck.",
  },
  {
    icon: "📖",
    title: "Story Bible",
    description: "Structured editors for characters, events, environments, and objects. Your world-building stays organized and consistent.",
  },
  {
    icon: "🔍",
    title: "Context Checking",
    description: "AI scans your chapters against your story bible and flags inconsistencies — wrong eye colors, timeline contradictions, forgotten details.",
  },
  {
    icon: "📝",
    title: "Smart Proposals",
    description: "Request rewrites, expansions, or fixes. Review changes in a diff view and accept or reject with one click.",
  },
  {
    icon: "📤",
    title: "Export Anywhere",
    description: "Export your complete project as PDF or TXT — story bible included. Import it back anytime.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-lg font-bold tracking-tight text-slate-100">
          Writers Assistant
        </span>
        <div className="flex items-center gap-6">
          <a href="/pricing" className="text-sm text-slate-400 transition hover:text-slate-200">
            Pricing
          </a>
          <a
            href={APP_URL}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-500"
          >
            Get Started
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pb-24 pt-20 text-center">
        <h1 className="text-5xl font-bold leading-tight tracking-tight text-slate-100">
          Write your novel with
          <br />
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            AI that understands your story
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
          A writing workspace with AI chat, context checking, inline predictions,
          and a structured story bible — all designed to keep your narrative consistent
          across complex, long-form fiction.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <a
            href={APP_URL}
            className="rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-xl shadow-indigo-500/25 transition hover:bg-indigo-500 hover:shadow-indigo-500/30"
          >
            Start Writing Free
          </a>
          <a
            href="/pricing"
            className="rounded-xl border px-8 py-3.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05]"
            style={{ borderColor: "var(--border-strong)" }}
          >
            View Pricing
          </a>
        </div>
        <p className="mt-4 text-xs text-slate-600">
          7-day free trial. No credit card required.
        </p>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-32">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border p-8 transition hover:shadow-lg"
              style={{
                borderColor: "var(--border)",
                background: "linear-gradient(180deg, var(--surface-1) 0%, var(--surface-2) 100%)",
              }}
            >
              <span className="text-2xl">{feature.icon}</span>
              <h3 className="mt-4 text-base font-semibold text-slate-100">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t py-20 text-center" style={{ borderColor: "var(--border)" }}>
        <h2 className="text-2xl font-bold text-slate-100">
          Ready to write your story?
        </h2>
        <p className="mt-2 text-slate-500">
          Join writers who use AI to stay consistent and productive.
        </p>
        <a
          href={APP_URL}
          className="mt-8 inline-block rounded-xl bg-indigo-600 px-10 py-3.5 text-sm font-semibold text-white shadow-xl shadow-indigo-500/25 transition hover:bg-indigo-500"
        >
          Start Your Free Trial
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-xs text-slate-600" style={{ borderColor: "var(--border)" }}>
        Writers Assistant
      </footer>
    </div>
  );
}
