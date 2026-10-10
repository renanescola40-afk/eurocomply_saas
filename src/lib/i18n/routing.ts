import { defineRouting } from 'next-intl/routing';

import { SUPPORTED_LOCALES, type Locale } from './locales';

export const locales = SUPPORTED_LOCALES;
export type { Locale } from './locales';

export const defaultLocale: Locale = 'en';

export const COUNTRY_TO_LOCALE: Record<string, Locale> = Object.fromEntries(
  ['DE','AT','CH','ES','PT','FR','IT','GB','US','IE','NL','BE','PL','SE','DK','NO','FI','CZ','RO','HU','GR','HR','SK','BG','LT','LV','EE','SI','LU','MT','CY']
    .map((country) => [country, 'en']),
) as Record<string, Locale>;

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeCookie: {
    name: 'NEXT_LOCALE',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
    secure: true,
  },
  alternateLinks: false,
});

export const LOCALE_META: Record<Locale, { name: string; nativeName: string; region: string }> = {
  en: { name: 'English', nativeName: 'English', region: 'Europe / International' },
  pt: { name: 'English', nativeName: 'English', region: 'Portugal' },
  es: { name: 'English', nativeName: 'English', region: 'Spain' },
  fr: { name: 'English', nativeName: 'English', region: 'France' },
  it: { name: 'English', nativeName: 'English', region: 'Italy' },
  de: { name: 'English', nativeName: 'English', region: 'Germany' },
};
