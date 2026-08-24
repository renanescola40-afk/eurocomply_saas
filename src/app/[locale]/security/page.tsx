import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TrustCenterPage } from '@/components/trust/trust-page';
import { locales, type Locale } from '@/lib/i18n/routing';
import { getSafeLocale, makePublicMetadata } from '@/lib/seo/public-metadata';
import { getLocalizedTrustCenterPage } from '@/lib/trust-center/localized-content';
import { applyVerifiedTrustAuthority } from '@/lib/trust-center/verified-authority';

export const revalidate = 300;

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: requestedLocale } = await params;
  const locale = getSafeLocale(requestedLocale);
  const page = applyVerifiedTrustAuthority(getLocalizedTrustCenterPage('security', locale), locale);

  return makePublicMetadata({
    locale,
    path: '/security',
    title: `${page.title} - RISCK COMPLY`,
    description: page.subtitle,
    noIndex: locale !== 'en',
  });
}

export default async function SecurityPage({ params }: PageProps) {
  const { locale: requestedLocale } = await params;
  if (!locales.includes(requestedLocale as Locale)) notFound();

  const locale = requestedLocale as Locale;
  const page = applyVerifiedTrustAuthority(getLocalizedTrustCenterPage('security', locale), locale);
  return <TrustCenterPage locale={locale} page={page} />;
}
