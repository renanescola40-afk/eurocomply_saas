import { redirect } from 'next/navigation';
import { EnterpriseHome } from '@/components/marketing/enterprise-home';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';
import { getCurrentUser } from '@/server/queries/auth';

export default async function HomePage({ params }: { params: { locale: string } }) {
  const locale = (locales.includes(params.locale as Locale) ? params.locale : defaultLocale) as Locale;
  const user = await getCurrentUser();

  if (user) {
    redirect(`/${locale}/dashboard/organizations`);
  }

  return <EnterpriseHome locale={locale} />;
}
