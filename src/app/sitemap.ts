import type { MetadataRoute } from 'next';

import { locales, type Locale } from '@/lib/i18n/routing';
import { getFeatureLanguageAlternates, getFeaturePages, getFeaturePath } from '@/lib/seo/feature-pages';
import { getLocaleAlternates, getSiteUrl, localeLanguageTags } from '@/lib/seo/public-metadata';

const acquisitionPaths = ['', '/pricing'] as const;
const englishAssurancePaths = ['/trust', '/security', '/compliance', '/data-processing', '/sla', '/privacy', '/terms', '/dpa', '/subprocessors'] as const;
const englishGrowthPaths = ['/resources', '/tools', '/tools/ai-act-readiness'] as const;
const stableLastModified = new Date('2026-08-01T00:00:00.000Z');
const growthLastModified = new Date('2026-08-28T00:00:00.000Z');

function priorityFor(path: string) {
  if (path === '') return 1;
  if (path === '/pricing' || path === '/tools/ai-act-readiness') return 0.9;
  if (path === '/tools') return 0.86;
  if (path === '/trust' || path === '/resources') return 0.85;
  if (path === '/security' || path === '/compliance' || path === '/data-processing' || path === '/sla') return 0.8;
  return 0.7;
}

function localizedUrl(appUrl: string, locale: Locale, path: string) {
  return `${appUrl}/${locale}${path}`;
}

function coreAlternates(appUrl: string, locale: Locale, path: string) {
  if (acquisitionPaths.includes(path as (typeof acquisitionPaths)[number])) {
    return {
      ...getLocaleAlternates(path),
      [localeLanguageTags[locale]]: localizedUrl(appUrl, locale, path),
    };
  }

  const englishUrl = localizedUrl(appUrl, 'en', path);
  return { en: englishUrl, 'x-default': englishUrl };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = getSiteUrl();

  const coreEntries: MetadataRoute.Sitemap = locales.flatMap((locale) => {
    const paths = locale === 'en' ? [...acquisitionPaths, ...englishAssurancePaths] : [...acquisitionPaths];

    return paths.map((path) => ({
      url: localizedUrl(appUrl, locale, path),
      lastModified: stableLastModified,
      changeFrequency: path === '' || path === '/pricing' ? 'weekly' : 'monthly',
      priority: priorityFor(path),
      alternates: {
        languages: coreAlternates(appUrl, locale, path),
      },
    }));
  });

  const growthEntries: MetadataRoute.Sitemap = englishGrowthPaths.map((path) => {
    const url = localizedUrl(appUrl, 'en', path);
    return {
      url,
      lastModified: growthLastModified,
      changeFrequency: 'weekly',
      priority: priorityFor(path),
      alternates: { languages: { en: url, 'x-default': url } },
    };
  });

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

  return [...coreEntries, ...growthEntries, ...featureEntries];
}
