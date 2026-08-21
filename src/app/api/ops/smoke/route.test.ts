import { afterEach, describe, expect, it, vi } from 'vitest';

import { envGroupCheck } from './route';

function stubCanonicalStripeEnvironment() {
  vi.stubEnv('STRIPE_SECRET_KEY', 'configured');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'configured');
  vi.stubEnv('STRIPE_PRICE_ESSENTIAL_MONTHLY', 'configured');
  vi.stubEnv('STRIPE_PRICE_ESSENTIAL_ANNUAL', 'configured');
  vi.stubEnv('STRIPE_PRICE_PROFESSIONAL_MONTHLY', 'configured');
  vi.stubEnv('STRIPE_PRICE_PROFESSIONAL_ANNUAL', 'configured');
}

describe('ops smoke billing readiness', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('requires all four canonical self-serve Stripe bindings', () => {
    stubCanonicalStripeEnvironment();

    expect(envGroupCheck()).toEqual(expect.arrayContaining([
      {
        name: 'stripe',
        configured: true,
        missingCount: 0,
      },
    ]));

    vi.stubEnv('STRIPE_PRICE_ESSENTIAL_ANNUAL', '');

    expect(envGroupCheck()).toEqual(expect.arrayContaining([
      {
        name: 'stripe',
        configured: false,
        missingCount: 1,
      },
    ]));
  });

  it('does not accept legacy Starter/Growth prices as production readiness authority', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'configured');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'configured');
    vi.stubEnv('STRIPE_PRICE_ESSENTIAL_MONTHLY', '');
    vi.stubEnv('STRIPE_PRICE_ESSENTIAL_ANNUAL', '');
    vi.stubEnv('STRIPE_PRICE_PROFESSIONAL_MONTHLY', '');
    vi.stubEnv('STRIPE_PRICE_PROFESSIONAL_ANNUAL', '');
    vi.stubEnv('STRIPE_PRICE_STARTER_MONTHLY', 'configured');
    vi.stubEnv('STRIPE_PRICE_STARTER_ANNUAL', 'configured');
    vi.stubEnv('STRIPE_PRICE_GROWTH_MONTHLY', 'configured');
    vi.stubEnv('STRIPE_PRICE_GROWTH_ANNUAL', 'configured');

    expect(envGroupCheck()).toEqual(expect.arrayContaining([
      {
        name: 'stripe',
        configured: false,
        missingCount: 4,
      },
    ]));
  });

  it('does not require fixed Business or Enterprise prices for self-serve readiness', () => {
    stubCanonicalStripeEnvironment();
    vi.stubEnv('STRIPE_PRICE_BUSINESS_MONTHLY', '');
    vi.stubEnv('STRIPE_PRICE_BUSINESS_ANNUAL', '');
    vi.stubEnv('STRIPE_PRICE_ENTERPRISE_MONTHLY', '');
    vi.stubEnv('STRIPE_PRICE_ENTERPRISE_ANNUAL', '');

    expect(envGroupCheck()).toEqual(expect.arrayContaining([
      {
        name: 'stripe',
        configured: true,
        missingCount: 0,
      },
    ]));
  });
});
