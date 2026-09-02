import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const verifier = readFileSync('src/lib/marketing/linkedin-connection.ts', 'utf8');
const route = readFileSync('src/app/api/platform/marketing/linkedin/status/route.ts', 'utf8');
const envGuard = readFileSync('src/lib/security/env-guard.ts', 'utf8');

describe('LinkedIn marketing connection verifier', () => {
  it('keeps token introspection server-side and requires both read and write organization scopes', () => {
    expect(verifier).toContain("import 'server-only'");
    expect(verifier).toContain('https://www.linkedin.com/oauth/v2/introspectToken');
    expect(verifier).toContain("'r_organization_social'");
    expect(verifier).toContain("'w_organization_social'");
    expect(verifier).toContain("optionalEnv('LINKEDIN_CLIENT_ID')");
    expect(verifier).toContain("optionalEnv('LINKEDIN_CLIENT_SECRET')");
    expect(verifier).toContain("optionalEnv('LINKEDIN_ACCESS_TOKEN')");
    expect(verifier).not.toMatch(/LINKEDIN_(?:ACCESS_TOKEN|CLIENT_SECRET)\s*=\s*['\"][^'\"]+/);
  });

  it('probes organization read access through the versioned Posts API without publishing', () => {
    expect(verifier).toContain('https://api.linkedin.com/rest/posts');
    expect(verifier).toContain("url.searchParams.set('q', 'author')");
    expect(verifier).toContain("url.searchParams.set('count', '1')");
    expect(verifier).toContain("'X-RestLi-Method': 'FINDER'");
    expect(verifier).toContain("method: 'GET'");
  });

  it('does not expose provider response bodies or credential values in the inspection result', () => {
    expect(verifier).not.toContain('response.text()');
    expect(verifier).not.toContain('console.log');
    expect(verifier).not.toContain('return { accessToken');
    expect(verifier).not.toContain('return { clientSecret');
    expect(verifier).toContain('accessTokenConfigured');
    expect(verifier).toContain('clientSecretConfigured');
  });

  it('restricts connection inspection to AAL2 platform security capability with fail-closed rate limiting', () => {
    expect(route).toContain('requireApiUser');
    expect(route).toContain('checkDistributedRateLimit');
    expect(route).toContain("failureMode: 'fail-closed'");
    expect(route).toContain("requirePlatformCapability(user.id, 'security')");
    expect(route).toContain('PlatformAdminError');
    expect(route).toContain('noStoreJson');
    expect(route).toContain('inspectLinkedInMarketingConnection');
  });

  it('keeps LinkedIn secret names blocked from NEXT_PUBLIC exposure', () => {
    expect(envGuard).toContain("publicEnv('LINKEDIN_ACCESS_TOKEN')");
    expect(envGuard).toContain("publicEnv('LINKEDIN_CLIENT_SECRET')");
  });
});
