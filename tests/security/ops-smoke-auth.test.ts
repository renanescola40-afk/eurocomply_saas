import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routeSource = () => readFileSync('src/app/api/ops/smoke/route.ts', 'utf8');

describe('operations smoke endpoint authentication', () => {
  it('requires a configured bearer token in every environment', () => {
    const source = routeSource();

    expect(source).toContain('allowMissingTokenOutsideProduction: false');
  });

  it('rate limits before bearer-token validation and dependency checks', () => {
    const source = routeSource();
    const rateLimitIndex = source.indexOf('const rateLimitDenied = await requireEnterpriseRateLimit(request, {');
    const tokenValidationIndex = source.indexOf('if (!hasBearerToken(request)) {');
    const supabaseCheckIndex = source.indexOf('const admin = createAdminClient();');

    expect(source).toContain("policy: 'health-internal'");
    expect(source).toContain("failureMode: 'fail-closed'");
    expect(rateLimitIndex).toBeGreaterThan(-1);
    expect(tokenValidationIndex).toBeGreaterThan(rateLimitIndex);
    expect(supabaseCheckIndex).toBeGreaterThan(tokenValidationIndex);
  });

  it('bounds the Supabase dependency probe before returning smoke status', () => {
    const source = routeSource();

    expect(source).toContain('const OPS_SMOKE_DEPENDENCY_TIMEOUT_MS = 1_500;');
    expect(source).toContain('export async function withOpsSmokeDependencyTimeout');
    expect(source).toContain('const query = admin.from(\'subscriptions\').select(\'id\').limit(1);');
    expect(source).toContain('await withOpsSmokeDependencyTimeout(query)');
    expect(source).not.toContain("await admin.from('subscriptions').select('id').limit(1)");
  });
});
