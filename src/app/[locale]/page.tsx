import type { Metadata } from 'next';

import { EnterpriseHome } from '@/components/marketing/enterprise-home';
import { PublicLandingBusinessCheckoutNormalizer } from '@/components/marketing/public-landing-business-checkout-normalizer';
import { PublicLandingLinkNormalizer } from '@/components/marketing/public-landing-link-normalizer';
import { PublicLandingMobileHeaderGuard } from '@/components/marketing/public-landing-mobile-header-guard';
import { PublicLandingSignupPlanNormalizer as SignupPlanNormalizer } from '@/components/marketing/public-landing-signup-plan-normalizer';
import { SiteStructuredData } from '@/components/seo/site-structured-data';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';
import { getSafeLocale, makePublicMetadata } from '@/lib/seo/public-metadata';

export const revalidate = 300;
export const dynamic = 'force-static';

type PageProps = {
  params: Promise<{ locale: string }>;
};

const landingMetadata: Record<Locale, { title: string; description: string }> = {
  en: {
    title: 'AI Governance & EU AI Act Readiness | RISCK COMPLY',
    description: 'Organize AI systems, risk assessments, owners, governance evidence, documents and audit activity in one workspace for European B2B teams.',
  },
  pt: {
    title: 'Governança de IA e preparação para o AI Act | RISCK COMPLY',
    description: 'Organize sistemas de IA, avaliações de risco, responsáveis, evidências, documentos e atividade de auditoria num workspace para equipas B2B europeias.',
  },
  es: {
    title: 'Gobernanza de IA y preparación para el AI Act | RISCK COMPLY',
    description: 'Organiza sistemas de IA, evaluaciones de riesgo, responsables, evidencias, documentos e historial de auditoría en un workspace para equipos B2B europeos.',
  },
  fr: {
    title: 'Gouvernance IA et préparation au AI Act | RISCK COMPLY',
    description: 'Organisez systèmes d’IA, évaluations des risques, responsables, preuves, documents et activité d’audit dans un workspace pour équipes B2B européennes.',
  },
  it: {
    title: 'Governance IA e preparazione all’AI Act | RISCK COMPLY',
    description: 'Organizza sistemi IA, valutazioni del rischio, responsabili, evidenze, documenti e attività di audit in un workspace per team B2B europei.',
  },
  de: {
    title: 'KI-Governance und Vorbereitung auf den AI Act | RISCK COMPLY',
    description: 'Organisieren Sie KI-Systeme, Risikobewertungen, Verantwortliche, Nachweise, Dokumente und Audit-Aktivitäten in einem Workspace für europäische B2B-Teams.',
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: requestedLocale } = await params;
  const locale = getSafeLocale(requestedLocale);
  const meta = landingMetadata[locale];

  return makePublicMetadata({ locale, title: meta.title, description: meta.description });
}

export default async function HomePage({ params }: PageProps) {
  const { locale: requestedLocale } = await params;
  const locale = (locales.includes(requestedLocale as Locale) ? requestedLocale : defaultLocale) as Locale;
  const meta = landingMetadata[locale];

  return (
    <>
      <SiteStructuredData locale={locale} title={meta.title} description={meta.description} />
      <PublicLandingBusinessCheckoutNormalizer locale={locale} />
      <PublicLandingLinkNormalizer locale={locale} />
      <SignupPlanNormalizer locale={locale} />
      <PublicLandingMobileHeaderGuard />
      <EnterpriseHome locale={locale} />
    </>
  );
}
