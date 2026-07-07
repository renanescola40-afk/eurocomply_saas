import { PublicFooter } from '@/components/marketing/public-footer';

const faqs = [
  {
    group: 'Product',
    items: [
      ['What does RISCK COMPLY manage?', 'RISCK COMPLY centralizes compliance tasks, documents, vendors, risks, templates, audit logs, team access and executive reporting.'],
      ['Is RISCK COMPLY advisory software?', 'RISCK COMPLY is compliance operations software. Professional interpretation should be reviewed by qualified advisors.'],
      ['Can we generate reports for leadership?', 'Yes. The product includes executive reports, printable reports and CSV exports for operational review.'],
    ],
  },
  {
    group: 'Security and data',
    items: [
      ['Is the product multi-tenant?', 'Yes. Organizations are isolated by organization_id and protected through authentication, membership checks and Supabase policies.'],
      ['How are documents handled?', 'Documents are stored in private storage with controlled upload flows and signed access patterns.'],
      ['Do you track audit events?', 'Yes. Key actions such as document creation, invitations, billing sessions and organization creation are logged.'],
    ],
  },
  {
    group: 'Billing',
    items: [
      ['How does billing work?', 'Stripe Checkout, Stripe Customer Portal and webhook-based subscription syncing are built in.'],
      ['What happens near a plan limit?', 'The billing screen shows current usage and warns when usage approaches or reaches plan limits.'],
      ['Can we upgrade later?', 'Yes. Owners and admins can start checkout for a new plan or manage billing through Stripe.'],
    ],
  },
];

type FaqPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function FaqPage({ params }: FaqPageProps) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">FAQ</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">Questions before adopting RISCK COMPLY</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
          A practical overview for founders, compliance leaders and operators evaluating RISCK COMPLY for AI governance operations.
        </p>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 md:grid-cols-3">
        {faqs.map((group) => (
          <article key={group.group} className="rounded-3xl border bg-card p-6">
            <h2 className="text-2xl font-semibold">{group.group}</h2>
            <div className="mt-6 space-y-6">
              {group.items.map(([question, answer]) => (
                <div key={question}>
                  <h3 className="font-semibold">{question}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{answer}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <PublicFooter locale={locale} />
    </main>
  );
}
