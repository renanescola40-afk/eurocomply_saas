/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { sanitizeAnalyticsProperties } from '../../src/lib/analytics/events';
import {
  classifyPublicMarketingPage,
  getMarketingAttributionProperties,
  marketingAttributionStorageKeys,
  persistMarketingAttribution,
} from '../../src/lib/analytics/marketing-attribution';

describe('marketing attribution', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/en');
  });

  it('preserves first touch while updating last touch on a new acquisition signal', () => {
    window.history.replaceState(
      {},
      '',
      '/en/pricing?utm_source=google&utm_medium=cpc&utm_campaign=ai-governance',
    );
    persistMarketingAttribution();

    window.history.replaceState(
      {},
      '',
      '/en/book-demo?utm_source=linkedin&utm_medium=paid-social&utm_campaign=article-50',
    );
    persistMarketingAttribution();

    const firstTouch = JSON.parse(
      window.localStorage.getItem(marketingAttributionStorageKeys.firstTouch) || '{}',
    ) as Record<string, string>;
    const lastTouch = JSON.parse(
      window.localStorage.getItem(marketingAttributionStorageKeys.lastTouch) || '{}',
    ) as Record<string, string>;

    expect(firstTouch.utm_source).toBe('google');
    expect(firstTouch.utm_campaign).toBe('ai-governance');
    expect(firstTouch.landing_path).toBe('/en/pricing');
    expect(lastTouch.utm_source).toBe('linkedin');
    expect(lastTouch.utm_campaign).toBe('article-50');
    expect(lastTouch.landing_path).toBe('/en/book-demo');

    expect(getMarketingAttributionProperties('first_touch')).toMatchObject({
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'ai-governance',
      landing_path: '/en/pricing',
      attribution_model: 'first_touch',
    });
    expect(getMarketingAttributionProperties('last_touch')).toMatchObject({
      utm_source: 'linkedin',
      utm_medium: 'paid-social',
      utm_campaign: 'article-50',
      landing_path: '/en/book-demo',
      attribution_model: 'last_touch',
    });
  });

  it('maps only canonical public acquisition surfaces to the provider event taxonomy', () => {
    expect(classifyPublicMarketingPage('/en')).toMatchObject({ event: 'landing_view', pageType: 'landing' });
    expect(classifyPublicMarketingPage('/de/pricing')).toMatchObject({ event: 'pricing_view', pageType: 'pricing' });
    expect(classifyPublicMarketingPage('/fr/features/ai-inventory')).toMatchObject({ event: 'feature_view', pageType: 'feature' });
    expect(classifyPublicMarketingPage('/pt/trust')).toMatchObject({ event: 'trust_view', pageType: 'trust' });
    expect(classifyPublicMarketingPage('/es/resources')).toMatchObject({ event: 'resource_view', pageType: 'resource' });
    expect(classifyPublicMarketingPage('/en/dashboard')).toBeNull();
    expect(classifyPublicMarketingPage('/en/billing')).toBeNull();
  });

  it('allows bounded acquisition metadata while stripping PII-shaped string properties', () => {
    const sanitized = sanitizeAnalyticsProperties({
      utm_source: 'linkedin',
      utm_campaign: 'ai-governance',
      landing_path: '/en/pricing',
      attribution_model: 'last_touch',
      work_email: 'person@example.com',
      company_name: 'Example Ltd',
      free_text: 'should not leave the browser',
      count: 1,
    });

    expect(sanitized).toMatchObject({
      utm_source: 'linkedin',
      utm_campaign: 'ai-governance',
      landing_path: '/en/pricing',
      attribution_model: 'last_touch',
      count: 1,
    });
    expect(sanitized).not.toHaveProperty('work_email');
    expect(sanitized).not.toHaveProperty('company_name');
    expect(sanitized).not.toHaveProperty('free_text');
  });
});
