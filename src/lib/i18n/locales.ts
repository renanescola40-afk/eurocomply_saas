export const SUPPORTED_LOCALES = ['en', 'pt', 'es', 'fr', 'it', 'de'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type SupportedLocale = Locale;

export function isSupportedLocale(locale: string | null | undefined): locale is Locale {
  return typeof locale === 'string' && SUPPORTED_LOCALES.includes(locale as Locale);
}

export function normalizeLocale(_locale: string | null | undefined, _fallback: Locale = 'en'): Locale {
  // RISCK COMPLY is English-only at runtime. Historical locale identifiers remain
  // recognized only so middleware and legacy links can redirect safely to /en.
  return 'en';
}
