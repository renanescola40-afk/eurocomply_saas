import { type Locale } from '@/lib/i18n/routing';
import { getSiteUrl } from '@/lib/seo/public-metadata';

import { enFeaturePages } from './en';
import { FEATURE_KEYS, type FeatureKey, type FeaturePageCopy, type FeatureStaticParam } from './types';

export { FEATURE_KEYS } from './types';
export type { FeatureKey, FeaturePageCopy } from './types';

export function getFeaturePages(_locale: Locale): FeaturePageCopy[] {
  return FEATURE_KEYS.map((key) => enFeaturePages[key]);
}

export function getFeaturePage(_locale: Locale, key: FeatureKey): FeaturePageCopy {
  return enFeaturePages[key];
}

export function getFeaturePageBySlug(_locale: Locale, slug: string): FeaturePageCopy | null {
  return getFeaturePages('en').find((page) => page.slug === slug) ?? null;
}

export function getFeaturePath(_locale: Locale, key: FeatureKey) {
  return `/en/features/${getFeaturePage('en', key).slug}`;
}

export function getFeatureStaticParams(): FeatureStaticParam[] {
  return getFeaturePages('en').map((page) => ({ locale: 'en', feature: page.slug }));
}

export function getFeatureLanguageAlternates(key: FeatureKey): Record<string, string> {
  const siteUrl = getSiteUrl();
  const englishUrl = `${siteUrl}${getFeaturePath('en', key)}`;
  return { en: englishUrl, 'x-default': englishUrl };
}
