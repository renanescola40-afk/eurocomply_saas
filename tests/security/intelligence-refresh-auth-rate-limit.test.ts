import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(
  new URL('../../src/app/api/intelligence/refresh/route.ts', import.meta.url),
  'utf8',
);

describe('intelligence refresh authentication rate limiting', () => {
  it('fails closed before credential validation and privileged database work', () => {
    const rateLimitIndex = routeSource.indexOf('await enforceInternalAuthenticationRateLimit');
    const authorizationIndex = routeSource.indexOf('isAuthorizedInternalCronRequest(request)');
    const adminClientIndex = routeSource.indexOf('const supabase = tryCreateAdminClient()');
    const upsertIndex = routeSource.indexOf('.upsert(buildMaintenanceItem()');

    expect(rateLimitIndex).toBeGreaterThan(-1);
    expect(routeSource).toContain("route: '/api/intelligence/refresh'");
    expect(routeSource).toContain("action: 'intelligence_refresh_auth'");
    expect(routeSource).toContain('if (rateLimitResponse) return rateLimitResponse');
    expect(rateLimitIndex).toBeLessThan(authorizationIndex);
    expect(rateLimitIndex).toBeLessThan(adminClientIndex);
    expect(rateLimitIndex).toBeLessThan(upsertIndex);
  });
});
