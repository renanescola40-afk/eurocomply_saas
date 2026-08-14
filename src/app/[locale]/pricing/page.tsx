import type { Metadata } from 'next';
import Link from 'next/link';

import { PublicFooter } from '@/components/marketing/public-footer';
import { BILLING_PLANS, type BillingPlan, type BillingLimit } from '@/lib/billing/plans';
import { type Locale } from '@/lib/i18n/routing';
import { getCanonicalUrl, getSafeLocale, makePublicMetadata, SITE_NAME } from '@/lib/seo/public-metadata';

type Props = { params: Promise<{ locale: string }> };

export const revalidate = 300;
export const dynamic = 'force-static';

type PublicPlanSlug = 'essential' | 'professional' | 'business' | 'enterprise';

type PlanPresentation = {
  publicSlug: PublicPlanSlug;
  eyebrow: string;
  description: string;
  cta: string;
  featured?: boolean;
};

const planPresentation: Record<BillingPlan['id'], PlanPresentation> = {
  starter: {
    publicSlug: 'essential',
    eyebrow: 'Starter workspace',
    description: 'For small teams replacing spreadsheets with a controlled AI governance workspace.',
    cta: 'Start Essential',
  },
  professional: {
    publicSlug: 'professional',
    eyebrow: 'Best for readiness',
    description: 'For SaaS, fintech, HR and B2B teams preparing structured AI Act readiness evidence.',
    cta: 'Start Professional Trial',
    featured: true,
  },
  business: {
    publicSlug: 'business',
    eyebrow: 'Multi-team rollout',
    description: 'For companies operating several AI workflows across departments, countries or business units.',
    cta: 'Book Business Demo',
  },
  enterprise: {
    publicSlug: 'enterprise',
    eyebrow: 'Contract enterprise',
    description: 'For regulated teams and B2B vendors that need advanced identity, RBAC, onboarding and support terms by agreement.',
    cta: 'Talk to Sales',
  },
};

const valueProof = [
  ['Know your AI footprint', 'Create a clear record of AI systems, owners, use cases, departments, countries and vendors.'],
  ['Classify risk without chaos', 'Turn vague AI concerns into structured risk signals, ownership and next actions.'],
  ['Prepare evidence before pressure', 'Organize governance evidence and review activity without claiming legal guarantees.'],
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
    question: 'How is Enterprise priced?',
    answer: 'Enterprise uses negotiated contract pricing. The public starting reference is from €990/month; final pricing depends on scope, rollout, support and agreed commercial terms.',
  },
];

const pricingMetadata: Record<Locale, { title: string; description: string }> = {
  en: {
    title: 'RISCK COMPLY Pricing - AI Act Readiness Plans for B2B Teams',
    description: 'Compare RISCK COMPLY plans for AI inventory, risk ownership, evidence preparation, policy workflows, security review and AI Act readiness operations.',
  },
  pt: {
    title: 'Precos RISCK COMPLY - Planos de AI Act Readiness para equipas B2B',
    description: 'Compare planos para inventario de IA, owners de risco, evidencias, workflows de politicas, security review e operacoes de AI Act readiness.',
  },
  es: {
    title: 'Precios RISCK COMPLY - Planes de AI Act readiness para equipos B2B',
    description: 'Compara planes para inventario de IA, responsables de riesgo, evidencias, politicas, security review y operaciones de AI Act readiness.',
  },
  fr: {
    title: 'Tarifs RISCK COMPLY - Plans AI Act readiness pour equipes B2B',
    description: 'Comparez les plans pour inventaire IA, ownership des risques, preuves, politiques, security review et operations AI Act readiness.',
  },
  it: {
    title: 'Prezzi RISCK COMPLY - Piani AI Act readiness per team B2B',
    description: 'Confronta i piani per inventario IA, ownership del rischio, evidenze, policy workflow, security review e operazioni AI Act readiness.',
  },
  de: {
    title: 'RISCK COMPLY Preise - AI Act Readiness Plaene fuer B2B-Teams',
    description: 'Vergleichen Sie Plaene fuer KI-Inventar, Risiko-Ownership, Nachweise, Policy-Workflows, Security Review und AI Act Readiness.',
  },
};

function planHref(locale: string, plan: BillingPlan) {
  const publicSlug = planPresentation[plan.id].publicSlug;
  if (plan.id === 'enterprise') return `/${locale}/enterprise`;
  if (plan.salesLed) return `/${locale}/book-demo?plan=${publicSlug}`;
  return `/${locale}/signup?plan=${publicSlug}`;
}

function formatPriceNumber(value: number) {
  return value.toLocaleString('en-IE');
}

function monthlyPrice(plan: BillingPlan) {
  if (plan.priceMonthly !== null) {
    return { label: `€${formatPriceNumber(plan.priceMonthly)}`, period: '/mo' };
  }

  if (plan.startingPriceMonthly !== null && plan.startingPriceMonthly !== undefined) {
    return { label: `From €${formatPriceNumber(plan.startingPriceMonthly)}`, period: '/mo' };
  }

  return { label: 'Contract', period: '' };
}

function limitLabel(value: BillingLimit, singular: string, plural: string) {
  if (value === 'unlimited') return `Unlimited ${plural}`;
  return `${formatPriceNumber(value)} ${value === 1 ? singular : plural}`;
}

function usersLabel(plan: BillingPlan) {
  if (plan.id === 'enterprise') return 'Users by contract';
  return limitLabel(plan.limits.users, 'included user', 'included users');
}

function organizationsLabel(plan: BillingPlan) {
  if (plan.id === 'enterprise') return 'Organizations by contract';
  return limitLabel(plan.limits.organizations, 'organization', 'organizations');
}

function aiSystemsLabel(plan: BillingPlan) {
  return limitLabel(plan.limits.aiSystems, 'AI system', 'AI systems');
}

function auditHistoryLabel(plan: BillingPlan) {
  const days = plan.limits.auditLogsDays;
  if (days === 'unlimited') return 'Unlimited audit history';
  if (plan.id === 'enterprise') return 'Audit retention by enterprise policy';
  return `${formatPriceNumber(days)}-day audit history`;
}

function commercialMotion(plan: BillingPlan) {
  if (plan.id === 'enterprise') return 'Sales-led / contract';
  if (plan.id === 'business') return 'Demo / assisted sales';
  if (plan.id === 'professional') return 'Self-serve trial';
  return 'Self-serve';
}

const comparisonRows = [
  { label: 'Monthly reference', value: (plan: BillingPlan) => `${monthlyPrice(plan).label}${monthlyPrice(plan).period}` },
  { label: 'Included users', value: usersLabel },
  { label: 'Organizations', value: organizationsLabel },
  { label: 'AI systems', value: aiSystemsLabel },
  { label: 'Audit history', value: auditHistoryLabel },
  { label: 'Commercial motion', value: commercialMotion },
];

function PricingStructuredData({ locale }: { locale: Locale }) {
  const selfServeOffers = BILLING_PLANS.filter(
    (plan): plan is BillingPlan & { priceMonthly: number } => !plan.salesLed && plan.priceMonthly !== null,
  );

  const data = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: getCanonicalUrl(locale, '/pricing'),
    description: pricingMetadata[locale].description,
    offers: selfServeOffers.map((plan) => ({
      '@type': 'Offer',
      name: `${SITE_NAME} ${plan.name}`,
      priceCurrency: 'EUR',
      price: plan.priceMonthly.toString(),
      url: getCanonicalUrl(locale, `/signup?plan=${planPresentation[plan.id].publicSlug}`),
    })),
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: requestedLocale } = await params;
  const locale = getSafeLocale(requestedLocale);
  const meta = pricingMetadata[locale];

  return makePublicMetadata({ locale, path: '/pricing', title: meta.title, description: meta.description });
}

export default async function PricingPage({ params }: Props) {
  const { locale: requestedLocale } = await params;
  const locale = getSafeLocale(requestedLocale);

  return (
    <main className="min-h-screen bg-[#05060a] text-white">
      <PricingStructuredData locale={locale} />
      <header className="border-b border-white/10 bg-[#05060a]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href={`/${locale}`} className="rounded-md text-lg font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060a]">RISCK COMPLY</Link>
          <nav className="flex items-center gap-2 text-sm" aria-label="Pricing navigation">
            <Link href={`/${locale}/enterprise`} className="hidden rounded-full border border-white/15 px-4 py-2 font-medium hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 sm:inline-flex">Enterprise</Link>
            <Link href={`/${locale}/trust`} className="rounded-full border border-white/15 px-4 py-2 font-medium hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">Trust Center</Link>
            <Link href={`/${locale}/login`} className="rounded-full border border-white/15 px-4 py-2 font-medium hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">Sign in</Link>
            <Link href={`/${locale}/signup?plan=professional`} className="rounded-full bg-white px-4 py-2 font-semibold text-black hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060a]">Start trial</Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10" aria-labelledby="pricing-title">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,.20),transparent_30rem),radial-gradient(circle_at_80%_15%,rgba(16,185,129,.12),transparent_28rem)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-blue-300/30 bg-blue-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">Transparent AI governance pricing</p>
            <h1 id="pricing-title" className="mt-6 max-w-5xl text-5xl font-semibold tracking-[-0.05em] md:text-7xl">Start with AI readiness. Scale into enterprise governance.</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">Choose the plan that matches your AI footprint: from first inventory to multi-team governance workflows and enterprise controls.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/${locale}/signup?plan=professional`} className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-black hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060a]">Start Professional Trial</Link>
              <Link href={`/${locale}/book-demo`} className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-bold hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">Book a Demo</Link>
              <Link href={`/${locale}/trust`} className="inline-flex h-12 items-center justify-center rounded-full border border-blue-300/25 px-6 text-sm font-bold text-blue-100 hover:bg-blue-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">Review Trust Center</Link>
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
        <section className="grid gap-4 lg:grid-cols-4" aria-label="Pricing plans">
          {BILLING_PLANS.map((plan) => {
            const presentation = planPresentation[plan.id];
            const price = monthlyPrice(plan);
            const isFeatured = Boolean(presentation.featured);

            return (
              <article key={plan.id} className={`relative flex flex-col rounded-[2rem] border p-6 shadow-xl transition hover:-translate-y-1 ${isFeatured ? 'border-blue-300 bg-white text-slate-950' : plan.id === 'enterprise' ? 'border-emerald-300/40 bg-gradient-to-b from-emerald-300/15 to-slate-950 text-white' : 'border-white/10 bg-slate-950 text-white'}`}>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${isFeatured ? 'bg-slate-950 text-white' : 'border border-white/15 text-slate-300'}`}>{presentation.eyebrow}</span>
                <div className="mt-5 flex flex-1 flex-col">
                  <h2 className="text-2xl font-semibold">{plan.name}</h2>
                  <p className={`mt-2 text-sm leading-6 ${isFeatured ? 'text-slate-600' : 'text-slate-400'}`}>{presentation.description}</p>
                  <p className="mt-5 text-5xl font-bold">{price.label}<span className="text-base font-normal text-slate-500">{price.period}</span></p>
                  <div className={`mt-5 grid gap-2 rounded-2xl border p-4 text-sm ${isFeatured ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-white/10 bg-white/[0.03] text-slate-300'}`} aria-label={`${plan.name} included limits`}>
                    <p>{usersLabel(plan)}</p>
                    <p>{organizationsLabel(plan)}</p>
                    <p>{aiSystemsLabel(plan)}</p>
                  </div>
                  <ul className="mt-6 space-y-3 text-sm">
                    {plan.features.slice(0, 6).map((feature) => (
                      <li key={feature} className={isFeatured ? 'text-slate-700' : 'text-slate-300'}>• {feature}</li>
                    ))}
                  </ul>
                  <Link
                    href={planHref(locale, plan)}
                    className={`mt-8 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 ${isFeatured ? 'bg-slate-950 text-white hover:bg-slate-800' : 'border border-white/15 text-white hover:bg-white/10'}`}
                  >
                    {presentation.cta}
                  </Link>
                </div>
              </article>
            );
          })}
        </section>

        <p className="text-center text-sm leading-6 text-slate-400">Prices are shown in EUR. Taxes or VAT, where applicable, are confirmed during checkout or in the applicable order form. Business is assisted-sales; Enterprise uses negotiated contract pricing.</p>

        <section className="grid gap-4 md:grid-cols-3" aria-label="Pricing value proof">
          {valueProof.map(([title, text]) => (
            <article key={title} className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{text}</p>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950" aria-labelledby="plan-comparison-title">
          <div className="border-b border-white/10 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">Plan comparison</p>
            <h2 id="plan-comparison-title" className="mt-2 text-3xl font-semibold tracking-tight">Compare canonical capacity and commercial motion.</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/[0.03] text-left text-slate-300">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">Capability</th>
                  {BILLING_PLANS.map((plan) => (
                    <th key={plan.id} scope="col" className="px-6 py-4 font-semibold">{plan.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="px-6 py-4 text-left font-medium text-white">{row.label}</th>
                    {BILLING_PLANS.map((plan) => (
                      <td key={`${row.label}-${plan.id}`} className="px-6 py-4 text-slate-300">{row.value(plan)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 md:p-8" aria-labelledby="pricing-objections-title">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">Objections</p>
          <h2 id="pricing-objections-title" className="mt-2 text-3xl font-semibold tracking-tight">Strong answers without unsafe promises.</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {objections.map(([question, answer]) => (
              <article key={question} className="rounded-[1.5rem] border border-white/10 bg-slate-950 p-5">
                <h3 className="font-semibold">{question}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 md:p-8" aria-labelledby="pricing-faq-title">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">Commercial FAQ</p>
          <h2 id="pricing-faq-title" className="sr-only">Commercial FAQ</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {billingFaqs.map((faq) => (
              <article key={faq.question} className="rounded-[1.5rem] border border-white/10 bg-slate-950 p-5">
                <h3 className="font-semibold">{faq.question}</h3>
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
