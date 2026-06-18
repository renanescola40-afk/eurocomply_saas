import { describe, expect, it } from 'vitest';

import { resolveBillingReturnBaseUrl } from './app-url';

describe('resolveBillingReturnBaseUrl', () => {
  it('uses configured app URL when valid', () => {
    const result = resolveBillingReturnBaseUrl('https://request.example.test/api/billing/checkout', {
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'https://app.eurocomply.example/path?ignored=true',
    });

    expect(result).toEqual({ ok: true, appUrl: 'https://app.eurocomply.example' });
  });

  it('fails closed in production when app URL is missing', () => {
    const result = resolveBillingReturnBaseUrl('https://attacker.example.test/api/billing/checkout', {
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: '',
    });

    expect(result).toEqual({ ok: false, error: 'billing_app_url_unavailable' });
  });

  it('fails closed in production when app URL is invalid', () => {
    const result = resolveBillingReturnBaseUrl('https://attacker.example.test/api/billing/checkout', {
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'javascript:alert(1)',
    });

    expect(result).toEqual({ ok: false, error: 'billing_app_url_unavailable' });
  });

  it('allows request origin fallback outside production for local development', () => {
    const result = resolveBillingReturnBaseUrl('http://localhost:3000/api/billing/checkout', {
      NODE_ENV: 'test',
      NEXT_PUBLIC_APP_URL: '',
    });

    expect(result).toEqual({ ok: true, appUrl: 'http://localhost:3000' });
  });
});
