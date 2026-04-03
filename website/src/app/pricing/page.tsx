const APP_URL = "https://app.writersassistant.com";

const PLANS = [
  {
    name: "Free Trial",
    price: "$0",
    period: "for 7 days",
    description: "Full access to everything. No credit card required.",
    features: [
      "AI writing chat",
      "Context checking",
      "Inline text predictions",
      "Story bible management",
      "Smart proposals (rewrite, expand, fix)",
      "PDF & TXT export/import",
    ],
    cta: "Start Free Trial",
    highlight: false,
  },
  {
    name: "Monthly",
    price: "$9.99",
    period: "/month",
    description: "Everything in the trial, billed monthly. Cancel anytime.",
    features: [
      "Everything in the free trial",
      "Unlimited AI interactions",
      "Priority response times",
      "Email support",
    ],
    cta: "Subscribe Monthly",
    highlight: true,
  },
  {
    name: "Annual",
    price: "$89.99",
    period: "/year",
    description: "Save 25% with annual billing.",
    features: [
      "Everything in monthly",
      "2 months free",
      "Early access to new features",
    ],
    cta: "Subscribe Annually",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <a href="/" className="text-lg font-bold tracking-tight text-slate-100">
          Writers Assistant
        </a>
        <a
          href={APP_URL}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          Get Started
        </a>
      </nav>

      <section className="mx-auto max-w-5xl px-6 pb-32 pt-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-100">
            Simple, transparent pricing
          </h1>
          <p className="mt-2 text-slate-400">
            Start free, upgrade when you&apos;re ready.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-8 ${plan.highlight ? "glow-sm" : ""}`}
              style={{
                borderColor: plan.highlight ? "var(--border-strong)" : "var(--border)",
                background: "linear-gradient(180deg, var(--surface-1) 0%, var(--surface-2) 100%)",
              }}
            >
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                {plan.name}
              </h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-100">{plan.price}</span>
                <span className="text-sm text-slate-500">{plan.period}</span>
              </div>
              <p className="mt-3 text-sm text-slate-400">{plan.description}</p>

              <ul className="mt-6 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="mt-0.5 text-indigo-400">&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={APP_URL}
                className={`mt-8 block rounded-xl px-4 py-3 text-center text-sm font-medium transition ${
                  plan.highlight
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500"
                    : "border text-slate-300 hover:bg-white/[0.05]"
                }`}
                style={plan.highlight ? {} : { borderColor: "var(--border-strong)" }}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
