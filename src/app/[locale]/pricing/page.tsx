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
  { label: 'Stripe billing portal', getValue: () => 'Included' },
  { label: 'Private document storage', getValue: () => 'Included' },
  { label: 'Audit logs', getValue: () => 'Included' },
];

const billingFaqs = [
  {
    question: 'Why publish prices when larger GRC tools ask for a demo?',
    answer: 'EuroComply is designed for European SaaS, fintech and B2B teams that want a clear starting point before enterprise procurement. Larger rollouts can still use custom Enterprise packaging.',
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

export default function PricingPage({ params }: { params: { locale: string } }) {
  return (
    <main className="min-h-screen bg-[#05060a] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute left-1/2 top-0 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-6 py-20 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-blue-200">Pricing strategy</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.05em] md:text-7xl">
            Premium compliance operations without enterprise procurement drag.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Start with a clear monthly plan, then expand toward enterprise controls as your evidence library, vendors, risks and team grow.
          </p>
        </div>
      </section>

      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-6 py-16">
        <section className="grid gap-4 lg:grid-cols-4">
          {BILLING_PLANS.map((plan) => {
            const isFeatured = plan.id === 'growth';

            return (
              <article key={plan.id} className={`relative flex rounded-3xl border p-6 shadow-xl flex-col ${isFeatured ? 'border-blue-300 bg-white text-slate-950' : 'border-white/10 bg-slate-950 text-white'}`}>
                {isFeatured && <span className="absolute right-5 top-5 rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">Most popular</span>}
                <div>
                  <h2 className="text-2xl font-semibold">{plan.name}</h2>
                  <p className="mt-3 text-5xl font-bold">€{plan.priceMonthly}<span className={`text-base font-normal ${isFeatured ? 'text-slate-500' : 'text-slate-500'}`}>/mo</span></p>
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
                  className={`mt-8 inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-bold ${isFeatured ? 'bg-slate-950 text-white hover:bg-slate-800' : 'bg-white text-slate-950 hover:bg-slate-100'}`}
                >
                  Start with {plan.name}
                </Link>
              </article>
            );
          })}

          <article className="relative flex rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.03] p-6 text-white shadow-xl flex-col">
            <h2 className="text-2xl font-semibold">Enterprise</h2>
            <p className="mt-3 text-5xl font-bold">Custom</p>
            <p className="mt-4 text-sm leading-6 text-slate-300">For regulated teams, consultants and larger European rollouts.</p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              <li>Custom usage limits</li>
              <li>SSO roadmap</li>
              <li>Custom DPA</li>
              <li>Audit exports</li>
              <li>Priority support</li>
            </ul>
            <Link href={`/${params.locale}/contact`} className="mt-8 inline-flex h-11 items-center justify-center rounded-full border border-white/15 px-4 text-sm font-bold hover:bg-white/10">
              Talk to us
            </Link>
          </article>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-xl">
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
            <article key={faq.question} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
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
