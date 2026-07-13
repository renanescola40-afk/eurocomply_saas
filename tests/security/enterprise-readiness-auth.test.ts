import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routeSource = () => readFileSync('src/app/api/ops/enterprise-readiness/route.ts', 'utf8');

describe('enterprise readiness endpoint authentication', () => {
  it('requires a configured bearer token in every environment', () => {
    const source = routeSource();

    expect(source).toContain('allowMissingTokenOutsideProduction: false');
  });

  it('rate limits before bearer-token validation and live dependency checks', () => {
    const source = routeSource();
    const rateLimitIndex = source.indexOf('const rateLimitDenied = await requireEnterpriseRateLimit(request, {');
    const tokenValidationIndex = source.indexOf('if (!hasBearerToken(request)) {');
    const adminClientIndex = source.indexOf('const admin = createAdminClient();');

    expect(source).toContain("policy: 'health-internal'");
    expect(source).toContain("failureMode: 'fail-closed'");
    expect(source).toContain("route: '/api/ops/enterprise-readiness'");
    expect(rateLimitIndex).toBeGreaterThan(-1);
    expect(tokenValidationIndex).toBeGreaterThan(rateLimitIndex);
    expect(adminClientIndex).toBeGreaterThan(tokenValidationIndex);
  });
});
