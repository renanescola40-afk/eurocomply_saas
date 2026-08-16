import type { Metadata } from 'next';
import Link from 'next/link';

import { PublicFooter } from '@/components/marketing/public-footer';
import { BILLING_PLANS, type BillingPlan, type BillingLimit } from '@/lib/billing/plans';
import { getBillingFeatureLabel } from '@/lib/i18n/billing-feature-labels';
import { getCommercialSurfaceCopy, type CommercialSurfaceCopy } from '@/lib/i18n/commercial-surface-copy';
import { applyPricingCommercialTruth } from '@/lib/i18n/pricing-commercial-truth';
import { type Locale } from '@/lib/i18n/routing';
import { getCanonicalUrl, getSafeLocale, makePublicMetadata, SITE_NAME } from '@/lib/seo/public-metadata';

type Props = { params: Promise<{ locale: string }> };

export const revalidate = 300;
export const dynamic = 'force-static';

type PublicPlanSlug = 'essential' | 'professional' | 'business' | 'enterprise';

type PlanPresentation = {
  publicSlug: PublicPlanSlug;
  featured?: boolean;
};

const planPresentation: Record<BillingPlan['id'], PlanPresentation> = {
  starter: { publicSlug: 'essential' },
  professional: { publicSlug: 'professional', featured: true },
  business: { publicSlug: 'business' },
  enterprise: { publicSlug: 'enterprise' },
};

const pricingMetadata: Record<Locale, { title: string; description: string }> = {
  en: {
    title: 'RISCK COMPLY Pricing - AI Act Readiness Plans for B2B Teams',
    description: 'Compare RISCK COMPLY plans for AI inventory, risk ownership, evidence preparation, policy workflows, security review and AI Act readiness operations.',
  },
  pt: {
    title: 'Preços RISCK COMPLY - Planos de preparação para o AI Act para equipas B2B',
    description: 'Compare planos para inventário de IA, responsabilidade por risco, preparação de evidências, fluxos de políticas, revisão de segurança e operações de preparação para o AI Act.',
  },
  es: {
    title: 'Precios RISCK COMPLY - Planes de preparación para el AI Act para equipos B2B',
    description: 'Compara planes para inventario de IA, responsabilidad de riesgos, preparación de evidencias, flujos de políticas, revisión de seguridad y operaciones de preparación para el AI Act.',
  },
  fr: {
    title: 'Tarifs RISCK COMPLY - Plans de préparation à l’AI Act pour équipes B2B',
    description: 'Comparez les plans pour l’inventaire IA, la responsabilité des risques, la préparation des preuves, les flux de politiques, la revue de sécurité et la préparation à l’AI Act.',
  },
  it: {
    title: 'Prezzi RISCK COMPLY - Piani di preparazione all’AI Act per team B2B',
    description: 'Confronta i piani per inventario IA, responsabilità del rischio, preparazione delle evidenze, flussi delle policy, revisione della sicurezza e preparazione all’AI Act.',
  },
  de: {
    title: 'RISCK COMPLY Preise - Pläne zur Vorbereitung auf den AI Act für B2B-Teams',
    description: 'Vergleichen Sie Pläne für KI-Inventar, Risikoverantwortung, Nachweisvorbereitung, Richtlinienabläufe, Sicherheitsprüfung und die Vorbereitung auf den AI Act.',
  },
};

function planHref(locale: string, plan: BillingPlan) {
  const publicSlug = planPresentation[plan.id].publicSlug;
  if (plan.id === 'enterprise') return `/${locale}/enterprise`;
  if (plan.salesLed) return `/${locale}/book-demo?plan=${publicSlug}`;
  return `/${locale}/signup?plan=${publicSlug}`;
}

function formatPriceNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function monthlyPrice(plan: BillingPlan, locale: Locale, copy: CommercialSurfaceCopy['pricing']) {
  if (plan.priceMonthly !== null) {
    return { label: `€${formatPriceNumber(plan.priceMonthly, locale)}`, period: copy.month };
  }

  if (plan.startingPriceMonthly !== null && plan.startingPriceMonthly !== undefined) {
    return { label: `${copy.from} €${formatPriceNumber(plan.startingPriceMonthly, locale)}`, period: copy.month };
  }

  return { label: copy.contract, period: '' };
}

function limitLabel(value: BillingLimit, singular: string, plural: string, locale: Locale, copy: CommercialSurfaceCopy['pricing']) {
  if (value === 'unlimited') return `${copy.unlimited} ${plural}`;
  return `${formatPriceNumber(value, locale)} ${value === 1 ? singular : plural}`;
}

function usersLabel(plan: BillingPlan, locale: Locale, copy: CommercialSurfaceCopy['pricing']) {
  if (plan.id === 'enterprise') return copy.usersByContract;
  return limitLabel(plan.limits.users, copy.includedUser, copy.includedUsers, locale, copy);
}

function organizationsLabel(plan: BillingPlan, locale: Locale, copy: CommercialSurfaceCopy['pricing']) {
  if (plan.id === 'enterprise') return copy.organizationsByContract;
  return limitLabel(plan.limits.organizations, copy.organization, copy.organizations, locale, copy);
}

function aiSystemsLabel(plan: BillingPlan, locale: Locale, copy: CommercialSurfaceCopy['pricing']) {
  return limitLabel(plan.limits.aiSystems, copy.aiSystem, copy.aiSystems, locale, copy);
}

function auditHistoryLabel(plan: BillingPlan, locale: Locale, copy: CommercialSurfaceCopy['pricing']) {
  const days = plan.limits.auditLogsDays;
  if (days === 'unlimited') return copy.unlimitedAuditHistory;
  if (plan.id === 'enterprise') return copy.enterpriseAuditHistory;
  return copy.dayAuditHistory(formatPriceNumber(days, locale));
}

function commercialMotion(plan: BillingPlan, copy: CommercialSurfaceCopy['pricing']) {
  if (plan.id === 'enterprise') return copy.salesLedContract;
  if (plan.id === 'business') return copy.demoAssisted;
  if (plan.id === 'professional') return copy.selfServeTrial;
  return copy.selfServe;
}

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
  const copy = applyPricingCommercialTruth(locale, getCommercialSurfaceCopy(locale).pricing);
  const comparisonRows = [
    { label: copy.monthlyReference, value: (plan: BillingPlan) => { const price = monthlyPrice(plan, locale, copy); return `${price.label}${price.period}`; } },
    { label: copy.includedUsers, value: (plan: BillingPlan) => usersLabel(plan, locale, copy) },
    { label: copy.organizationsLabel, value: (plan: BillingPlan) => organizationsLabel(plan, locale, copy) },
    { label: copy.aiSystemsLabel, value: (plan: BillingPlan) => aiSystemsLabel(plan, locale, copy) },
    { label: copy.auditHistory, value: (plan: BillingPlan) => auditHistoryLabel(plan, locale, copy) },
    { label: copy.commercialMotion, value: (plan: BillingPlan) => commercialMotion(plan, copy) },
  ];

  return (
    <main className="min-h-screen bg-[#05060a] text-white">
      <PricingStructuredData locale={locale} />
      <header className="border-b border-white/10 bg-[#05060a]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
          <Link href={`/${locale}`} className="shrink-0 rounded-md text-sm font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060a] sm:text-lg">RISCK COMPLY</Link>
          <nav className="flex min-w-0 items-center justify-end gap-1 text-xs sm:gap-2 sm:text-sm" aria-label={copy.navLabel}>
            <Link href={`/${locale}/enterprise`} className="hidden rounded-full border border-white/15 px-3 py-2 font-medium hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 lg:inline-flex">{copy.enterprise}</Link>
            <Link href={`/${locale}/trust`} className="hidden rounded-full border border-white/15 px-3 py-2 font-medium hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 md:inline-flex">{copy.trust}</Link>
            <Link href={`/${locale}/login`} className="rounded-full border border-white/15 px-3 py-2 font-medium hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">{copy.signIn}</Link>
            <Link href={`/${locale}/signup?plan=professional`} className="rounded-full bg-white px-3 py-2 font-semibold text-black hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060a] sm:px-4">{copy.startTrial}</Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10" aria-labelledby="pricing-title">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,.20),transparent_30rem),radial-gradient(circle_at_80%_15%,rgba(16,185,129,.12),transparent_28rem)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-blue-300/30 bg-blue-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">{copy.heroEyebrow}</p>
            <h1 id="pricing-title" className="mt-6 max-w-5xl text-5xl font-semibold tracking-[-0.05em] md:text-7xl">{copy.heroTitle}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">{copy.heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/${locale}/signup?plan=professional`} className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-black hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060a]">{copy.startProfessional}</Link>
              <Link href={`/${locale}/book-demo`} className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-bold hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">{copy.bookDemo}</Link>
              <Link href={`/${locale}/trust`} className="inline-flex h-12 items-center justify-center rounded-full border border-blue-300/25 px-6 text-sm font-bold text-blue-100 hover:bg-blue-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">{copy.reviewTrust}</Link>
            </div>
          </div>
          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">{copy.guardrailEyebrow}</p>
            <p className="mt-4 text-2xl font-semibold leading-tight">{copy.guardrailTitle}</p>
            <p className="mt-4 text-sm leading-7 text-slate-300">{copy.guardrailBody}</p>
          </aside>
        </div>
      </section>

      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-6 py-16">
        <section className="grid gap-4 lg:grid-cols-4" aria-label={copy.plansLabel}>
          {BILLING_PLANS.map((plan) => {
            const presentation = planPresentation[plan.id];
            const localizedPlan = copy.plan[plan.id];
            const price = monthlyPrice(plan, locale, copy);
            const isFeatured = Boolean(presentation.featured);

            return (
              <article key={plan.id} className={`relative flex flex-col rounded-[2rem] border p-6 shadow-xl transition hover:-translate-y-1 ${isFeatured ? 'border-blue-300 bg-white text-slate-950' : plan.id === 'enterprise' ? 'border-emerald-300/40 bg-gradient-to-b from-emerald-300/15 to-slate-950 text-white' : 'border-white/10 bg-slate-950 text-white'}`}>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${isFeatured ? 'bg-slate-950 text-white' : 'border border-white/15 text-slate-300'}`}>{localizedPlan.eyebrow}</span>
                <div className="mt-5 flex flex-1 flex-col">
                  <h2 className="text-2xl font-semibold">{plan.name}</h2>
                  <p className={`mt-2 text-sm leading-6 ${isFeatured ? 'text-slate-600' : 'text-slate-400'}`}>{localizedPlan.description}</p>
                  <p className="mt-5 text-5xl font-bold">{price.label}<span className="text-base font-normal text-slate-500">{price.period}</span></p>
                  <div className={`mt-5 grid gap-2 rounded-2xl border p-4 text-sm ${isFeatured ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-white/10 bg-white/[0.03] text-slate-300'}`} aria-label={copy.limitsAria(plan.name)}>
                    <p>{usersLabel(plan, locale, copy)}</p>
                    <p>{organizationsLabel(plan, locale, copy)}</p>
                    <p>{aiSystemsLabel(plan, locale, copy)}</p>
                  </div>
                  <ul className="mt-6 space-y-3 text-sm">
                    {plan.features.slice(0, 6).map((feature) => (
                      <li key={feature} className={isFeatured ? 'text-slate-700' : 'text-slate-300'}>• {getBillingFeatureLabel(locale, feature)}</li>
                    ))}
                  </ul>
                  <Link href={planHref(locale, plan)} className={`mt-8 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 ${isFeatured ? 'bg-slate-950 text-white hover:bg-slate-800' : 'border border-white/15 text-white hover:bg-white/10'}`}>
                    {localizedPlan.cta}
                  </Link>
                </div>
              </article>
            );
          })}
        </section>

        <p className="text-center text-sm leading-6 text-slate-400">{copy.taxNote}</p>

        <section className="grid gap-4 md:grid-cols-3" aria-label={copy.valueProofLabel}>
          {copy.valueProof.map(({ title, body }) => (
            <article key={title} className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{body}</p>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950" aria-labelledby="plan-comparison-title">
          <div className="border-b border-white/10 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">{copy.comparisonEyebrow}</p>
            <h2 id="plan-comparison-title" className="mt-2 text-3xl font-semibold tracking-tight">{copy.comparisonTitle}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/[0.03] text-left text-slate-300">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">{copy.capability}</th>
                  {BILLING_PLANS.map((plan) => <th key={plan.id} scope="col" className="px-6 py-4 font-semibold">{plan.name}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="px-6 py-4 text-left font-medium text-white">{row.label}</th>
                    {BILLING_PLANS.map((plan) => <td key={`${row.label}-${plan.id}`} className="px-6 py-4 text-slate-300">{row.value(plan)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 md:p-8" aria-labelledby="pricing-objections-title">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">{copy.objectionsEyebrow}</p>
          <h2 id="pricing-objections-title" className="mt-2 text-3xl font-semibold tracking-tight">{copy.objectionsTitle}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {copy.objections.map(({ question, answer }) => (
              <article key={question} className="rounded-[1.5rem] border border-white/10 bg-slate-950 p-5">
                <h3 className="font-semibold">{question}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 md:p-8" aria-labelledby="pricing-faq-title">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">{copy.faqEyebrow}</p>
          <h2 id="pricing-faq-title" className="sr-only">{copy.faqEyebrow}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {copy.faqs.map((faq) => (
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
