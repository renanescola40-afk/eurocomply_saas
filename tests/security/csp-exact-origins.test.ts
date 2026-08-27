import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('next.config.ts', 'utf8');

describe('production CSP provider origin hardening', () => {
  it('does not authorize wildcard provider subdomains', () => {
    expect(source).not.toContain('https://*.supabase.co');
    expect(source).not.toContain('https://*.sentry.io');
    expect(source).not.toContain('https://*.ingest.sentry.io');
  });

  it('derives exact HTTPS origins from trusted provider configuration', () => {
    expect(source).toContain('getConfiguredHttpsOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL)');
    expect(source).toContain('getConfiguredHttpsOrigin(process.env.NEXT_PUBLIC_SENTRY_DSN)');
    expect(source).toContain("parsed.protocol === 'https:' ? parsed.origin : null");
  });

  it('preserves the explicit local Supabase exception only outside production', () => {
    expect(source).toContain('getNonProductionLoopbackSupabaseOrigin');
    expect(source).toContain("const loopbackHosts = new Set(['127.0.0.1', 'localhost', '::1'])");
    expect(source).toContain('if (isProduction) return null');
  });

  it('keeps Sentry browser ingestion compatible without external script wildcard sources', () => {
    expect(source).toContain("tunnelRoute: '/monitoring'");
    expect(source).toContain('sentryConnectOrigin');
    expect(source).not.toMatch(/script-src[^\n]*sentry\.io/);
  });
});
