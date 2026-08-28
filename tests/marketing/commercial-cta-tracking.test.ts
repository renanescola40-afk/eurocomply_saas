import { describe, expect, it } from 'vitest';

import {
  buildCommercialCtaProperties,
  classifyCommercialCtaContext,
  resolveCommercialCtaId,
} from '../../src/lib/analytics/commercial-cta';

describe('commercial CTA tracking contract', () => {
  it('keeps the same homepage intent ids across all supported locales', () => {
    for (const locale of ['en', 'pt', 'es', 'fr', 'it', 'de']) {
      expect(resolveCommercialCtaId({ pathname: `/${locale}`, href: `/${locale}/signup` })).toBe('home-signup');
      expect(resolveCommercialCtaId({ pathname: `/${locale}`, href: `/${locale}/pricing` })).toBe('home-pricing');
      expect(resolveCommercialCtaId({ pathname: `/${locale}`, href: '#platform' })).toBe('home-explore-platform');
    }
  });

  it('maps pricing intent without sending localized copy or arbitrary href text', () => {
    expect(resolveCommercialCtaId({ pathname: '/de/pricing', href: '/de/signup?plan=essential' })).toBe('pricing-plan-essential');
    expect(resolveCommercialCtaId({ pathname: '/fr/pricing', href: '/fr/signup?plan=professional' })).toBe('pricing-plan-professional');
    expect(resolveCommercialCtaId({ pathname: '/es/pricing', href: '/es/book-demo?plan=business' })).toBe('pricing-plan-business');
    expect(resolveCommercialCtaId({ pathname: '/it/pricing', href: '/it/enterprise' })).toBe('pricing-enterprise');
    expect(resolveCommercialCtaId({ pathname: '/en/pricing', href: '/en/book-demo' })).toBe('pricing-book-demo');
    expect(resolveCommercialCtaId({ pathname: '/pt/pricing', href: '/pt/trust' })).toBe('pricing-trust');
  });

  it('maps enterprise and feature buyer actions to stable ids', () => {
    expect(resolveCommercialCtaId({ pathname: '/en/enterprise', href: '/en/book-demo?plan=enterprise' })).toBe('enterprise-book-demo');
    expect(resolveCommercialCtaId({ pathname: '/pt/enterprise', href: '/pt/security-questionnaire' })).toBe('enterprise-security-questionnaire');
    expect(resolveCommercialCtaId({ pathname: '/fr/features/ai-inventory', href: '/fr/book-demo' })).toBe('feature-book-demo');
    expect(resolveCommercialCtaId({ pathname: '/de/features/ai-risk', href: '/de/signup' })).toBe('feature-signup');
  });

  it('accepts bounded explicit ids only on public commercial routes', () => {
    expect(resolveCommercialCtaId({ pathname: '/en/book-demo', explicitId: 'book-demo-submit' })).toBe('book-demo-submit');
    expect(resolveCommercialCtaId({ pathname: '/en/book-demo', explicitId: 'DROP TABLE leads' })).toBeNull();
    expect(resolveCommercialCtaId({ pathname: '/en/dashboard', explicitId: 'private-action' })).toBeNull();
  });

  it('rejects external destinations and non-commercial private routes', () => {
    expect(resolveCommercialCtaId({ pathname: '/en', href: 'https://evil.example/signup' })).toBeNull();
    expect(resolveCommercialCtaId({ pathname: '/en/dashboard', href: '/en/pricing' })).toBeNull();
    expect(classifyCommercialCtaContext('/en/billing')).toBeNull();
  });

  it('emits only bounded identifiers and public route context properties', () => {
    expect(buildCommercialCtaProperties('/es/pricing', 'pricing-book-demo')).toEqual({
      path: '/es/pricing',
      page_type: 'pricing',
      funnel_stage: 'commercial',
      cta_id: 'pricing-book-demo',
      source: 'public_cta',
    });
    expect(buildCommercialCtaProperties('/es/pricing', 'bad id with spaces')).toEqual({});
  });
});
