import { defineRouting } from 'next-intl/routing';

import { SUPPORTED_LOCALES, type Locale } from './locales';

export const locales = SUPPORTED_LOCALES;
export type { Locale } from './locales';

export const defaultLocale: Locale = 'en';

// ─────────────────────────────────────────────────────────────────────────────
// Mapa de país → idioma (para deteção automática europeia)
// ─────────────────────────────────────────────────────────────────────────────
export const COUNTRY_TO_LOCALE: Record<string, Locale> = {
  // DACH
  DE: 'de',
  AT: 'de',
  CH: 'de',

  // Iberia
  ES: 'es',
  PT: 'pt',

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
  // Public metadata + sitemap are the single hreflang authority. Keeping the
  // next-intl response Link header enabled creates a competing x-default based
  // on the unprefixed request path, while HTML metadata intentionally points
  // x-default to the canonical English URL.
  alternateLinks: false,
});

// ─────────────────────────────────────────────────────────────────────────────
// Nomes europeus para o seletor de idioma
// ─────────────────────────────────────────────────────────────────────────────
export const LOCALE_META: Record<Locale, { name: string; nativeName: string; region: string }> = {
  en: { name: 'English', nativeName: 'English', region: 'Europe / International' },
  pt: { name: 'Portuguese', nativeName: 'Português de Portugal', region: 'Portugal' },
  es: { name: 'Spanish', nativeName: 'Español de España', region: 'España' },
  fr: { name: 'French', nativeName: 'Français', region: 'France' },
  it: { name: 'Italian', nativeName: 'Italiano', region: 'Italia' },
  de: { name: 'German', nativeName: 'Deutsch', region: 'Deutschland' },
};
