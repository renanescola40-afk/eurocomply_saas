export const SUPPORTED_LOCALES = ['en', 'pt', 'es', 'fr', 'it', 'de'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(locale: string | null | undefined): locale is Locale {
  return typeof locale === 'string' && SUPPORTED_LOCALES.includes(locale as Locale);
}

export function normalizeLocale(locale: string | null | undefined, fallback: Locale = 'en'): Locale {
  return isSupportedLocale(locale) ? locale : fallback;
}
