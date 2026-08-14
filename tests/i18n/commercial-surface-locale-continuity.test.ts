import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { commercialSurfaceCopy } from '@/lib/i18n/commercial-surface-copy';
import { locales, type Locale } from '@/lib/i18n/routing';

const pricingPage = readFileSync(join(process.cwd(), 'src/app/[locale]/pricing/page.tsx'), 'utf8');
const checkoutPage = readFileSync(join(process.cwd(), 'src/app/[locale]/checkout/page.tsx'), 'utf8');
const loginPage = readFileSync(join(process.cwd(), 'src/app/[locale]/login/page.tsx'), 'utf8');
const signupPage = readFileSync(join(process.cwd(), 'src/app/[locale]/signup/page.tsx'), 'utf8');
const consentBanner = readFileSync(join(process.cwd(), 'src/components/analytics/AnalyticsConsentBanner.tsx'), 'utf8');
const posthogClient = readFileSync(join(process.cwd(), 'src/lib/analytics/posthog-client.ts'), 'utf8');

describe('commercial surface locale continuity', () => {
  it('defines complete purchase/auth/consent copy for every configured locale', () => {
    expect(Object.keys(commercialSurfaceCopy).sort()).toEqual([...locales].sort());

    for (const locale of locales as readonly Locale[]) {
      const copy = commercialSurfaceCopy[locale];
      expect(copy.pricing.heroTitle.length).toBeGreaterThan(20);
      expect(copy.checkout.heroTitle.length).toBeGreaterThan(12);
      expect(copy.login.title.length).toBeGreaterThan(8);
      expect(copy.signup.title.length).toBeGreaterThan(8);
      expect(copy.consent.body.length).toBeGreaterThan(30);
      expect(copy.pricing.plan.starter.cta).toBeTruthy();
      expect(copy.pricing.plan.professional.cta).toBeTruthy();
      expect(copy.pricing.plan.business.cta).toBeTruthy();
      expect(copy.pricing.plan.enterprise.cta).toBeTruthy();
    }
  });

  it('does not silently reuse the English critical journey for non-English locales', () => {
    const english = commercialSurfaceCopy.en;
    for (const locale of ['pt', 'es', 'fr', 'it', 'de'] as const) {
      const copy = commercialSurfaceCopy[locale];
      expect(copy.pricing.heroTitle).not.toBe(english.pricing.heroTitle);
      expect(copy.checkout.heroTitle).not.toBe(english.checkout.heroTitle);
      expect(copy.login.title).not.toBe(english.login.title);
      expect(copy.signup.title).not.toBe(english.signup.title);
      expect(copy.consent.title).not.toBe(english.consent.title);
    }
  });

  it('keeps commercial truth in the billing catalog while localizing presentation only', () => {
    expect(pricingPage).toContain('BILLING_PLANS.map((plan) =>');
    expect(checkoutPage).toContain('BILLING_PLANS.map((plan) =>');
    expect(signupPage).toContain('BILLING_PLANS.map((plan) =>');
    expect(pricingPage).toContain('plan.features.slice(0, 6).map');
    expect(checkoutPage).toContain('selectedPlan.features.slice(0, 6).map');
    expect(pricingPage).toContain('getCommercialSurfaceCopy(locale).pricing');
    expect(checkoutPage).toContain('getCommercialSurfaceCopy(locale).checkout');
    expect(loginPage).toContain('getCommercialSurfaceCopy(locale).login');
    expect(signupPage).toContain('getCommercialSurfaceCopy(activeLocale).signup');
  });

  it('keeps the compact purchase headers usable on small screens', () => {
    expect(pricingPage).toContain('gap-3 px-4 py-4 sm:px-6 sm:py-5');
    expect(pricingPage).toContain('hidden rounded-full border border-white/15 px-3 py-2');
    expect(checkoutPage).toContain('gap-3 px-4 py-4 sm:px-6 sm:py-5');
    expect(checkoutPage).toContain('text-xs sm:gap-2 sm:text-sm');
  });

  it('keeps analytics consent fail-closed and localizes the consent decision', () => {
    expect(posthogClient).toContain("window.localStorage.getItem(CONSENT_STORAGE_KEY) === 'granted'");
    expect(posthogClient).toContain('!hasAnalyticsConsent()');
    expect(posthogClient).toContain('opt_out_capturing_by_default: requiresConsent()');
    expect(consentBanner).toContain('getCommercialSurfaceCopy(localeFromPath(pathname)).consent');
    expect(consentBanner).toContain('{copy.decline}');
    expect(consentBanner).toContain('{copy.allow}');
  });

  it('preserves keyboard focus treatment on purchase and auth controls', () => {
    expect(pricingPage).toContain('focus-visible:ring-2');
    expect(checkoutPage).toContain('focus-visible:ring-2');
    expect(loginPage).toContain('focus-visible:ring-2');
    expect(signupPage).toContain('focus-visible:ring-2');
  });
});
