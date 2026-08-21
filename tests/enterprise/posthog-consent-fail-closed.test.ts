/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  grantAnalyticsConsent,
  initPostHog,
  isAnalyticsConsentRequired,
} from '../../src/lib/analytics/posthog-client';

function resetPostHogRuntime() {
  document.getElementById('posthog-js-sdk')?.remove();
  window.localStorage.clear();
  delete window.posthog;
  delete window.__posthogLoaded;
  delete window.__posthogLoading;
}

describe('PostHog consent configuration', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    delete process.env.NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT;
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test_public_key');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://analytics.invalid');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_ASSET_HOST', 'https://assets.invalid');
    resetPostHogRuntime();
  });

  afterEach(() => {
    resetPostHogRuntime();
    vi.unstubAllEnvs();
  });

  it('fails closed when the consent-required build variable is absent', () => {
    expect(isAnalyticsConsentRequired()).toBe(true);

    initPostHog('/pt');

    expect(document.getElementById('posthog-js-sdk')).toBeNull();
    expect(window.posthog).toBeUndefined();
  });

  it('initializes only after an explicit grant when the variable is absent', () => {
    expect(isAnalyticsConsentRequired()).toBe(true);

    grantAnalyticsConsent();
    initPostHog('/pt');

    expect(window.localStorage.getItem('risckcomply.analytics.consent')).toBe('granted');
    expect(document.getElementById('posthog-js-sdk')).not.toBeNull();
    expect(window.posthog).toBeDefined();
  });

  it('allows consent-required mode to be disabled only with an explicit false value', () => {
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT', 'false');

    expect(isAnalyticsConsentRequired()).toBe(false);

    initPostHog('/pt');

    expect(document.getElementById('posthog-js-sdk')).not.toBeNull();
    expect(window.posthog).toBeDefined();
  });
});
