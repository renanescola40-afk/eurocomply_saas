import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const client = readFileSync('src/lib/marketing/linkedin.ts', 'utf8');
const credentials = readFileSync('src/lib/marketing/linkedin-credentials.ts', 'utf8');
const resolver = readFileSync('src/lib/marketing/linkedin-organization.ts', 'utf8');
const queue = readFileSync('src/lib/marketing/linkedin-queue.ts', 'utf8');
const route = readFileSync('src/app/api/internal/marketing/linkedin/publish/route.ts', 'utf8');
const inventory = readFileSync('docs/security/API_ROUTE_INVENTORY.billing.md', 'utf8');

describe('LinkedIn marketing publisher', () => {
  it('keeps LinkedIn credentials server-side with managed Vault first and environment fallback', () => {
    expect(client).toContain("import 'server-only'");
    expect(client).toContain('getLinkedInAccessTokenCredential');
    expect(credentials).toContain("process.env.LINKEDIN_ACCESS_TOKEN");
    expect(credentials).toContain("rpc('read_linkedin_marketing_secret'");
    expect(credentials.indexOf('const vaultToken = await readVaultSecret')).toBeLessThan(
      credentials.indexOf("const environmentToken = normalizeToken(process.env.LINKEDIN_ACCESS_TOKEN)"),
    );
    expect(client).toContain("requireEnv('LINKEDIN_API_VERSION')");
    expect(client).toContain('resolveLinkedInOrganizationUrn');
    expect(client).not.toMatch(/LINKEDIN_ACCESS_TOKEN\s*=\s*['\"][^'\"]+/);
    expect(credentials).not.toMatch(/LINKEDIN_ACCESS_TOKEN\s*=\s*['\"][^'\"]+/);
  });

  it('resolves the canonical RISCK COMPLY Page by vanity name when an explicit URN is absent', () => {
    expect(resolver).toContain("DEFAULT_LINKEDIN_ORGANIZATION_VANITY_NAME = 'risck-comply'");
    expect(resolver).toContain('https://api.linkedin.com/rest/organization');
    expect(resolver).toContain("url.searchParams.set('q', 'vanityName')");
    expect(resolver).toContain("url.searchParams.set('vanityName', vanityName)");
    expect(resolver).toContain("'LinkedIn-Version': input.apiVersion");
    expect(resolver).toContain("'X-Restli-Protocol-Version': '2.0.0'");
    expect(resolver).toContain("return `urn:li:organization:${id}`");
  });

  it('fails closed when organization lookup cannot prove the expected vanity name and numeric id', () => {
    expect(resolver).toContain("errorCode: 'lookup_mismatch'");
    expect(resolver).toContain('candidateVanity !== normalizedVanity');
    expect(resolver).toContain('Number.isSafeInteger(id)');
    expect(client).toContain("'organization_resolution'");
    expect(queue).toContain("error.kind === 'organization_resolution'");
    expect(queue).toContain("status: 'failed' as const");
  });

  it('uses the current LinkedIn Posts API contract instead of legacy ugcPosts', () => {
    expect(client).toContain('https://api.linkedin.com/rest/posts');
    expect(client).toContain("'X-Restli-Protocol-Version': '2.0.0'");
    expect(client).toContain("'LinkedIn-Version': linkedinVersion");
    expect(client).toContain("/^\\d{6}$/.test(value)");
    expect(client).not.toContain('/v2/ugcPosts');
  });

  it('protects the publish endpoint as a bounded authenticated internal mutation', () => {
    expect(route).toContain('enforceInternalAuthenticationRateLimit');
    expect(route).toContain('isAuthorizedInternalCronRequest');
    expect(route).toContain('readBoundedJsonRequest');
    expect(route).toContain('inputSchema.parse');
    expect(route).toContain('noStoreJson');
    expect(route).toContain('publishLinkedInOrganizationTextPost');
  });

  it('does not include raw LinkedIn upstream response bodies in thrown errors', () => {
    expect(client).not.toContain('await response.text()');
    expect(resolver).not.toContain('response.text()');
    expect(client).not.toContain('detail.slice');
  });

  it('classifies the internal publisher in the API route inventory', () => {
    expect(inventory).toContain('src/app/api/internal/marketing/linkedin/publish/route.ts');
    expect(inventory).toContain('| health/internal |');
  });
});
