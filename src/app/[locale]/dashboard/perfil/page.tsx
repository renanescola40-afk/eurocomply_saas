import { redirect } from 'next/navigation';

import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';

export default async function LegacyDashboardProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = (locales.includes(locale as Locale) ? locale : defaultLocale) as Locale;
  redirect(`/${safeLocale}/profile`);
}
