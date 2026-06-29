import Link from 'next/link';
import { PublicFooter } from '@/components/marketing/public-footer';

type Props = { params: Promise<{ locale: string }> };

type Plan = {
  id: 'essential' | 'professional' | 'business' | 'enterprise';
  name: string;
  price: string;
  period: string;
  eyebrow: string;
  description: string;
  cta: string;
  featured?: boolean;
  salesLed?: boolean;
  features: string[];
};

const plans: Plan[] = [
  {
    id: 'essential',
    name: 'Essential',
    price: '€49',
    period: '/mo',
    eyebrow: 'Starter workspace',
    description: 'For small teams replacing spreadsheets with a controlled AI governance workspace.',
    cta: 'Start Essential',
    features: ['1 workspace', 'AI system inventory', 'Basic risk classification', 'Policy templates', 'Evidence checklist', '30-day audit history'],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '€149',
    period: '/mo',
    eyebrow: 'Best for readiness',
    description: 'For SaaS, fintech, HR and B2B teams preparing structured AI Act readiness evidence.',
    cta: 'Start Professional Trial',
    featured: true,
    features: ['Multi-user workspace', 'AI system registry', 'Risk and owner tracking', 'Evidence pack builder', 'Policy generator', '180-day audit history'],
  },
  {
    id: 'business',
    name: 'Business',
    price: '€399',
    period: '/mo',
    eyebrow: 'Multi-team rollout',
    description: 'For companies operating several AI workflows across departments, countries or business units.',
    cta: 'Book Business Demo',
    salesLed: true,
    features: ['Department views', 'Approval workflows', 'Executive reporting', 'Document versioning', 'Vendor and tool review', 'Priority onboarding'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    eyebrow: 'Procurement-ready',
    description: 'For regulated teams and B2B vendors that need security review, procurement support and assisted rollout.',
    cta: 'Talk to Sales',
    salesLed: true,
    features: ['Expanded limits', 'DPA and subprocessor review', 'Security questionnaire support', 'Procurement packet', 'Assisted onboarding', 'Support terms by agreement'],
  },
];

const valueProof = [
  ['Know your AI footprint', 'Create a clear record of AI systems, owners, use cases, departments, countries and vendors.'],
  ['Classify risk without chaos', 'Turn vague AI concerns into structured risk signals, ownership and next actions.'],
  ['Prepare evidence before pressure', 'Generate policies, evidence packs and buyer-ready summaries without claiming legal guarantees.'],
];

const comparisonRows = [
  { label: 'Primary buyer', values: ['Founder / small team', 'SaaS, fintech, HR teams', 'Multi-team companies', 'Regulated / procurement-led teams'] },
  { label: 'AI inventory', values: ['Core', 'Advanced', 'Advanced + departments', 'Expanded'] },
  { label: 'Risk and owners', values: ['Basic', 'Advanced', 'Workflow-based', 'Custom rollout'] },
  { label: 'Policies and evidence', values: ['Templates', 'Policy generator', 'Versioning + approvals', 'Procurement-ready packet'] },
  { label: 'Security questionnaire support', values: ['Self-serve docs', 'Trust Center', 'Assisted review', 'By agreement'] },
  { label: 'Commercial motion', values: ['Self-serve', 'Trial', 'Demo / assisted sales', 'Sales-led'] },
];

const objections = [
  ['Does this guarantee EU AI Act compliance?', 'No. RISCK COMPLY supports operational readiness, evidence preparation and governance workflows. Final legal interpretation remains with your legal counsel and advisors.'],
  ['We already have spreadsheets.', 'That is the usual starting point. RISCK COMPLY gives AI inventory, ownership, evidence status and review history a controlled system of record.'],
  ['Do you replace lawyers or DPOs?', 'No. The platform helps legal, compliance, DPO, security and product teams work from the same operating evidence.'],
];

const billingFaqs = [
  {
    question: 'Which plan should we start with?',
    answer: 'Essential is for a first controlled workspace. Professional is the default for serious AI Act readiness. Business is for multi-team rollout. Enterprise is for procurement-led buyers.',
  },
  {
    question: 'Do you offer a trial?',
    answer: 'Professional is the recommended trial motion. Business and Enterprise should start with a demo because procurement, onboarding and support scope matter.',
  },
  {
    question: 'Can pricing change for Enterprise?',
    answer: 'Yes. Enterprise pricing depends on scope, rollout, support, procurement requirements, DPA review and agreed commercial terms.',
  },
];

function planHref(locale: string, plan: Plan) {
  if (plan.id === 'enterprise') return `/${locale}/enterprise`;
  if (plan.salesLed) return `/${locale}/book-demo?plan=${plan.id}`;
  return `/${locale}/signup?plan=${plan.id}`;
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-[#05060a] text-white">
      <header className="border-b border-white/10 bg-[#05060a]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href={`/${locale}`} className="text-lg font-bold tracking-tight">RISCK COMPLY</Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link href={`/${locale}/enterprise`} className="hidden rounded-full border border-white/15 px-4 py-2 font-medium hover:bg-white/10 sm:inline-flex">Enterprise</Link>
            <Link href={`/${locale}/trust`} className="rounded-full border border-white/15 px-4 py-2 font-medium hover:bg-white/10">Trust Center</Link>
            <Link href={`/${locale}/login`} className="rounded-full border border-white/15 px-4 py-2 font-medium hover:bg-white/10">Sign in</Link>
            <Link href={`/${locale}/signup?plan=professional`} className="rounded-full bg-white px-4 py-2 font-semibold text-black hover:bg-white/90">Start trial</Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,.20),transparent_30rem),radial-gradient(circle_at_80%_15%,rgba(16,185,129,.12),transparent_28rem)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-blue-300/30 bg-blue-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">Transparent AI governance pricing</p>
            <h1 className="mt-6 max-w-5xl text-5xl font-semibold tracking-[-0.05em] md:text-7xl">Start with AI readiness. Scale into enterprise governance.</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">Choose the plan that matches your AI footprint: from first inventory to multi-team evidence management and procurement-ready review.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/${locale}/signup?plan=professional`} className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-black hover:bg-white/90">Start Professional Trial</Link>
              <Link href={`/${locale}/book-demo`} className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-bold hover:bg-white/10">Book a Demo</Link>
              <Link href={`/${locale}/trust`} className="inline-flex h-12 items-center justify-center rounded-full border border-blue-300/25 px-6 text-sm font-bold text-blue-100 hover:bg-blue-400/10">Review Trust Center</Link>
            </div>
          </div>
          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Commercial guardrail</p>
            <p className="mt-4 text-2xl font-semibold leading-tight">Operational readiness, not legal guarantees.</p>
            <p className="mt-4 text-sm leading-7 text-slate-300">RISCK COMPLY supports AI governance readiness, evidence preparation and audit workflows. It is not legal advice, does not replace legal counsel and does not guarantee regulatory compliance.</p>
          </aside>
        </div>
      </section>

      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-6 py-16">
        <section className="grid gap-4 lg:grid-cols-4">
          {plans.map((plan) => {
            const isFeatured = Boolean(plan.featured);
            return (
              <article key={plan.id} className={`relative flex rounded-[2rem] border p-6 shadow-xl flex-col transition hover:-translate-y-1 ${isFeatured ? 'border-blue-300 bg-white text-slate-950' : plan.id === 'enterprise' ? 'border-emerald-300/40 bg-gradient-to-b from-emerald-300/15 to-slate-950 text-white' : 'border-white/10 bg-slate-950 text-white'}`}>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${isFeatured ? 'bg-slate-950 text-white' : 'border border-white/15 text-slate-300'}`}>{plan.eyebrow}</span>
                <div className="mt-5 flex flex-1 flex-col">
                  <h2 className="text-2xl font-semibold">{plan.name}</h2>
                  <p className={`mt-2 text-sm leading-6 ${isFeatured ? 'text-slate-600' : 'text-slate-400'}`}>{plan.description}</p>
                  <p className="mt-5 text-5xl font-bold">{plan.price}<span className="text-base font-normal text-slate-500">{plan.period}</span></p>
                  <ul className="mt-6 space-y-3 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className={isFeatured ? 'text-slate-700' : 'text-slate-300'}>• {feature}</li>
                    ))}
                  </ul>
                  <Link
                    href={planHref(locale, plan)}
                    className={`mt-8 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-bold ${isFeatured ? 'bg-slate-950 text-white hover:bg-slate-800' : 'border border-white/15 text-white hover:bg-white/10'}`}
                  >
                    {plan.cta}
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
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Compare readiness depth, buyer motion and procurement support.</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/[0.03] text-left text-slate-300">
                <tr>
                  <th className="px-6 py-4 font-semibold">Capability</th>
                  {plans.map((plan) => (
                    <th key={plan.id} className="px-6 py-4 font-semibold">{plan.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <td className="px-6 py-4 font-medium text-white">{row.label}</td>
                    {row.values.map((value, index) => (
                      <td key={`${row.label}-${value}-${index}`} className="px-6 py-4 text-slate-300">{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">Objections</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Strong answers without unsafe promises.</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {objections.map(([question, answer]) => (
              <article key={question} className="rounded-[1.5rem] border border-white/10 bg-slate-950 p-5">
                <h3 className="font-semibold">{question}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">Commercial FAQ</p>
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
