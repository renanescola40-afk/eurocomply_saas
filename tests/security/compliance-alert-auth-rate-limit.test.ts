import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(
  new URL('../../src/app/api/internal/compliance-alerts/route.ts', import.meta.url),
  'utf8',
);

describe('compliance alert authentication protection', () => {
  it('enforces the fail-closed internal authentication rate limit before credential validation and privileged work', () => {
    const postBody = routeSource.match(
      /export async function POST\(request: Request\) \{([\s\S]*?)\n\}/,
    )?.[1];

    expect(postBody).toBeDefined();
    expect(postBody).toContain('enforceInternalAuthenticationRateLimit(request');
    expect(postBody).toContain('route: COMPLIANCE_ALERTS_ROUTE');
    expect(postBody).toContain('action: COMPLIANCE_ALERTS_AUTH_ACTION');

    const rateLimitIndex = postBody?.indexOf('enforceInternalAuthenticationRateLimit(request') ?? -1;
    const authorizationIndex = postBody?.indexOf('isAuthorizedInternalCronRequest(request)') ?? -1;
    const privilegedWorkIndex = postBody?.indexOf('sendDocumentExpiryAlerts()') ?? -1;

    expect(rateLimitIndex).toBeGreaterThanOrEqual(0);
    expect(authorizationIndex).toBeGreaterThan(rateLimitIndex);
    expect(privilegedWorkIndex).toBeGreaterThan(authorizationIndex);
  });
});
