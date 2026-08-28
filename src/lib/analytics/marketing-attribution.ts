'use client';

import { analyticsEvents, type AnalyticsEventName, type AnalyticsProperties } from './events';

const CONSENT_STORAGE_KEY = 'risckcomply.analytics.consent';
const FIRST_TOUCH_STORAGE_KEY = 'risckcomply.analytics.first_touch';
const LAST_TOUCH_STORAGE_KEY = 'risckcomply.analytics.last_touch';
const MAX_ATTRIBUTION_VALUE_LENGTH = 160;
const SAFE_CAMPAIGN_VALUE = /^[A-Za-z0-9][A-Za-z0-9._~%+:-]{0,159}$/;
const MARKETING_LOCALE_PATTERN = /^\/(en|pt|es|fr|it|de)(?=\/|$)/;

export type MarketingAttributionModel = 'first_touch' | 'last_touch';
export type MarketingLocale = 'en' | 'pt' | 'es' | 'fr' | 'it' | 'de';

type MarketingTouch = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer_domain?: string;
  landing_path: string;
};

export type PublicMarketingPage = {
  event: AnalyticsEventName;
  pageType: 'landing' | 'pricing' | 'feature' | 'trust' | 'resource' | 'tool';
  funnelStage: 'awareness' | 'consideration' | 'assurance';
};

function normalizeAttributionValue(value: string | null | undefined, maxLength = MAX_ATTRIBUTION_VALUE_LENGTH) {
  const normalized = value?.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, maxLength);
  return normalized || undefined;
}

function normalizeCampaignValue(value: string | null | undefined) {
  const normalized = normalizeAttributionValue(value);
  return normalized && SAFE_CAMPAIGN_VALUE.test(normalized) ? normalized : undefined;
}

function isAttributionStorageAllowed() {
  if (typeof window === 'undefined') return false;
  if (process.env.NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT === 'false') return true;
  return window.localStorage.getItem(CONSENT_STORAGE_KEY) === 'granted';
}

function getExternalReferrerDomain() {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !document.referrer) return undefined;

  try {
    const hostname = new URL(document.referrer).hostname.toLowerCase();
    if (!hostname || hostname === window.location.hostname.toLowerCase()) return undefined;
    return normalizeAttributionValue(hostname, 120);
  } catch {
    return undefined;
  }
}

function buildCurrentTouch(): MarketingTouch {
  const searchParams = new URLSearchParams(window.location.search);

  return {
    utm_source: normalizeCampaignValue(searchParams.get('utm_source')),
    utm_medium: normalizeCampaignValue(searchParams.get('utm_medium')),
    utm_campaign: normalizeCampaignValue(searchParams.get('utm_campaign')),
    utm_content: normalizeCampaignValue(searchParams.get('utm_content')),
    utm_term: normalizeCampaignValue(searchParams.get('utm_term')),
    referrer_domain: getExternalReferrerDomain(),
    landing_path: normalizeAttributionValue(window.location.pathname, 240) || '/',
  };
}

function hasAcquisitionSignal(touch: MarketingTouch) {
  return Boolean(
    touch.utm_source
    || touch.utm_medium
    || touch.utm_campaign
    || touch.utm_content
    || touch.utm_term
    || touch.referrer_domain,
  );
}

function isMarketingTouch(value: unknown): value is MarketingTouch {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.landing_path === 'string' && record.landing_path.startsWith('/');
}

function readStoredTouch(key: string) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isMarketingTouch(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredTouch(key: string, touch: MarketingTouch) {
  try {
    window.localStorage.setItem(key, JSON.stringify(touch));
  } catch {
    // Analytics attribution must never block the product when browser storage is unavailable.
  }
}

export function getMarketingLocale(pathname: string): MarketingLocale | null {
  const match = pathname.match(MARKETING_LOCALE_PATTERN);
  return (match?.[1] as MarketingLocale | undefined) || null;
}

function stripLocale(pathname: string) {
  return pathname.replace(MARKETING_LOCALE_PATTERN, '') || '/';
}

export function classifyPublicMarketingPage(pathname: string): PublicMarketingPage | null {
  const route = stripLocale(pathname).replace(/\/$/, '') || '/';

  if (route === '/') {
    return { event: analyticsEvents.landingView, pageType: 'landing', funnelStage: 'awareness' };
  }

  if (route === '/pricing') {
    return { event: analyticsEvents.pricingView, pageType: 'pricing', funnelStage: 'consideration' };
  }

  if (route.startsWith('/features/')) {
    return { event: analyticsEvents.featureView, pageType: 'feature', funnelStage: 'consideration' };
  }

  if (route === '/tools' || route.startsWith('/tools/')) {
    return { event: analyticsEvents.resourceView, pageType: 'tool', funnelStage: 'consideration' };
  }

  if (route === '/resources' || route.startsWith('/resources/')) {
    return { event: analyticsEvents.resourceView, pageType: 'resource', funnelStage: 'awareness' };
  }

  if (
    route === '/trust'
    || route.startsWith('/trust/')
    || route === '/security'
    || route === '/compliance'
    || route === '/data-processing'
    || route === '/dpa'
    || route === '/subprocessors'
    || route === '/sla'
    || route === '/vulnerability-disclosure'
  ) {
    return { event: analyticsEvents.trustView, pageType: 'trust', funnelStage: 'assurance' };
  }

  return null;
}

export function persistMarketingAttribution() {
  if (typeof window === 'undefined' || !isAttributionStorageAllowed()) {
    return { firstTouch: null, lastTouch: null };
  }

  const storedFirstTouch = readStoredTouch(FIRST_TOUCH_STORAGE_KEY);
  const storedLastTouch = readStoredTouch(LAST_TOUCH_STORAGE_KEY);
  const route = stripLocale(window.location.pathname).replace(/\/$/, '') || '/';

  if (!classifyPublicMarketingPage(window.location.pathname) && route !== '/book-demo') {
    return { firstTouch: storedFirstTouch, lastTouch: storedLastTouch };
  }

  const current = buildCurrentTouch();
  let firstTouch = storedFirstTouch;
  let lastTouch = storedLastTouch;

  if (!firstTouch) {
    firstTouch = current;
    writeStoredTouch(FIRST_TOUCH_STORAGE_KEY, current);
  }

  if (!lastTouch || hasAcquisitionSignal(current)) {
    lastTouch = current;
    writeStoredTouch(LAST_TOUCH_STORAGE_KEY, current);
  }

  return { firstTouch, lastTouch };
}

export function getMarketingAttributionProperties(
  model: MarketingAttributionModel = 'last_touch',
): AnalyticsProperties {
  if (typeof window === 'undefined') return { attribution_model: model };

  const { firstTouch, lastTouch } = persistMarketingAttribution();
  const selected = model === 'first_touch' ? firstTouch : lastTouch;

  if (!selected) return { attribution_model: model };

  return {
    ...(selected.utm_source ? { utm_source: selected.utm_source } : {}),
    ...(selected.utm_medium ? { utm_medium: selected.utm_medium } : {}),
    ...(selected.utm_campaign ? { utm_campaign: selected.utm_campaign } : {}),
    ...(selected.utm_content ? { utm_content: selected.utm_content } : {}),
    ...(selected.utm_term ? { utm_term: selected.utm_term } : {}),
    ...(selected.referrer_domain ? { referrer_domain: selected.referrer_domain } : {}),
    landing_path: selected.landing_path,
    attribution_model: model,
  };
}

export const marketingAttributionStorageKeys = {
  firstTouch: FIRST_TOUCH_STORAGE_KEY,
  lastTouch: LAST_TOUCH_STORAGE_KEY,
} as const;
