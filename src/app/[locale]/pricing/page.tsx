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
    answer: 'RISCK COMPLY is designed for European SaaS, fintech and B2B teams that need a clear entry point before enterprise procurement. Larger rollouts can still use custom Enterprise packaging.',
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
  return 'For regulated teams that need premium intelligence, enterprise evidence and expanded limits.';
}

function planBadge(planId: string) {
  if (planId === 'growth') return 'Most popular';
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
          <Link href={`/${locale}`} className="text-lg font-bold tracking-tight">RISCK COMPLY</Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link href={`/${locale}/trust`} className="rounded-full border border-white/15 px-4 py-2 font-medium hover:bg-white/10">Trust Center</Link>
            <Link href={`/${locale}/login`} className="rounded-full border border-white/15 px-4 py-2 font-medium hover:bg-white/10">Sign in</Link>
            <Link href={`/${locale}/signup?plan=growth`} className="rounded-full bg-white px-4 py-2 font-semibold text-black hover:bg-white/90">Start now</Link>
          </nav>
        </div>
      </header>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-blue-300/30 bg-blue-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">Transparent B2B pricing</p>
            <h1 className="mt-6 max-w-5xl text-5xl font-semibold tracking-[-0.05em] md:text-7xl">Start like a startup. Scale like a regulated company.</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">RISCK COMPLY gives European teams a clear path from first compliance workspace to board-ready reporting and enterprise controls.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/${locale}/signup?plan=growth`} className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-black hover:bg-white/90">Start with Growth</Link>
              <Link href={`/${locale}/trust`} className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-bold hover:bg-white/10">Review Trust Center</Link>
            </div>
          </div>
        </div>
      </section>
      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-6 py-16">
        <section className="grid gap-4 lg:grid-cols-4">
          {BILLING_PLANS.map((plan) => {
            const planId = plan.id;
            const isFeatured = planId === 'growth';
            const badge = planBadge(planId);
            const isEnterprise = planId === 'enterprise';
            return (
              <article key={plan.id} className={`relative flex rounded-[2rem] border p-6 shadow-xl flex-col transition hover:-translate-y-1 ${isFeatured ? 'border-blue-300 bg-white text-slate-950' : isEnterprise ? 'border-emerald-300/40 bg-gradient-to-b from-emerald-300/15 to-slate-950 text-white' : 'border-white/10 bg-slate-950 text-white'}`}>
                {badge && <span className={`absolute right-5 top-5 rounded-full px-3 py-1 text-xs font-bold ${isFeatured ? 'bg-slate-950 text-white' : 'border border-emerald-300/40 text-emerald-100'}`}>{badge}</span>}
                <div className="flex flex-1 flex-col">
                  <h2 className="text-2xl font-semibold">{plan.name}</h2>
                  <p className={`mt-2 text-sm leading-6 ${isFeatured ? 'text-slate-600' : 'text-slate-400'}`}>{planPositioning(planId)}</p>
                  <p className="mt-5 text-5xl font-bold">€{plan.priceMonthly}<span className="text-base font-normal text-slate-500">/mo</span></p>
                  <Link
                    href={`/${locale}/signup?plan=${plan.id}`}
                    className={`mt-8 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-bold ${isFeatured ? 'bg-slate-950 text-white hover:bg-slate-800' : 'border border-white/15 text-white hover:bg-white/10'}`}
                  >
                    Start with {plan.name}
                  </Link>
                </div>
              </article>
            );
          })}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {valueProof.map(([title, text]) => (
            <article key={title} className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{text}</p>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950">
          <div className="border-b border-white/10 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">Plan comparison</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Compare limits and buyer-ready controls.</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/[0.03] text-left text-slate-300">
                <tr>
                  <th className="px-6 py-4 font-semibold">Capability</th>
                  {BILLING_PLANS.map((plan) => (
                    <th key={plan.id} className="px-6 py-4 font-semibold">{plan.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <td className="px-6 py-4 font-medium text-white">{row.label}</td>
                    {BILLING_PLANS.map((plan) => (
                      <td key={`${row.label}-${plan.id}`} className="px-6 py-4 text-slate-300">{row.getValue(plan)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {trustProof.map(([title, text]) => (
            <article key={title} className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{text}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">Billing FAQ</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {billingFaqs.map((faq) => (
              <article key={faq.question} className="rounded-[1.5rem] border border-white/10 bg-slate-950 p-5">
                <h2 className="font-semibold">{faq.question}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
      <PublicFooter locale={locale} />
    </main>
  );
}
