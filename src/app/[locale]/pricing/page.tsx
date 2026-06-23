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

const trustProof = [
  ['Trust Center', 'Public security, data protection, subprocessor and procurement materials are available before a sales call.'],
  ['Evidence packet', 'Buyer responses use implemented, evidence pending, designed to support and planned status labels.'],
  ['Operational clarity', 'Teams can compare pricing, limits and readiness materials before procurement conversations.'],
];

const billingFaqs = [
  {
    question: 'Why publish prices when larger GRC tools ask for a demo?',
    answer: 'Risck comply is designed for European SaaS, fintech and B2B teams that need a clear entry point before enterprise procurement. Larger rollouts can still use custom Enterprise packaging.',
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
  if (planId === 'essential') return 'For founders building their first evidence system.';
  if (planId === 'professional') return 'For growing B2B teams preparing customer and board reviews.';
  if (planId === 'business') return 'For mature teams managing larger vendor, risk and document programs.';
  return 'For regulated teams that need premium intelligence, enterprise evidence and expanded limits.';
}

function planBadge(planId: string) {
  if (planId === 'professional') return 'Most popular';
  if (planId === 'enterprise') return 'Premium tier';
  return null;
}

type Props = { params: Promise<{ locale: string }> };

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-[#05060a] text-white">
      <header className="border-b border-white/10 bg-[#05060a]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href={`/${locale}`} className="text-lg font-bold tracking-tight">Risck comply</Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link href={`/${locale}/trust`} className="rounded-full border border-white/15 px-4 py-2 font-medium hover:bg-white/10">Trust Center</Link>
            <Link href={`/${locale}/login`} className="rounded-full border border-white/15 px-4 py-2 font-medium hover:bg-white/10">Sign in</Link>
            <Link href={`/${locale}/signup`} className="rounded-full bg-white px-4 py-2 font-semibold text-black hover:bg-white/90">Start free</Link>
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
              Risck comply gives European teams a clear path from first compliance workspace to board-ready reporting and enterprise controls.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/${locale}/signup?plan=professional`} className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-black hover:bg-white/90">
                Start with Professional
              </Link>
              <Link href={`/${locale}/trust`} className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-bold hover:bg-white/10">
                Review Trust Center
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Buyer clarity</p>
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
            const isFeatured = plan.id === 'professional';
            const badge = planBadge(plan.id);
            const isEnterprise = plan.id === 'enterprise';

            return (
              <article key={plan.id} className={`relative flex rounded-[2rem] border p-6 shadow-xl flex-col transition hover:-translate-y-1 ${isFeatured ? 'border-blue-300 bg-white text-slate-950' : isEnterprise ? 'border-emerald-300/40 bg-gradient-to-b from-emerald-300/15 to-slate-950 text-white' : 'border-white/10 bg-slate-950 text-white'}`}>
                {badge && <span className={`absolute right-5 top-5 rounded-full px-3 py-1 text-xs font-bold ${isFeatured ? 'bg-slate-950 text-white' : 'border border-emerald-300/40 text-emerald-100'}`}>{badge}</span>}
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
                  href={`/${locale}/signup?plan=${plan.id}`}
                  className={`mt-auto inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-bold ${isFeatured ? 'bg-slate-950 text-white hover:bg-slate-800' : 'bg-white text-slate-950 hover:bg-slate-100'}`}
                >
                  Start with {plan.name}
                </Link>
              </article>
            );
          })}
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
          {trustProof.map(([title, description]) => (
            <article key={title} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
            </article>
          ))}
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

      <PublicFooter locale={locale} />
    </main>
  );
}
