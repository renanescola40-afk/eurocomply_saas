import type { Metadata } from 'next';

import { TrustCenterPage } from '@/components/marketing/trust-center-page';
import type { Locale } from '@/lib/i18n/routing';
import { getSafeLocale, makePublicMetadata } from '@/lib/seo/public-metadata';

export const revalidate = 300;

type PageProps = {
  params: Promise<{ locale: string }>;
};

const metadataByLocale: Record<Locale, { title: string; description: string }> = {
  en: {
    title: 'AI Governance Compliance Support | RISCK COMPLY',
    description: 'Review how RISCK COMPLY supports AI inventory, risk workflows, governance evidence and EU AI Act readiness without legal or certification guarantees.',
  },
  pt: {
    title: 'Apoio a compliance e governança de IA | RISCK COMPLY',
    description: 'Conheça o apoio da RISCK COMPLY a inventário de IA, risco, evidências de governança e preparação para o AI Act, sem garantias jurídicas.',
  },
  es: {
    title: 'Apoyo a compliance y gobernanza de IA | RISCK COMPLY',
    description: 'Conoce el apoyo de RISCK COMPLY a inventario de IA, riesgo, evidencias de gobernanza y preparación para el AI Act, sin garantías jurídicas.',
  },
  fr: {
    title: 'Support conformité et gouvernance IA | RISCK COMPLY',
    description: 'Découvrez comment RISCK COMPLY soutient inventaire IA, risques, preuves de gouvernance et préparation au AI Act, sans garantie juridique.',
  },
  it: {
    title: 'Supporto compliance e governance IA | RISCK COMPLY',
    description: 'Scopri come RISCK COMPLY supporta inventario IA, rischio, evidenze di governance e preparazione all’AI Act, senza garanzie legali.',
  },
  de: {
    title: 'Unterstützung für KI-Governance und Compliance | RISCK COMPLY',
    description: 'Erfahren Sie, wie RISCK COMPLY KI-Inventar, Risikoworkflows, Governance-Nachweise und AI-Act-Vorbereitung ohne Rechtsgarantie unterstützt.',
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: requestedLocale } = await params;
  const locale = getSafeLocale(requestedLocale);
  const copy = metadataByLocale[locale];

  return makePublicMetadata({
    locale,
    path: '/compliance',
    title: copy.title,
    description: copy.description,
    noIndex: locale !== 'en',
  });
}

export default async function CompliancePage({ params }: PageProps) {
  const { locale } = await params;

  return <TrustCenterPage locale={locale} kind="compliance" />;
}
