import Link from 'next/link';
import { BILLING_PLANS } from '@/lib/billing/plans';

export default function PricingPage({ params }: { params: { locale: string } }) {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16">
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

      <section className="rounded-2xl border bg-muted/40 p-6 text-center">
        <h2 className="text-2xl font-semibold">Need enterprise controls?</h2>
        <p className="mt-3 text-muted-foreground">
          SSO, custom DPA, advanced audit support and assisted onboarding can be packaged for larger teams.
        </p>
      </section>
    </main>
  );
}
