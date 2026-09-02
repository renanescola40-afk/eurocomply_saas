import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const client = readFileSync('src/lib/marketing/linkedin.ts', 'utf8');
const route = readFileSync('src/app/api/internal/marketing/linkedin/publish/route.ts', 'utf8');
const inventory = readFileSync('docs/security/API_ROUTE_INVENTORY.billing.md', 'utf8');

describe('LinkedIn marketing publisher', () => {
  it('keeps LinkedIn credentials server-side and environment-backed', () => {
    expect(client).toContain("import 'server-only'");
    expect(client).toContain("requireEnv('LINKEDIN_ACCESS_TOKEN')");
    expect(client).toContain("requireEnv('LINKEDIN_API_VERSION')");
    expect(client).toContain("requireEnv('LINKEDIN_ORGANIZATION_URN')");
    expect(client).not.toMatch(/LINKEDIN_ACCESS_TOKEN\s*=\s*['\"][^'\"]+/);
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
    expect(client).not.toContain('detail.slice');
  });

  it('classifies the internal publisher in the API route inventory', () => {
    expect(inventory).toContain('src/app/api/internal/marketing/linkedin/publish/route.ts');
    expect(inventory).toContain('| health/internal |');
  });
});
