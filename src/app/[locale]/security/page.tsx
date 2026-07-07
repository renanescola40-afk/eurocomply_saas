import type { Metadata } from 'next';

import { TrustCenterPage } from '@/components/marketing/trust-center-page';
import { getSafeLocale, makePublicMetadata } from '@/lib/seo/public-metadata';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export const revalidate = 300;
export const dynamic = 'force-static';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: requestedLocale } = await params;
  const locale = getSafeLocale(requestedLocale);

  return makePublicMetadata({
    locale,
    path: '/security',
    title: 'Security - RISCK COMPLY Trust Center',
    description: 'Review RISCK COMPLY security posture, tenant isolation, managed infrastructure, auditability and evidence-bound claims for B2B procurement.',
  });
}

export default async function PublicPage({ params }: PageProps) {
  const { locale } = await params;

  return <TrustCenterPage locale={locale} kind="security" />;
}
