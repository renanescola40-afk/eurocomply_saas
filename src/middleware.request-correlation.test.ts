import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8');
}

describe('request correlation wiring', () => {
  it('creates and forwards an application-owned request id in middleware', () => {
    const source = read('src/middleware.ts');

    expect(source).toContain('const requestId = createTrustedRequestId();');
    expect(source).toContain('buildCorrelatedRequestHeaders(req.headers, requestId)');
    expect(source).toContain('NextResponse.next({ request: { headers: requestHeaders } })');
    expect(source).toContain('return withRequestId(response, requestId);');
    expect(source).not.toContain("req.headers.get('x-request-id')");
  });

  it('persists only the trusted application id in audit metadata and audit failures', () => {
    const source = read('src/lib/security/audit-log.ts');

    expect(source).toContain(
      "import { trustedRequestIdFromHeaders } from '@/lib/observability/request-correlation';",
    );
    expect(source).toContain('const requestId = trustedRequestIdFromHeaders(requestHeaders);');
    expect(source).not.toContain('requestIdFromHeaders(requestHeaders)');
    expect(source).toMatch(/requestContext:\s*\{\s*requestId,/);
    expect(source).toContain("area: 'audit_log_write'");
    expect(source).toContain("area: 'audit_chain_write'");
    expect(source.match(/requestId,/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });
});
