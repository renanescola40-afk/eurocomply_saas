import type { Metadata } from 'next';

import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';

export const SITE_NAME = 'RISCK COMPLY';
export const SITE_DEFAULT_URL = 'https://risckcomply.app';

export const localeLanguageTags: Record<Locale, string> = {
  en: 'en',
  pt: 'pt-PT',
  es: 'es-ES',
  fr: 'fr-FR',
  it: 'it-IT',
  de: 'de-DE',
};

export function getSafeLocale(value: string): Locale {
  return (locales.includes(value as Locale) ? value : defaultLocale) as Locale;
}

export function getSiteUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL ?? SITE_DEFAULT_URL;

  try {
    const url = new URL(rawUrl);
    url.pathname = url.pathname.replace(/\/$/, '');
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return SITE_DEFAULT_URL;
  }
}

export function localizePublicPath(locale: Locale, path = '') {
  const normalizedPath = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  return `/${locale}${normalizedPath}`;
}

export function getCanonicalUrl(locale: Locale, path = '') {
  return `${getSiteUrl()}${localizePublicPath(locale, path)}`;
}

export function getLocaleAlternates(path = ''): Record<string, string> {
  const appUrl = getSiteUrl();
  const normalizedPath = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  const entries = locales.map((locale) => [localeLanguageTags[locale], `${appUrl}/${locale}${normalizedPath}`]);

  return {
    ...Object.fromEntries(entries),
    'x-default': `${appUrl}/${defaultLocale}${normalizedPath}`,
  };
}

export function getOpenGraphLocale(locale: Locale) {
  return localeLanguageTags[locale].replace('-', '_');
}

type PublicMetadataInput = {
  locale: Locale;
  path?: string;
  title: string;
  description: string;
  noIndex?: boolean;
};

export function makePublicMetadata({ locale, path = '', title, description, noIndex = false }: PublicMetadataInput): Metadata {
  const canonicalPath = localizePublicPath(locale, path);
  const canonicalUrl = getCanonicalUrl(locale, path);

  return {
    metadataBase: new URL(getSiteUrl()),
    applicationName: SITE_NAME,
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: getLocaleAlternates(path),
    },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title,
      description,
      url: canonicalUrl,
      locale: getOpenGraphLocale(locale),
      alternateLocale: locales.filter((alternateLocale) => alternateLocale !== locale).map(getOpenGraphLocale),
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: { index: false, follow: false },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-snippet': -1,
            'max-image-preview': 'large',
            'max-video-preview': -1,
          },
        },
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
  };
}
