import { redirect } from 'next/navigation';
import { locales, type Locale } from '@/lib/i18n/routing';

type PageProps = {
  params: Promise<{ locale: string }>;
};

function getSafeLocale(locale: string): Locale {
  return (locales.includes(locale as Locale) ? locale : 'en') as Locale;
}

export default async function OrganizationMembersRedirectPage({ params }: PageProps) {
  const { locale } = await params;
  const safeLocale = getSafeLocale(locale);

  redirect(`/${safeLocale}/dashboard/organizations/team`);
}
