import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';
import { applyNoStoreHeaders } from '@/server/security/no-store';

const DASHBOARD_PATH = '/dashboard/organizations';
const LOCALE_COOKIE = 'NEXT_LOCALE';

function getLocale(rawLocale: string | null | undefined): Locale {
  return rawLocale && locales.includes(rawLocale as Locale) ? rawLocale as Locale : defaultLocale;
}

function getSafeNextPath(rawNext: string | null, locale: Locale) {
  const fallback = `/${locale}${DASHBOARD_PATH}`;

  if (!rawNext || !rawNext.startsWith('/') || rawNext.startsWith('//')) {
    return fallback;
  }

  return rawNext.startsWith(`/${locale}/`) ? rawNext : fallback;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const locale = getLocale(
    requestUrl.searchParams.get('locale') ?? request.cookies.get(LOCALE_COOKIE)?.value,
  );
  const next = getSafeNextPath(requestUrl.searchParams.get('next'), locale);
  const loginUrl = new URL(`/${locale}/login`, request.url);

  loginUrl.searchParams.set('next', next);
  loginUrl.searchParams.set('notice', 'legacy_google_route');

  return applyNoStoreHeaders(NextResponse.redirect(loginUrl));
}
