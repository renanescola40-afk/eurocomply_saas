import type { Metadata } from 'next';

import { TrustCenterPage } from '@/components/marketing/trust-center-page';
import type { Locale } from '@/lib/i18n/routing';
import { getSafeLocale, makePublicMetadata } from '@/lib/seo/public-metadata';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export const revalidate = 300;
export const dynamic = 'force-static';

const metadataByLocale: Record<Locale, { title: string; description: string }> = {
  en: {
    title: 'Security and Tenant Isolation | RISCK COMPLY Trust Center',
    description: 'Review RISCK COMPLY security posture, tenant isolation, managed infrastructure, auditability and evidence-bound claims for B2B procurement.',
  },
  pt: {
    title: 'Segurança e isolamento de tenants | RISCK COMPLY',
    description: 'Consulte a postura de segurança, isolamento entre organizações, infraestrutura gerida, auditabilidade e limites de evidência da RISCK COMPLY.',
  },
  es: {
    title: 'Seguridad y aislamiento de tenants | RISCK COMPLY',
    description: 'Consulta la postura de seguridad, aislamiento entre organizaciones, infraestructura gestionada, auditabilidad y límites de evidencia de RISCK COMPLY.',
  },
  fr: {
    title: 'Sécurité et isolation des tenants | RISCK COMPLY',
    description: 'Consultez la posture de sécurité, l’isolation entre organisations, l’infrastructure gérée, l’auditabilité et les limites de preuve de RISCK COMPLY.',
  },
  it: {
    title: 'Sicurezza e isolamento dei tenant | RISCK COMPLY',
    description: 'Consulta postura di sicurezza, isolamento tra organizzazioni, infrastruttura gestita, auditabilità e limiti delle evidenze di RISCK COMPLY.',
  },
  de: {
    title: 'Sicherheit und Tenant-Isolation | RISCK COMPLY',
    description: 'Prüfen Sie Sicherheitslage, Organisationstrennung, verwaltete Infrastruktur, Auditierbarkeit und nachweisgebundene Aussagen von RISCK COMPLY.',
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: requestedLocale } = await params;
  const locale = getSafeLocale(requestedLocale);
  const copy = metadataByLocale[locale];

  return makePublicMetadata({
    locale,
    path: '/security',
    title: copy.title,
    description: copy.description,
    noIndex: locale !== 'en',
  });
}

export default async function PublicPage({ params }: PageProps) {
  const { locale } = await params;

  return <TrustCenterPage locale={locale} kind="security" />;
}
