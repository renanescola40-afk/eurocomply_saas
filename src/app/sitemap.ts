import type { MetadataRoute } from 'next';

import { locales, type Locale } from '@/lib/i18n/routing';
import { getFeatureLanguageAlternates, getFeaturePages, getFeaturePath } from '@/lib/seo/feature-pages';
import { getLocaleAlternates, getSiteUrl, localeLanguageTags } from '@/lib/seo/public-metadata';

const publicPaths = ['', '/pricing', '/trust', '/security', '/compliance', '/data-processing', '/sla', '/privacy', '/terms', '/dpa', '/subprocessors'] as const;
const stableLastModified = new Date('2026-08-01T00:00:00.000Z');

function priorityFor(path: string) {
  if (path === '') return 1;
  if (path === '/pricing') return 0.9;
  if (path === '/trust') return 0.85;
  if (path === '/security' || path === '/compliance' || path === '/data-processing' || path === '/sla') return 0.8;
  return 0.7;
}

function localizedUrl(appUrl: string, locale: Locale, path: string) {
  return `${appUrl}/${locale}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = getSiteUrl();

  const coreEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
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

  const featureEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    getFeaturePages(locale).map((page) => ({
      url: `${appUrl}${getFeaturePath(locale, page.key)}`,
      lastModified: stableLastModified,
      changeFrequency: 'weekly',
      priority: 0.85,
      alternates: {
        languages: getFeatureLanguageAlternates(page.key),
      },
    })),
  );

  return [...coreEntries, ...featureEntries];
}
