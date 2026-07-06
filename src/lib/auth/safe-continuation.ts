import { locales, type Locale } from '@/lib/i18n/routing';

export const AUTH_CONTINUATION_MAX_LENGTH = 240;

export const AUTH_CONTINUATION_ROUTES = [
  '/onboarding',
  '/checkout',
  '/dashboard/organizations',
  '/dashboard/observability',
] as const;

export function normalizeContinuationLocale(locale: string | null | undefined): Locale {
  return locale && locales.includes(locale as Locale) ? (locale as Locale) : 'pt';
}

export function isSafeLocalizedAuthContinuation(path: string | null | undefined, locale: string | null | undefined) {
  const safeLocale = normalizeContinuationLocale(locale);
  const value = path?.trim();

  if (!value || value.length > AUTH_CONTINUATION_MAX_LENGTH) return false;
  if (!value.startsWith(`/${safeLocale}/`) && value !== `/${safeLocale}/onboarding`) return false;
  if (value.startsWith('//') || value.includes('://')) return false;

  return AUTH_CONTINUATION_ROUTES.some((route) => {
    const localizedRoute = `/${safeLocale}${route}`;
    return value === localizedRoute || value.startsWith(`${localizedRoute}/`) || value.startsWith(`${localizedRoute}?`);
  });
}

export function getSafeLocalizedAuthContinuation(
  path: string | null | undefined,
  locale: string | null | undefined,
  fallbackRoute = '/onboarding',
) {
  const safeLocale = normalizeContinuationLocale(locale);
  const fallback = `/${safeLocale}${fallbackRoute.startsWith('/') ? fallbackRoute : `/${fallbackRoute}`}`;
  return isSafeLocalizedAuthContinuation(path, safeLocale) ? path!.trim() : fallback;
}
