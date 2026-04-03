import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Writers Assistant — AI Novel Writing Software | Story Bible & Smart Editor",
  description: "The creative writing workspace that understands your story. AI-powered chat, context checking, inline predictions, structured story bible, and smart editing ideas. Write better novels. Free 7-day trial.",
  alternates: { canonical: "https://writersassistant.com" },
};

const APP_URL = "https://app.writersassistant.com";

const FEATURES = [
  {
    tag: "Editor",
    title: "A distraction-free editor that writes with you",
    description: "A rich Tiptap editor with real-time AI text predictions that complete your sentences as you type. Bold, italic, headings, blockquotes — everything you need, nothing you don't.",
    detail: "Inline predictions appear as ghost text. Press Tab to accept. The AI reads your story bible and recent chapters to suggest continuations that match your voice and plot.",
    visual: "✍️",
  },
  {
    tag: "AI Chat",
    title: "Have a conversation about your chapter",
    description: "Ask the AI anything — brainstorm plot twists, develop character motivations, work through pacing issues. Every response is grounded in your story bible and chapter content.",
    detail: "The AI can also propose specific text edits directly from the chat. These appear in your Ideas panel as diff views you can accept or reject with one click.",
    visual: "💬",
  },
  {
    tag: "Story Bible",
    title: "Your world, structured and searchable",
    description: "Dedicated editors for Characters, Events, Environments, and Objects. Each entry has structured fields — traits, descriptions, significance, relationships — not just free-form notes.",
    detail: "The AI reads your entire story bible when answering questions, checking context, or suggesting edits. As your world grows, the AI's understanding grows with it.",
    visual: "📖",
  },
  {
    tag: "Context Check",
    title: "Catch inconsistencies before your readers do",
    description: "One click scans your chapter against the story bible and flags contradictions — wrong eye colors, timeline jumps, characters in two places at once, forgotten details.",
    detail: "Each issue comes with a severity level, the exact quote, and an auto-fix button that generates a corrected version for your review.",
    visual: "🔍",
  },
  {
    tag: "Smart Ideas",
    title: "AI-powered editing at your command",
    description: "Request a rewrite, expansion, rephrasing, or detail addition for any passage. The AI returns a precise diff — original vs. proposed — that you can accept, reject, or iterate on.",
    detail: "Seven idea types: Rewrite, Expand, Fix Typos, Rephrase, Restructure, Add Detail, and Fetch Info (with web search). Every idea preserves your authorial voice.",
    visual: "💡",
  },
  {
    tag: "Export & Import",
    title: "Your work, your format, your backup",
    description: "Export your entire project — manuscript, story bible, and all — as a formatted PDF or structured TXT. Import it back anytime for a perfect round-trip.",
    detail: "The export format uses structured markers so your project can be fully reconstructed on re-import. Nothing is lost — every character trait, environment detail, and chapter paragraph comes back intact.",
    visual: "📤",
  },
];

const FAQS = [
  {
    q: "What AI model does Writers Assistant use?",
    a: "Writers Assistant uses OpenAI's GPT-4o for all AI features — chat, context checking, ideas, and predictions. GPT-4o-mini is used for inline text predictions to keep them fast and responsive.",
  },
  {
    q: "Is my writing data stored permanently?",
    a: "No. Your project data exists only during your active writing session. When you close the tab or log out, the data is automatically cleaned up. Always export your work before ending a session.",
  },
  {
    q: "Can I use my own OpenAI API key?",
    a: "Not yet, but this is on the roadmap. Currently, AI costs are included in your subscription price.",
  },
  {
    q: "What file formats can I import?",
    a: "You can import PDF and TXT files that were previously exported from Writers Assistant. The structured markers in the export ensure a perfect round-trip reconstruction of your project.",
  },
  {
    q: "Is there a word limit or chapter limit?",
    a: "No artificial limits. You can have as many parts, chapters, characters, and story bible entries as your novel needs.",
  },
  {
    q: "Can I cancel my subscription anytime?",
    a: "Yes. You can cancel from the subscription management page at any time. You'll retain access until the end of your current billing period.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* ─── Navigation ─────────────────────────────────── */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <a href="/" className="flex items-center gap-2">
          <span className="text-xl" style={{ color: "var(--gold)" }}>✒️</span>
          <span
            className="text-base tracking-wide"
            style={{ fontFamily: "'Instrument Serif', serif", color: "var(--text-bright)" }}
          >
            Writers Assistant
          </span>
        </a>
        <div className="flex items-center gap-8">
          <a href="#features" className="text-sm transition hover:text-white" style={{ color: "var(--text-muted)" }}>
            Features
          </a>
          <a href="/pricing" className="text-sm transition hover:text-white" style={{ color: "var(--text-muted)" }}>
            Pricing
          </a>
          <a href="#faq" className="text-sm transition hover:text-white" style={{ color: "var(--text-muted)" }}>
            FAQ
          </a>
          <a
            href={APP_URL}
            className="rounded-lg px-5 py-2 text-sm font-medium text-white transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg, var(--gold) 0%, #c49b2a 100%)" }}
          >
            Start Writing
          </a>
        </div>
      </nav>

      {/* ─── Hero ───────────────────────────────────────── */}
      <section className="relative mx-auto max-w-4xl px-6 pb-28 pt-24 text-center">
        <div className="hero-glow" />
        <p
          className="mb-6 text-sm font-medium uppercase tracking-[0.2em] animate-fade-up"
          style={{ color: "var(--gold)", animationDelay: "0s" }}
        >
          AI-Powered Novel Writing Software
        </p>
        <h1
          className="text-6xl leading-[1.1] tracking-tight animate-fade-up"
          style={{ animationDelay: "0.1s" }}
        >
          Write your story with an AI
          <br />
          <em className="italic" style={{ color: "var(--gold)" }}>
            that remembers every detail
          </em>
        </h1>
        <p
          className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          A writing workspace with AI chat, context checking against your story
          bible, inline text predictions, and smart editing ideas — all designed
          for novelists working on complex, long-form fiction.
        </p>
        <div
          className="mt-12 flex items-center justify-center gap-5 animate-fade-up"
          style={{ animationDelay: "0.3s" }}
        >
          <a
            href={APP_URL}
            className="rounded-xl px-10 py-4 text-sm font-semibold text-white shadow-xl transition hover:shadow-2xl"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, #c49b2a 100%)",
              boxShadow: "0 10px 40px -10px rgba(212, 175, 55, 0.3)",
            }}
          >
            Start Your Free Trial
          </a>
          <a
            href="#features"
            className="rounded-xl border px-10 py-4 text-sm font-medium transition hover:bg-white/[0.03]"
            style={{ borderColor: "var(--border-warm)", color: "var(--text-bright)" }}
          >
            See How It Works
          </a>
        </div>
        <p className="mt-5 text-xs" style={{ color: "var(--text-muted)" }}>
          Free for 7 days &middot; No credit card required &middot; Export your work anytime
        </p>
      </section>

      {/* ─── Social proof bar ────────────────────────────── */}
      <div
        className="border-y py-6 text-center"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      >
        <p className="text-sm tracking-wide" style={{ color: "var(--text-muted)" }}>
          Built for novelists, screenwriters, and world-builders who need their AI to
          <span style={{ color: "var(--text-bright)" }}> understand the full picture</span>
        </p>
      </div>

      {/* ─── Features ────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-5xl px-6 py-28">
        <div className="mb-20 text-center">
          <p
            className="mb-4 text-xs font-medium uppercase tracking-[0.2em]"
            style={{ color: "var(--gold)" }}
          >
            Everything You Need
          </p>
          <h2 className="text-4xl tracking-tight">
            Six tools, one workspace
          </h2>
          <p className="mx-auto mt-4 max-w-xl" style={{ color: "var(--text-muted)" }}>
            Every feature reads your story bible and chapter content. The AI doesn&apos;t just generate text — it understands your narrative.
          </p>
        </div>

        <div className="space-y-6">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.tag}
              className="feature-card grid gap-8 rounded-2xl border p-10 md:grid-cols-[1fr_2fr]"
              style={{
                borderColor: "var(--border)",
                background: `linear-gradient(${i % 2 === 0 ? '135deg' : '225deg'}, var(--bg-card) 0%, var(--bg-surface) 100%)`,
                animationDelay: `${i * 0.08}s`,
              }}
            >
              <div className="flex flex-col justify-center">
                <span className="text-4xl">{feature.visual}</span>
                <p
                  className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em]"
                  style={{ color: "var(--gold)" }}
                >
                  {feature.tag}
                </p>
                <h3 className="mt-2 text-xl leading-snug tracking-tight">
                  {feature.title}
                </h3>
                <span className="gold-line" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="leading-relaxed" style={{ color: "var(--text-body)" }}>
                  {feature.description}
                </p>
                <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {feature.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How it works ────────────────────────────────── */}
      <section
        className="border-y py-24"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      >
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-16 text-center">
            <p
              className="mb-4 text-xs font-medium uppercase tracking-[0.2em]"
              style={{ color: "var(--gold)" }}
            >
              How It Works
            </p>
            <h2 className="text-4xl tracking-tight">Three steps to better writing</h2>
          </div>
          <div className="grid gap-12 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Build your world",
                desc: "Create a project and fill in your story bible — characters, events, settings, objects. This is the context your AI will draw from.",
              },
              {
                step: "02",
                title: "Write your chapters",
                desc: "Use the distraction-free editor with inline predictions. Chat with the AI to brainstorm, request ideas for edits, and run context checks.",
              },
              {
                step: "03",
                title: "Export your manuscript",
                desc: "When you're ready, export as PDF or TXT. Your entire project — story bible included — comes out as a formatted document.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <span
                  className="inline-block text-5xl font-light italic"
                  style={{ fontFamily: "'Instrument Serif', serif", color: "var(--gold)", opacity: 0.4 }}
                >
                  {item.step}
                </span>
                <h3 className="mt-3 text-lg">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing teaser ──────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 py-28 text-center">
        <p
          className="mb-4 text-xs font-medium uppercase tracking-[0.2em]"
          style={{ color: "var(--gold)" }}
        >
          Simple Pricing
        </p>
        <h2 className="text-4xl tracking-tight">
          Start free. Subscribe when you&apos;re ready.
        </h2>
        <p className="mx-auto mt-4 max-w-xl" style={{ color: "var(--text-muted)" }}>
          Full access to every feature for 7 days. No credit card required.
          After your trial, plans start at $9.99/month.
        </p>
        <div className="mt-10 flex items-center justify-center gap-5">
          <a
            href="/pricing"
            className="rounded-xl border px-10 py-4 text-sm font-medium transition hover:bg-white/[0.03]"
            style={{ borderColor: "var(--border-warm)", color: "var(--text-bright)" }}
          >
            View All Plans
          </a>
          <a
            href={APP_URL}
            className="rounded-xl px-10 py-4 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg, var(--gold) 0%, #c49b2a 100%)" }}
          >
            Start Free Trial
          </a>
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────────────────── */}
      <section
        id="faq"
        className="border-t py-24"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      >
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-16 text-center">
            <p
              className="mb-4 text-xs font-medium uppercase tracking-[0.2em]"
              style={{ color: "var(--gold)" }}
            >
              Questions & Answers
            </p>
            <h2 className="text-4xl tracking-tight">Frequently asked questions</h2>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border"
                style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
              >
                <summary
                  className="flex cursor-pointer items-center justify-between px-6 py-5 text-sm font-medium"
                  style={{ color: "var(--text-bright)" }}
                >
                  {faq.q}
                  <span
                    className="ml-4 text-lg transition-transform group-open:rotate-45"
                    style={{ color: "var(--gold)" }}
                  >
                    +
                  </span>
                </summary>
                <div className="px-6 pb-5 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ───────────────────────────────────── */}
      <section className="py-28 text-center">
        <h2 className="text-4xl tracking-tight">
          Ready to write your novel?
        </h2>
        <p className="mt-4" style={{ color: "var(--text-muted)" }}>
          Join writers who use AI to stay consistent and productive across complex narratives.
        </p>
        <a
          href={APP_URL}
          className="mt-10 inline-block rounded-xl px-12 py-4 text-sm font-semibold text-white transition hover:shadow-2xl"
          style={{
            background: "linear-gradient(135deg, var(--gold) 0%, #c49b2a 100%)",
            boxShadow: "0 10px 40px -10px rgba(212, 175, 55, 0.3)",
          }}
        >
          Start Your Free 7-Day Trial
        </a>
        <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
          No credit card required &middot; Full access to all features
        </p>
      </section>

      {/* ─── Footer ──────────────────────────────────────── */}
      <footer
        className="border-t py-12"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--gold)" }}>✒️</span>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              Writers Assistant
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs" style={{ color: "var(--text-muted)" }}>
            <a href="/pricing" className="transition hover:text-white">Pricing</a>
            <a href="#faq" className="transition hover:text-white">FAQ</a>
            <a href={APP_URL} className="transition hover:text-white">Sign In</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
