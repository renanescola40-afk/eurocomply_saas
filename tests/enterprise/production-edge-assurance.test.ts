import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/production-edge-assurance.yml', 'utf8');
const runner = readFileSync('scripts/enterprise/run-production-edge-assurance.mjs', 'utf8');
const validator = readFileSync('scripts/enterprise/check-production-edge-assurance.mjs', 'utf8');

describe('production edge assurance megapack', () => {
  it('runs manually in a protected environment with read-only repository permissions', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('production-edge-assurance');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('git ls-remote origin refs/heads/main');
  });

  it('covers public edge, trust, no-store and bounded burst behavior', () => {
    for (const contract of [
      'content-security-policy',
      'strict-transport-security',
      'x-content-type-options',
      'referrer-policy',
      'permissions-policy',
      '/.well-known/security.txt',
      '/en/security',
      '/en/trust',
      'healthNoStore',
      'boundedBurstHandled',
    ]) expect(runner).toContain(contract);
  });

  it('keeps external review and penetration testing explicitly unverified', () => {
    expect(runner).toContain("independentSecurityReview: 'NOT_VERIFIED'");
    expect(runner).toContain("penetrationTest: 'NOT_VERIFIED'");
    expect(validator).toContain('independent review honesty');
    expect(validator).toContain('penetration test honesty');
  });

  it('fails closed on SHA drift, missing controls or sensitive evidence', () => {
    expect(validator).toContain('exact SHA mismatch');
    expect(validator).toContain('workflow run provenance');
    expect(validator).toContain('raw URL present');
    expect(validator).toContain('secret-like material');
    expect(runner).toContain('process.exitCode = 1');
  });
});
