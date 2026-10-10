import { describe, expect, it } from 'vitest';

import { getBillingFeatureLabel } from '@/lib/i18n/billing-feature-labels';
import { commercialSurfaceCopy, getCommercialSurfaceCopy } from '@/lib/i18n/commercial-surface-copy';
import { locales, type Locale } from '@/lib/i18n/routing';

describe('English-only commercial surface authority', () => {
  it('keeps every historical locale key compatible while resolving canonical English copy', () => {
    expect(Object.keys(commercialSurfaceCopy).sort()).toEqual([...locales].sort());
    for (const locale of locales as readonly Locale[]) {
      expect(commercialSurfaceCopy[locale]).toEqual(commercialSurfaceCopy.en);
      expect(getCommercialSurfaceCopy(locale)).toEqual(commercialSurfaceCopy.en);
    }
  });

  it('keeps critical commercial copy complete in English', () => {
    const copy = commercialSurfaceCopy.en;
    expect(copy.pricing.heroTitle.length).toBeGreaterThan(20);
    expect(copy.checkout.heroTitle.length).toBeGreaterThan(12);
    expect(copy.login.title).toContain('RISCK COMPLY');
    expect(copy.signup.title).toContain('RISCK COMPLY');
    expect(copy.consent.body.length).toBeGreaterThan(30);
  });

  it('returns canonical English billing feature labels for every historical locale', () => {
    for (const locale of locales as readonly Locale[]) {
      expect(getBillingFeatureLabel(locale, 'AI Inventory')).toBe('AI Inventory');
      expect(getBillingFeatureLabel(locale, 'Risk Register')).toBe('Risk Register');
      expect(getBillingFeatureLabel(locale, 'Approval Workflows')).toBe('Approval Workflows');
    }
  });
});
