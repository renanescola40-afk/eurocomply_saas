import { redirect } from 'next/navigation';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';

type RegisterPageProps = {
  params: Promise<{ locale?: string }>;
};

function getLocale(rawLocale: string | undefined): Locale {
  return rawLocale && locales.includes(rawLocale as Locale) ? rawLocale as Locale : defaultLocale;
}

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { locale: rawLocale } = await params;
  const locale = getLocale(rawLocale);

  redirect(`/${locale}/signup`);
}
