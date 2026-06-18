import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';
import { type PublicAuthErrorCode } from '@/lib/auth/public-errors';

const DASHBOARD_PATH = '/dashboard/organizations';

export function getLocaleFromAuthCallbackNextPath(nextPath: string) {
  const firstSegment = nextPath.split('/').filter(Boolean)[0] as Locale | undefined;
  return firstSegment && locales.includes(firstSegment) ? firstSegment : defaultLocale;
}

export function getSafeAuthCallbackNextPath(rawNext: string | null) {
  if (!rawNext || rawNext === '/' || rawNext.includes('://') || rawNext.startsWith('//')) {
    return `/${defaultLocale}${DASHBOARD_PATH}`;
  }

  const locale = getLocaleFromAuthCallbackNextPath(rawNext);

  if (!rawNext.startsWith(`/${locale}/dashboard`)) {
    return `/${locale}${DASHBOARD_PATH}`;
  }

  return rawNext;
}

export function getAuthCallbackLoginUrl(
  requestUrl: string | URL,
  nextPath: string,
  errorCode: PublicAuthErrorCode,
) {
  const locale = getLocaleFromAuthCallbackNextPath(nextPath);
  const loginUrl = new URL(`/${locale}/login`, requestUrl);
  loginUrl.searchParams.set('error', errorCode);
  loginUrl.searchParams.set('next', nextPath);
  return loginUrl;
}
