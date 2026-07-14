import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(
  new URL('../../src/app/api/internal/metric-snapshots/route.ts', import.meta.url),
  'utf8',
);

describe('metric snapshot authentication rate limiting', () => {
  it('limits requests before credential validation and privileged snapshot work', () => {
    const rateLimitIndex = routeSource.indexOf('await checkDistributedRateLimit');
    const authorizationIndex = routeSource.indexOf('isAuthorizedInternalCronRequest(request)');
    const adminClientIndex = routeSource.indexOf('const supabase = createAdminClient()');
    const snapshotLoopIndex = routeSource.indexOf('for (const organization of organizations ?? [])');

    expect(rateLimitIndex).toBeGreaterThan(-1);
    expect(routeSource).toContain("policy: 'auth'");
    expect(routeSource).toContain("action: 'metric_snapshot_auth'");
    expect(routeSource).toContain("route: '/api/internal/metric-snapshots'");
    expect(routeSource).toContain('return rateLimitResponse(authRateLimit)');
    expect(rateLimitIndex).toBeLessThan(authorizationIndex);
    expect(rateLimitIndex).toBeLessThan(adminClientIndex);
    expect(rateLimitIndex).toBeLessThan(snapshotLoopIndex);
  });
});
