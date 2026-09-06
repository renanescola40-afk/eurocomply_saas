import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(
  new URL('../../src/app/api/internal/daily-maintenance/route.ts', import.meta.url),
  'utf8',
);

describe('daily maintenance authentication protection', () => {
  it('enforces the fail-closed internal authentication rate limit before credential validation and job fan-out', () => {
    const postBody = routeSource.match(
      /export async function POST\(request: Request\) \{([\s\S]*?)\n\}/,
    )?.[1];

    expect(postBody).toBeDefined();
    expect(postBody).toContain('enforceInternalAuthenticationRateLimit(request');
    expect(postBody).toContain("route: DAILY_MAINTENANCE_ROUTE");
    expect(postBody).toContain("action: DAILY_MAINTENANCE_AUTH_ACTION");

    const rateLimitIndex = postBody?.indexOf('enforceInternalAuthenticationRateLimit(request') ?? -1;
    const authorizationIndex = postBody?.indexOf('isAuthorizedInternalCronRequest(request)') ?? -1;
    const fanOutIndex = postBody?.indexOf('runMaintenanceJobSequence(baseUrl, credential)') ?? -1;

    expect(rateLimitIndex).toBeGreaterThanOrEqual(0);
    expect(authorizationIndex).toBeGreaterThan(rateLimitIndex);
    expect(fanOutIndex).toBeGreaterThan(authorizationIndex);

    const sequencerStart = routeSource.indexOf('export async function runMaintenanceJobSequence');
    const postStart = routeSource.indexOf('export async function POST');
    const sequencerSource = routeSource.slice(sequencerStart, postStart);
    expect(sequencerStart).toBeGreaterThanOrEqual(0);
    expect(sequencerSource).toContain('MAINTENANCE_JOBS.length');
    expect(sequencerSource).toContain('results.push(await runner(baseUrl, path, credential))');
  });
});
