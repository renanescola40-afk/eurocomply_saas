import Link from 'next/link';
import { PublicFooter } from '@/components/marketing/public-footer';

const features = [
  {
    title: 'Executive dashboard',
    description: 'See compliance score, risks, vendor exposure, document gaps and next best actions in one premium dashboard.',
  },
  {
    title: 'Audit-ready evidence',
    description: 'Store policies, DPIAs, vendor agreements and evidence securely with private storage and signed downloads.',
  },
  {
    title: 'Vendor and risk management',
    description: 'Classify third-party exposure, review vendors, track DPA status and prioritize risks by impact.',
  },
  {
    title: 'Board-ready reports',
    description: 'Generate printable executive reports, maturity scorecards and CSV exports for leadership or customer review.',
  },
];

const steps = [
  'Create your organization',
  'Generate tasks and documents from compliance templates',
  'Upload evidence and assign owners',
  'Track vendors, risks and deadlines',
  'Export board-ready reports',
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
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href={`/${params.locale}`} className="text-lg font-bold tracking-tight">EuroComply</Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link href={`/${params.locale}/pricing`} className="rounded-full px-4 py-2 text-muted-foreground hover:bg-muted hover:text-foreground">Pricing</Link>
          <Link href={`/${params.locale}/login`} className="rounded-full border px-4 py-2 font-medium hover:bg-muted">Sign in</Link>
          <Link href={`/${params.locale}/signup`} className="rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90">Start free</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">EuroComply SaaS</p>
          <h1 className="mt-4 text-5xl font-bold tracking-tight md:text-7xl">
            Compliance operations that look board-ready from day one.
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Organize GDPR evidence, vendors, risks, tasks, templates and executive reports in a secure multi-tenant SaaS built for European teams.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/${params.locale}/signup`}
              className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Start your workspace
            </Link>
            <Link
              href={`/${params.locale}/login`}
              className="inline-flex h-12 items-center justify-center rounded-full border px-6 text-sm font-semibold hover:bg-muted"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-6 text-white shadow-2xl">
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <p className="text-sm font-medium text-slate-400">Executive readiness snapshot</p>
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.05] p-5 text-center">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Compliance score</p>
              <p className="mt-2 text-6xl font-bold text-emerald-300">82%</p>
              <p className="mt-2 text-sm text-slate-400">Operationally controlled</p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ['Open risks', '7'],
                ['High-risk vendors', '3'],
                ['Missing documents', '5'],
                ['Next best actions', '4'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <span className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</span>
                  <p className="mt-2 text-2xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
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
          <Link href={`/${params.locale}/faq`} className="mt-8 inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-muted">
            Read full FAQ
          </Link>
        </div>
      </section>

      <PublicFooter locale={params.locale} />
    </main>
  );
}
