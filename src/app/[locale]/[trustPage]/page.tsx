import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TrustCenterPage } from '@/components/trust/trust-page';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';
import { getTrustCenterPage } from '@/lib/trust-center/content';
import { isTrustCenterSlug } from '@/lib/trust-center/routes';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ locale: string; trustPage: string }>;
};

function safeLocale(value: string): Locale {
  return (locales.includes(value as Locale) ? value : defaultLocale) as Locale;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: requestedLocale, trustPage } = await params;

  if (!isTrustCenterSlug(trustPage)) {
    return {};
  }

  const locale = safeLocale(requestedLocale);
  const page = getTrustCenterPage(trustPage, locale);

  return {
    title: `${page.title} - RISCK COMPLY`,
    description: page.subtitle,
  };
}

export default async function PublicTrustRoute({ params }: PageProps) {
  const { locale: requestedLocale, trustPage } = await params;

  if (!isTrustCenterSlug(trustPage)) {
    notFound();
  }

  const locale = safeLocale(requestedLocale);
  const page = getTrustCenterPage(trustPage, locale);

  return <TrustCenterPage locale={locale} page={page} />;
}
