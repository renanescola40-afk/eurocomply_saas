import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const nextConfig = readFileSync('next.config.ts', 'utf8');

describe('Product QA loopback Supabase CSP boundary', () => {
  it('trusts only an explicitly configured loopback Supabase origin outside production', () => {
    expect(nextConfig).toContain("const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);");
    expect(nextConfig).toContain("if (isProduction) return null;");
    expect(nextConfig).toContain("if (!LOOPBACK_HOSTS.has(parsed.hostname)) return null;");
    expect(nextConfig).toContain("if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;");
    expect(nextConfig).toContain('return parsed.origin;');
    expect(nextConfig).toContain('...(developmentSupabaseConnectOrigin ? [developmentSupabaseConnectOrigin] : [])');
  });

  it('keeps insecure-request upgrading production-only so local HTTP Auth is not rewritten to TLS', () => {
    expect(nextConfig).toContain("isProduction ? 'upgrade-insecure-requests' : null");
    expect(nextConfig).not.toContain("      'upgrade-insecure-requests',\n");
  });

  it('keeps the normal production Supabase allowlist and does not add arbitrary configured origins', () => {
    expect(nextConfig).toContain("'https://*.supabase.co'");
    expect(nextConfig).not.toContain("developmentSupabaseConnectOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL");
  });
});
