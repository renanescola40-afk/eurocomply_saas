import Link from 'next/link';

const features = [
  {
    title: 'Compliance dashboard',
    description: 'Track documents, vendors, risks and tasks from one organization-first workspace.',
  },
  {
    title: 'Audit-ready evidence',
    description: 'Store compliance documents securely with private storage and signed downloads.',
  },
  {
    title: 'Vendor and risk management',
    description: 'Classify third-party exposure, review vendors and prioritize risks by impact.',
  },
  {
    title: 'Billing and team controls',
    description: 'Invite your team, enforce plan limits and manage subscriptions with Stripe.',
  },
];

const steps = [
  'Create your organization',
  'Invite your compliance team',
  'Upload policies and evidence',
  'Track risks, vendors and tasks',
  'Stay audit-ready over time',
];

const faqs = [
  {
    question: 'Who is EuroComply for?',
    answer: 'Small and mid-sized European companies that need a structured way to manage compliance evidence, vendors, risks and internal tasks.',
  },
  {
    question: 'Is this a legal service?',
    answer: 'No. EuroComply helps teams organize compliance operations and evidence. Legal interpretation should still be reviewed by qualified counsel.',
  },
  {
    question: 'Can we manage vendors and risks?',
    answer: 'Yes. The product includes vendor tracking, DPA status, data access level, risk classification and a risk register.',
  },
  {
    question: 'Does it support paid plans?',
    answer: 'Yes. Stripe Checkout, webhooks, customer portal and plan limits are built into the SaaS foundation.',
  },
];

export default function HomePage({ params }: { params: { locale: string } }) {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-20 lg:flex-row lg:items-center lg:py-28">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">EuroComply</p>
          <h1 className="mt-4 text-5xl font-bold tracking-tight md:text-6xl">
            Compliance operations for European teams that need proof, not chaos.
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Organize GDPR evidence, vendors, risks, tasks and billing controls in a secure multi-tenant SaaS built for growing compliance programs.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/${params.locale}/signup`}
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Start your workspace
            </Link>
            <Link
              href={`/${params.locale}/pricing`}
              className="inline-flex h-11 items-center justify-center rounded-md border px-6 text-sm font-medium hover:bg-muted"
            >
              View pricing
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-sm lg:w-[420px]">
          <p className="text-sm font-medium text-muted-foreground">Audit readiness snapshot</p>
          <div className="mt-6 space-y-4">
            {[
              ['Compliance score', '82%'],
              ['Open risks', '7'],
              ['High-risk vendors', '3'],
              ['Missing documents', '5'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-lg font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y bg-muted/30 py-16">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 md:grid-cols-4">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-2xl border bg-background p-6">
              <h2 className="font-semibold">{feature.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">How it works</p>
          <h2 className="mt-3 text-3xl font-bold">Go from scattered compliance work to an operational system.</h2>
        </div>
        <ol className="space-y-4">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-4 rounded-2xl border p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <span className="pt-1 font-medium">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="rounded-3xl border bg-card p-8 md:p-10">
          <h2 className="text-3xl font-bold">Frequently asked questions</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {faqs.map((faq) => (
              <article key={faq.question}>
                <h3 className="font-semibold">{faq.question}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t px-6 py-10 text-center text-sm text-muted-foreground">
        <p>EuroComply — compliance evidence, risk and vendor operations for modern teams.</p>
      </section>
    </main>
  );
}
