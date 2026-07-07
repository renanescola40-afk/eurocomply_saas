import type { MetadataRoute } from 'next';

import { locales, type Locale } from '@/lib/i18n/routing';
import { getLocaleAlternates, getSiteUrl, localeLanguageTags } from '@/lib/seo/public-metadata';

const publicPaths = ['', '/pricing', '/trust', '/security', '/compliance', '/data-processing', '/sla', '/privacy', '/terms', '/dpa', '/subprocessors', '/status'] as const;
const stableLastModified = new Date('2026-07-07T00:00:00.000Z');

function priorityFor(path: string) {
  if (path === '') return 1;
  if (path === '/pricing') return 0.9;
  if (path === '/trust') return 0.85;
  if (path === '/security' || path === '/compliance' || path === '/data-processing' || path === '/sla') return 0.8;
  if (path === '/status') return 0.6;
  return 0.7;
}

function localizedUrl(appUrl: string, locale: Locale, path: string) {
  return `${appUrl}/${locale}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = getSiteUrl();

  return locales.flatMap((locale) =>
    publicPaths.map((path) => ({
      url: localizedUrl(appUrl, locale, path),
      lastModified: stableLastModified,
      changeFrequency: path === '' || path === '/pricing' ? 'weekly' : 'monthly',
      priority: priorityFor(path),
      alternates: {
        languages: {
          ...getLocaleAlternates(path),
          [localeLanguageTags[locale]]: localizedUrl(appUrl, locale, path),
        },
      },
    })),
  );
}
