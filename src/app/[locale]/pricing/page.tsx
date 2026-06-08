import Link from 'next/link';
import { PublicFooter } from '@/components/marketing/public-footer';
import { BILLING_PLANS } from '@/lib/billing/plans';

const comparisonRows = [
  { label: 'Users', getValue: (plan: (typeof BILLING_PLANS)[number]) => plan.limits.users },
  { label: 'Documents', getValue: (plan: (typeof BILLING_PLANS)[number]) => plan.limits.documents },
  { label: 'Vendors', getValue: (plan: (typeof BILLING_PLANS)[number]) => plan.limits.vendors },
  { label: 'Risks', getValue: (plan: (typeof BILLING_PLANS)[number]) => plan.limits.risks },
  { label: 'Executive dashboard', getValue: () => 'Included' },
  { label: 'Template library', getValue: () => 'Included' },
  { label: 'Private document storage', getValue: () => 'Included' },
  { label: 'Audit logs', getValue: () => 'Included' },
  { label: 'CSV exports', getValue: () => 'Included' },
];

const valueProof = [
  ['Replace spreadsheet drift', 'Move evidence, vendors, risks and owners into one operational system.'],
  ['Shorten customer reviews', 'Produce board-ready and customer-ready compliance summaries faster.'],
  ['Create upgrade clarity', 'Usage limits are visible and predictable before procurement conversations begin.'],
];

const billingFaqs = [
  {
    question: 'Why publish prices when larger GRC tools ask for a demo?',
    answer: 'EuroComply is designed for European SaaS, fintech and B2B teams that need a clear entry point before enterprise procurement. Larger rollouts can still use custom Enterprise packaging.',
  },
  {
    question: 'Can we change plans later?',
    answer: 'Yes. Billing is managed through Stripe Customer Portal, so owners and admins can update subscriptions when needed.',
  },
  {
    question: 'What happens when we hit a plan limit?',
    answer: 'PlanGate prevents creating more users, documents, vendors or risks until the organization upgrades or reduces usage.',
  },
];

function planPositioning(planId: string) {
  if (planId === 'starter') return 'For founders building their first evidence system.';
  if (planId === 'growth') return 'For growing B2B teams preparing customer and board reviews.';
  return 'For mature teams managing larger vendor, risk and document programs.';
}

export default function PricingPage({ params }: { params: { locale: string } }) {
  return (
    <main className="min-h-screen bg-[#05060a] text-white">
      <header className="border-b border-white/10 bg-[#05060a]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href={`/${params.locale}`} className="text-lg font-bold tracking-tight">EuroComply</Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link href={`/${params.locale}/login`} className="rounded-full border border-white/15 px-4 py-2 font-medium hover:bg-white/10">Sign in</Link>
            <Link href={`/${params.locale}/signup`} className="rounded-full bg-white px-4 py-2 font-semibold text-black hover:bg-white/90">Start free</Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute right-0 top-20 h-[24rem] w-[24rem] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-blue-300/30 bg-blue-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">Transparent B2B pricing</p>
            <h1 className="mt-6 max-w-5xl text-5xl font-semibold tracking-[-0.05em] md:text-7xl">
              Start like a startup. Scale like a regulated company.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              EuroComply gives European teams a clear path from first compliance workspace to board-ready reporting and enterprise controls — without forcing every buyer into a sales call.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/${params.locale}/signup`} className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-black hover:bg-white/90">
                Start with Growth
              </Link>
              <Link href={`/${params.locale}/contact`} className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-bold hover:bg-white/10">
                Talk Enterprise
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Pricing psychology</p>
            <div className="mt-5 grid gap-3">
              {valueProof.map(([title, description]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="font-semibold">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-6 py-16">
        <section className="grid gap-4 lg:grid-cols-4">
          {BILLING_PLANS.map((plan) => {
            const isFeatured = plan.id === 'growth';

            return (
              <article key={plan.id} className={`relative flex rounded-[2rem] border p-6 shadow-xl flex-col transition hover:-translate-y-1 ${isFeatured ? 'border-blue-300 bg-white text-slate-950' : 'border-white/10 bg-slate-950 text-white'}`}>
                {isFeatured && <span className="absolute right-5 top-5 rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">Most popular</span>}
                <div>
                  <h2 className="text-2xl font-semibold">{plan.name}</h2>
                  <p className={`mt-2 text-sm leading-6 ${isFeatured ? 'text-slate-600' : 'text-slate-400'}`}>{planPositioning(plan.id)}</p>
                  <p className="mt-5 text-5xl font-bold">€{plan.priceMonthly}<span className="text-base font-normal text-slate-500">/mo</span></p>
                </div>

                <ul className={`mt-6 space-y-3 text-sm ${isFeatured ? 'text-slate-700' : 'text-slate-300'}`}>
                  <li>{plan.limits.users} users included</li>
                  <li>{plan.limits.documents} documents</li>
                  <li>{plan.limits.vendors} vendors</li>
                  <li>{plan.limits.risks} risks</li>
                </ul>

                <div className={`mt-6 border-t pt-6 ${isFeatured ? 'border-slate-200' : 'border-white/10'}`}>
                  <p className="text-sm font-semibold">Includes</p>
                  <ul className={`mt-3 space-y-2 text-sm ${isFeatured ? 'text-slate-700' : 'text-slate-300'}`}>
                    {plan.features.map((feature) => (
                      <li key={feature}>• {feature}</li>
                    ))}
                  </ul>
                </div>

                <Link
                  href={`/${params.locale}/signup`}
                  className={`mt-auto inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-bold ${isFeatured ? 'bg-slate-950 text-white hover:bg-slate-800' : 'bg-white text-slate-950 hover:bg-slate-100'}`}
                >
                  Start with {plan.name}
                </Link>
              </article>
            );
          })}

          <article className="relative flex rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/[0.10] to-white/[0.03] p-6 text-white shadow-xl flex-col transition hover:-translate-y-1">
            <span className="absolute right-5 top-5 rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-white/70">Anchor tier</span>
            <h2 className="text-2xl font-semibold">Enterprise</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">For regulated teams, consultants and larger European rollouts.</p>
            <p className="mt-5 text-5xl font-bold">Custom</p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              <li>Custom usage limits</li>
              <li>SSO and advanced RBAC roadmap</li>
              <li>Custom DPA and procurement support</li>
              <li>Audit exports and advanced reporting</li>
              <li>Priority onboarding</li>
            </ul>
            <Link href={`/${params.locale}/contact`} className="mt-auto inline-flex h-11 items-center justify-center rounded-full border border-white/15 px-4 text-sm font-bold hover:bg-white/10">
              Talk to us
            </Link>
          </article>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-xl">
          <div className="border-b border-white/10 p-6">
            <h2 className="text-2xl font-semibold">Compare plans</h2>
            <p className="mt-2 text-sm text-slate-400">Limits are enforced inside the product so teams know exactly when to upgrade.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-white/[0.04]">
                <tr>
                  <th className="px-6 py-4 font-medium">Capability</th>
                  {BILLING_PLANS.map((plan) => <th key={plan.id} className="px-6 py-4 font-medium">{plan.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label} className="border-t border-white/10">
                    <td className="px-6 py-4 font-medium text-white">{row.label}</td>
                    {BILLING_PLANS.map((plan) => <td key={plan.id} className="px-6 py-4 text-slate-400">{row.getValue(plan)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {billingFaqs.map((faq) => (
            <article key={faq.question} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <h3 className="font-semibold">{faq.question}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{faq.answer}</p>
            </article>
          ))}
        </section>
      </div>

      <PublicFooter locale={params.locale} />
    </main>
  );
}
