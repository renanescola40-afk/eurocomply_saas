import { afterEach, describe, expect, it } from 'vitest';

import { buildCSP } from '@/lib/security/headers';

const originalNodeEnv = process.env.NODE_ENV;
const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

function restoreEnv(name: 'NODE_ENV' | 'NEXT_PUBLIC_SUPABASE_URL', value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  restoreEnv('NODE_ENV', originalNodeEnv);
  restoreEnv('NEXT_PUBLIC_SUPABASE_URL', originalSupabaseUrl);
});

describe('Product QA loopback Supabase CSP boundary', () => {
  it('permits the explicitly configured loopback Supabase origin outside production', () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';

    const csp = buildCSP();

    expect(csp).toContain("connect-src 'self' https://app.zoer.ai https://*.supabase.co https://*.stripe.com http://127.0.0.1:54321");
    expect(csp).not.toContain('upgrade-insecure-requests');
  });

  it('never widens production CSP for a loopback environment value', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';

    const csp = buildCSP();

    expect(csp).not.toContain('http://127.0.0.1:54321');
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('does not trust arbitrary non-production origins from configuration', () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.invalid';

    const csp = buildCSP();

    expect(csp).not.toContain('https://example.invalid');
    expect(csp).not.toContain('upgrade-insecure-requests');
  });
});
