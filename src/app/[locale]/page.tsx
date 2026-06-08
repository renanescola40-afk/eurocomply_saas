import { EnterpriseHome } from '@/components/marketing/enterprise-home';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';

export default function HomePage({ params }: { params: { locale: string } }) {
  const locale = (locales.includes(params.locale as Locale) ? params.locale : defaultLocale) as Locale;

  return <EnterpriseHome locale={locale} />;
}
