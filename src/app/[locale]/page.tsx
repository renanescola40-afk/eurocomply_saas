import type { Metadata } from 'next';

import { EnterpriseHome } from '@/components/marketing/enterprise-home';
import { PublicLandingBusinessCheckoutNormalizer } from '@/components/marketing/public-landing-business-checkout-normalizer';
import { PublicLandingLinkNormalizer } from '@/components/marketing/public-landing-link-normalizer';
import { PublicLandingMobileHeaderGuard } from '@/components/marketing/public-landing-mobile-header-guard';
import { PublicLandingSignupPlanNormalizer as SignupPlanNormalizer } from '@/components/marketing/public-landing-signup-plan-normalizer';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';
import { getSafeLocale, makePublicMetadata } from '@/lib/seo/public-metadata';

export const revalidate = 300;
export const dynamic = 'force-static';

type PageProps = {
  params: Promise<{ locale: string }>;
};

const landingMetadata: Record<Locale, { title: string; description: string }> = {
  en: {
    title: 'RISCK COMPLY - AI Act Readiness Platform for European B2B Teams',
    description: 'Join the RISCK COMPLY waitlist for AI inventory, risk visibility, governance workflows, audit trails and AI Act readiness evidence preparation.',
  },
  pt: {
    title: 'RISCK COMPLY - Plataforma de AI Act Readiness para equipas B2B europeias',
    description: 'Entre na lista de espera da RISCK COMPLY para inventario de IA, visibilidade de risco, workflows de governanca, audit trail e preparacao de evidencias.',
  },
  es: {
    title: 'RISCK COMPLY - Plataforma de AI Act readiness para equipos B2B europeos',
    description: 'Unete a la lista de espera para inventario de IA, visibilidad de riesgo, workflows de gobernanza, audit trail y preparacion de evidencias.',
  },
  fr: {
    title: 'RISCK COMPLY - Plateforme AI Act readiness pour equipes B2B europeennes',
    description: 'Rejoignez la liste d attente pour inventaire IA, visibilite des risques, workflows gouvernance, audit trail et preparation des preuves.',
  },
  it: {
    title: 'RISCK COMPLY - Piattaforma AI Act readiness per team B2B europei',
    description: 'Entra nella waitlist per inventario IA, visibilita del rischio, workflow governance, audit trail e preparazione delle evidenze.',
  },
  de: {
    title: 'RISCK COMPLY - AI Act Readiness Plattform fuer europaeische B2B-Teams',
    description: 'Warteliste fuer KI-Inventar, Risikosichtbarkeit, Governance-Workflows, Audit Trail und Nachweisvorbereitung.',
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

  return (
    <>
      <PublicLandingBusinessCheckoutNormalizer locale={locale} />
      <PublicLandingLinkNormalizer locale={locale} />
      <SignupPlanNormalizer locale={locale} />
      <PublicLandingMobileHeaderGuard />
      <EnterpriseHome locale={locale} />
    </>
  );
}
