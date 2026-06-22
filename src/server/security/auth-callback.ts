import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';
import { type PublicAuthErrorCode } from '@/lib/auth/public-errors';

const DASHBOARD_PATH = '/dashboard/organizations';
const APP_URL_ENV = ['NEXT', 'PUBLIC', 'APP', 'URL'].join('_');

export function getLocaleFromAuthCallbackNextPath(nextPath: string) {
  const firstSegment = nextPath.split('/').filter(Boolean)[0] as Locale | undefined;
  return firstSegment && locales.includes(firstSegment) ? firstSegment : defaultLocale;
}

export function getSafeAuthCallbackNextPathForLocale(rawNext: string | null, locale: Locale) {
  if (!rawNext || rawNext === '/' || rawNext.includes('://') || rawNext.startsWith('//')) {
    return `/${locale}${DASHBOARD_PATH}`;
  }

  if (!rawNext.startsWith(`/${locale}/dashboard`)) {
    return `/${locale}${DASHBOARD_PATH}`;
  }

  return rawNext;
}

export function getSafeAuthCallbackNextPath(rawNext: string | null) {
  if (!rawNext || rawNext === '/' || rawNext.includes('://') || rawNext.startsWith('//')) {
    return `/${defaultLocale}${DASHBOARD_PATH}`;
  }

  const locale = getLocaleFromAuthCallbackNextPath(rawNext);
  return getSafeAuthCallbackNextPathForLocale(rawNext, locale);
}

function parseHttpUrl(rawUrl: string | undefined) {
  if (!rawUrl) return null;

  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed : null;
  } catch {
    return null;
  }
}

export function resolveAuthAppBaseUrl(
  requestUrl: string | URL,
  env: Record<string, string | undefined> = process.env,
) {
  const configured = parseHttpUrl(env[APP_URL_ENV]);
  if (configured) {
    return configured.origin;
  }

  if (env.NODE_ENV === 'production') {
    return null;
  }

  return new URL(requestUrl).origin;
}

export function getAuthCallbackLoginUrl(
  baseUrl: string | URL,
  nextPath: string,
  errorCode: PublicAuthErrorCode,
) {
  const locale = getLocaleFromAuthCallbackNextPath(nextPath);
  const loginUrl = new URL(`/${locale}/login`, baseUrl);
  loginUrl.searchParams.set('error', errorCode);
  loginUrl.searchParams.set('next', nextPath);
  return loginUrl;
}
