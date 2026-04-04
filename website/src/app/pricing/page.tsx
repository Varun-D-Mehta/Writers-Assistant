import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Writers Assistant | AI Novel Writing Software",
  description: "Simple, transparent pricing for Writers Assistant. Start with a free 7-day trial. Plans from $9.99/month. AI-powered novel writing with story bible, context checking, and smart editing.",
  alternates: { canonical: "https://writersassistant.com/pricing" },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const LOGIN_URL = process.env.NEXT_PUBLIC_LOGIN_URL || "http://localhost:9000/auth/google";

const PLANS = [
  {
    name: "Free Trial",
    price: "$0",
    period: "for 7 days",
    description: "Full access to every feature. No credit card required. Export your work before the trial ends.",
    features: [
      "AI writing chat (GPT-4o)",
      "Context checking against story bible",
      "Inline text predictions",
      "Story bible: characters, events, environments, objects",
      "Smart ideas: rewrite, expand, rephrase, fix, restructure",
      "PDF & TXT export / import",
      "Unlimited projects & chapters",
    ],
    cta: "Start Free Trial",
    highlight: false,
  },
  {
    name: "Monthly",
    price: "$9.99",
    period: "/month",
    description: "Everything in the trial, billed monthly. Cancel anytime from the subscription management page.",
    features: [
      "Everything in the free trial",
      "Unlimited AI interactions",
      "Priority response times",
      "Email support",
      "Cancel anytime",
    ],
    cta: "Subscribe Monthly",
    highlight: true,
    badge: "Most Popular",
  },
  {
    name: "Annual",
    price: "$89.99",
    period: "/year",
    description: "Save 25% compared to monthly. Billed annually.",
    features: [
      "Everything in monthly",
      "2 months free",
      "Early access to new features",
      "Priority support",
    ],
    cta: "Subscribe Annually",
    highlight: false,
    savings: "Save $29.89/year",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
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
          <a href="/#features" className="text-sm transition hover:text-white" style={{ color: "var(--text-muted)" }}>
            Features
          </a>
          <a
            href={LOGIN_URL}
            className="rounded-lg px-5 py-2 text-sm font-medium text-white transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg, var(--gold) 0%, #c49b2a 100%)" }}
          >
            Start Writing
          </a>
        </div>
      </nav>

      <section className="mx-auto max-w-5xl px-6 pb-28 pt-20">
        <div className="mb-16 text-center">
          <p
            className="mb-4 text-xs font-medium uppercase tracking-[0.2em]"
            style={{ color: "var(--gold)" }}
          >
            Pricing
          </p>
          <h1 className="text-4xl tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="mx-auto mt-4 max-w-lg" style={{ color: "var(--text-muted)" }}>
            Start with a free trial. Upgrade when you&apos;re ready.
            Every plan includes full access to all AI features.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="feature-card relative flex flex-col rounded-2xl border p-8"
              style={{
                borderColor: plan.highlight ? "var(--border-glow)" : "var(--border)",
                background: plan.highlight
                  ? "linear-gradient(180deg, var(--bg-card) 0%, rgba(212, 175, 55, 0.03) 100%)"
                  : "linear-gradient(180deg, var(--bg-card) 0%, var(--bg-surface) 100%)",
                boxShadow: plan.highlight ? "0 0 40px -10px rgba(212, 175, 55, 0.1)" : "none",
              }}
            >
              {"badge" in plan && plan.badge && (
                <span
                  className="absolute -top-3 left-6 rounded-full px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
                  style={{ background: "var(--gold)" }}
                >
                  {plan.badge}
                </span>
              )}
              {"savings" in plan && plan.savings && (
                <span
                  className="absolute -top-3 right-6 rounded-full border px-3 py-0.5 text-[10px] font-medium"
                  style={{ borderColor: "var(--border-glow)", color: "var(--gold)", background: "var(--bg-deep)" }}
                >
                  {plan.savings}
                </span>
              )}

              <p
                className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: "var(--gold)" }}
              >
                {plan.name}
              </p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-5xl font-light" style={{ fontFamily: "'Instrument Serif', serif", color: "var(--text-bright)" }}>
                  {plan.price}
                </span>
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>{plan.period}</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {plan.description}
              </p>

              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--text-body)" }}>
                    <span className="mt-0.5" style={{ color: "var(--gold)" }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={LOGIN_URL}
                className={`mt-8 block rounded-xl px-4 py-3.5 text-center text-sm font-medium transition ${
                  plan.highlight ? "text-white hover:opacity-90" : "hover:bg-white/[0.03]"
                }`}
                style={
                  plan.highlight
                    ? { background: "linear-gradient(135deg, var(--gold) 0%, #c49b2a 100%)" }
                    : { border: "1px solid var(--border-warm)", color: "var(--text-bright)" }
                }
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Subscription management note */}
        <div
          className="mt-16 rounded-2xl border p-8 text-center"
          style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
        >
          <h3 className="text-lg">Manage Your Subscription</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm" style={{ color: "var(--text-muted)" }}>
            Already subscribed? You can update your payment method, change plans,
            or cancel anytime from the subscription management portal in the app.
          </p>
          <a
            href={LOGIN_URL}
            className="mt-6 inline-block rounded-xl border px-8 py-3 text-sm font-medium transition hover:bg-white/[0.03]"
            style={{ borderColor: "var(--border-warm)", color: "var(--text-bright)" }}
          >
            Go to App → Subscription
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section
        className="border-t py-20"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      >
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl">Questions about pricing?</h2>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            The free trial includes every feature with no restrictions.
            After 7 days, subscribe to continue using AI features.
            Your exported files are always yours — they work offline.
          </p>
          <a
            href="/#faq"
            className="mt-6 inline-block text-sm transition hover:text-white"
            style={{ color: "var(--gold)" }}
          >
            View all FAQs →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t py-12"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--gold)" }}>✒️</span>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Writers Assistant</span>
          </div>
          <div className="flex items-center gap-6 text-xs" style={{ color: "var(--text-muted)" }}>
            <a href="/" className="transition hover:text-white">Home</a>
            <a href="/#faq" className="transition hover:text-white">FAQ</a>
            <a href={LOGIN_URL} className="transition hover:text-white">Sign In</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
