import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('scripts/release/check-enterprise-release-env.mjs', 'utf8');

describe('enterprise release deployment target contract', () => {
  it('requires an explicit production URL and rejects VERCEL_URL as ambiguous', () => {
    expect(source).toContain("const explicitProductionUrlSources = ['RELEASE_DEPLOYMENT_URL', 'RELEASE_PRODUCTION_URL', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SITE_URL'];");
    expect(source).toContain("hasAny(explicitProductionUrlSources)");
    expect(source).toContain("rejectedAmbiguousSources: ['VERCEL_URL']");
    expect(source).not.toMatch(/hasAny\(\[[^\]]*'VERCEL_URL'[^\]]*\]\)/s);
  });

  it('records remediation that distinguishes production from preview deployments', () => {
    expect(source).toContain('Do not rely on VERCEL_URL because it may identify a preview deployment.');
  });
});
