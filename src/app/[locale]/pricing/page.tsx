import Link from 'next/link';
import { BILLING_PLANS } from '@/lib/billing/plans';

const comparisonRows = [
  { label: 'Users', getValue: (plan: (typeof BILLING_PLANS)[number]) => plan.limits.users },
  { label: 'Documents', getValue: (plan: (typeof BILLING_PLANS)[number]) => plan.limits.documents },
  { label: 'Vendors', getValue: (plan: (typeof BILLING_PLANS)[number]) => plan.limits.vendors },
  { label: 'Risks', getValue: (plan: (typeof BILLING_PLANS)[number]) => plan.limits.risks },
  { label: 'Stripe billing portal', getValue: () => 'Included' },
  { label: 'Private document storage', getValue: () => 'Included' },
  { label: 'Audit logs', getValue: () => 'Included' },
];

const billingFaqs = [
  {
    question: 'Can we change plans later?',
    answer: 'Yes. Billing is managed through Stripe Customer Portal, so owners and admins can update subscriptions when needed.',
  },
  {
    question: 'What happens when we hit a plan limit?',
    answer: 'PlanGate prevents creating more users, documents, vendors or risks until the organization upgrades or reduces usage.',
  },
  {
    question: 'Do you store card details?',
    answer: 'No. Payments and card management are handled by Stripe. EuroComply stores subscription status and plan metadata only.',
  },
];

export default function PricingPage({ params }: { params: { locale: string } }) {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-14 px-6 py-16">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pricing</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">Compliance operations without enterprise overhead.</h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Start with the controls your team needs today, then scale documents, vendors, risks and users as your compliance program matures.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {BILLING_PLANS.map((plan) => (
          <article key={plan.id} className="flex rounded-2xl border bg-card p-6 shadow-sm flex-col">
            <div>
              <h2 className="text-2xl font-semibold">{plan.name}</h2>
              <p className="mt-3 text-4xl font-bold">€{plan.priceMonthly}<span className="text-base font-normal text-muted-foreground">/mo</span></p>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li>{plan.limits.users} users included</li>
              <li>{plan.limits.documents} documents</li>
              <li>{plan.limits.vendors} vendors</li>
              <li>{plan.limits.risks} risks</li>
            </ul>

            <div className="mt-6 border-t pt-6">
              <p className="text-sm font-medium">Includes</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
            </div>

            <Link
              href={`/${params.locale}/signup`}
              className="mt-8 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Start with {plan.name}
            </Link>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b p-6">
          <h2 className="text-2xl font-semibold">Compare plans</h2>
          <p className="mt-2 text-sm text-muted-foreground">Limits are enforced inside the product so teams know exactly when to upgrade.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-4 font-medium">Capability</th>
                {BILLING_PLANS.map((plan) => (
                  <th key={plan.id} className="px-6 py-4 font-medium">{plan.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.label} className="border-t">
                  <td className="px-6 py-4 font-medium">{row.label}</td>
                  {BILLING_PLANS.map((plan) => (
                    <td key={plan.id} className="px-6 py-4 text-muted-foreground">{row.getValue(plan)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {billingFaqs.map((faq) => (
          <article key={faq.question} className="rounded-2xl border bg-muted/30 p-6">
            <h3 className="font-semibold">{faq.question}</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border bg-muted/40 p-6 text-center">
        <h2 className="text-2xl font-semibold">Need enterprise controls?</h2>
        <p className="mt-3 text-muted-foreground">
          SSO, custom DPA, advanced audit support and assisted onboarding can be packaged for larger teams.
        </p>
      </section>
    </main>
  );
}
