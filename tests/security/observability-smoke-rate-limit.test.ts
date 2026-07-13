import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const routePath = join(process.cwd(), 'src/app/api/observability/smoke/route.ts');
const source = readFileSync(routePath, 'utf8');

describe('observability smoke abuse-control contract', () => {
  it('rate limits requests before credential validation and synthetic error reporting', () => {
    const rateLimitIndex = source.indexOf('await checkDistributedRateLimit');
    const authorizationIndex = source.indexOf('if (!hasHealthcheckToken(request))');
    const reportErrorIndex = source.indexOf('reportError(new Error(SMOKE_TEST_ERROR_MESSAGE)');

    expect(rateLimitIndex).toBeGreaterThan(-1);
    expect(source).toContain("policy: 'health-internal'");
    expect(source).toContain("action: 'observability.smoke'");
    expect(source).toContain("failureMode: 'fail-closed'");
    expect(rateLimitIndex).toBeLessThan(authorizationIndex);
    expect(authorizationIndex).toBeLessThan(reportErrorIndex);
  });

  it('uses request-derived subjects and the shared no-store rate-limit response', () => {
    expect(source).toContain('buildRateLimitSubjectFromRequest(request');
    expect(source).toContain('return rateLimitResponse(rateLimit);');
  });
});
