import { TrustCenterPage } from '@/components/trust/trust-page';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';
import { getLocalizedTrustCenterPage } from '@/lib/trust-center/localized-content';
import { applyVerifiedTrustAuthority } from '@/lib/trust-center/verified-authority';

export const revalidate = 300;

type PageProps = {
  params: Promise<{ locale: string }>;
};

function safeLocale(value: string): Locale {
  return (locales.includes(value as Locale) ? value : defaultLocale) as Locale;
}

export default async function SubprocessorsPage({ params }: PageProps) {
  const { locale: requestedLocale } = await params;
  const locale = safeLocale(requestedLocale);
  const page = applyVerifiedTrustAuthority(getLocalizedTrustCenterPage('subprocessors', locale), locale);

  return <TrustCenterPage locale={locale} page={page} />;
}
