import { locales, type Locale } from '@/lib/i18n/routing';
import { getSiteUrl, localeLanguageTags } from '@/lib/seo/public-metadata';

import { deFeaturePages } from './de';
import { enFeaturePages } from './en';
import { esFeaturePages } from './es';
import { frFeaturePages } from './fr';
import { itFeaturePages } from './it';
import { ptFeaturePages } from './pt';
import { FEATURE_KEYS, type FeatureKey, type FeaturePageCopy, type FeatureStaticParam, type LocalizedFeaturePages } from './types';

const featurePagesByLocale: Record<Locale, LocalizedFeaturePages> = {
  en: enFeaturePages,
  pt: ptFeaturePages,
  es: esFeaturePages,
  fr: frFeaturePages,
  it: itFeaturePages,
  de: deFeaturePages,
};

export { FEATURE_KEYS } from './types';
export type { FeatureKey, FeaturePageCopy } from './types';

export function getFeaturePages(locale: Locale): FeaturePageCopy[] {
  return FEATURE_KEYS.map((key) => featurePagesByLocale[locale][key]);
}

export function getFeaturePage(locale: Locale, key: FeatureKey): FeaturePageCopy {
  return featurePagesByLocale[locale][key];
}

export function getFeaturePageBySlug(locale: Locale, slug: string): FeaturePageCopy | null {
  return getFeaturePages(locale).find((page) => page.slug === slug) ?? null;
}

export function getFeaturePath(locale: Locale, key: FeatureKey) {
  return `/${locale}/features/${getFeaturePage(locale, key).slug}`;
}

export function getFeatureStaticParams(): FeatureStaticParam[] {
  return locales.flatMap((locale) => getFeaturePages(locale).map((page) => ({ locale, feature: page.slug })));
}

export function getFeatureLanguageAlternates(key: FeatureKey): Record<string, string> {
  const siteUrl = getSiteUrl();
  const entries = locales.map((locale) => [localeLanguageTags[locale], `${siteUrl}${getFeaturePath(locale, key)}`]);

  return {
    ...Object.fromEntries(entries),
    'x-default': `${siteUrl}${getFeaturePath('en', key)}`,
  };
}
