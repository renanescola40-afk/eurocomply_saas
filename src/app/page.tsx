// Root page — redirect to locale-aware route.
// This must be a server component.
import { redirect } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { routing } from '@/lib/i18n/routing';
import { cookies, headers } from 'next/headers';
import { COUNTRY_TO_LOCALE, type Locale } from '@/lib/i18n/routing';

const LOCALE_COOKIE = 'NEXT_LOCALE';

async function detectLocale(): Promise<string> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && routing.locales.includes(cookieLocale as 'en')) {
    return cookieLocale;
  }

  const headersList = await headers();
  const country =
    headersList.get('cf-ipcountry') ??
    headersList.get('x-vercel-ip-country') ??
    '';

  if (country && COUNTRY_TO_LOCALE[country]) {
    return COUNTRY_TO_LOCALE[country];
  }

  const acceptLanguage = headersList.get('accept-language') ?? '';
  const browserLocales = acceptLanguage
    .split(',')
    .map((l) => l.split(';')[0].trim().toLowerCase().replace('_', '-'))
    .filter(Boolean);

  for (const bl of browserLocales) {
    if (routing.locales.includes(bl as 'en')) return bl;
    const base = bl.split('-')[0];
    if (routing.locales.includes(base as 'en')) return base;
  }

  return routing.defaultLocale;
}

export default async function RootPage() {
  const locale = await detectLocale();
  redirect(`/${locale}`);
}
