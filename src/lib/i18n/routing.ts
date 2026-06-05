import { defineRouting } from 'next-intl/routing';

export const locales = ['en', 'pt', 'es', 'fr', 'it', 'de'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

// ─────────────────────────────────────────────────────────────────────────────
// Mapa de país → idioma (para deteção automática)
// ─────────────────────────────────────────────────────────────────────────────
export const COUNTRY_TO_LOCALE: Record<string, Locale> = {
  // DACH
  DE: 'de',
  AT: 'de',
  CH: 'de',

  // Iberia
  ES: 'es',
  PT: 'pt',
  BR: 'pt',

  // França
  FR: 'fr',

  // Itália
  IT: 'it',

  // UK & global
  GB: 'en',
  US: 'en',
  IE: 'en',
  NL: 'en',
  BE: 'en',
  PL: 'en',
  SE: 'en',
  DK: 'en',
  NO: 'en',
  FI: 'en',
  CZ: 'en',
  RO: 'en',
  HU: 'en',
  GR: 'en',
  HR: 'en',
  SK: 'en',
  BG: 'en',
  LT: 'en',
  LV: 'en',
  EE: 'en',
  SI: 'en',
  LU: 'en',
  MT: 'en',
  CY: 'en',
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Always use explicit locale prefixes for predictable SaaS routing and SEO:
  // /en, /pt, /es, /fr, /it, /de
  localePrefix: 'always',
});

// ─────────────────────────────────────────────────────────────────────────────
// Bandeiras e nomes para o LanguageSwitcher
// ─────────────────────────────────────────────────────────────────────────────
export const LOCALE_META: Record<Locale, { name: string; flag: string; nativeName: string }> = {
  en: { name: 'English', flag: '🇬🇧', nativeName: 'English' },
  pt: { name: 'Portuguese', flag: '🇧🇷', nativeName: 'Português' },
  es: { name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
  fr: { name: 'French', flag: '🇫🇷', nativeName: 'Français' },
  it: { name: 'Italian', flag: '🇮🇹', nativeName: 'Italiano' },
  de: { name: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
};
