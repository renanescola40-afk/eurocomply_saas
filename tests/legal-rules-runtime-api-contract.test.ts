import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const routePath = resolve('src/app/api/ops/legal-rules-validation/route.ts');
const routeSource = readFileSync(routePath, 'utf8');

describe('protected legal rules runtime validation API contract', () => {
  it('is dynamic, Node-bound and rate limits authentication before token validation', () => {
    expect(routeSource).toContain("export const dynamic = 'force-dynamic'");
    expect(routeSource).toContain("export const runtime = 'nodejs'");
    expect(routeSource).toContain('enforceInternalAuthenticationRateLimit');
    expect(routeSource).toContain('isAuthorizedInternalCronRequest');
    expect(routeSource.indexOf('enforceInternalAuthenticationRateLimit')).toBeLessThan(
      routeSource.lastIndexOf('isAuthorizedInternalCronRequest'),
    );
    expect(routeSource).toContain("action: AUTH_ACTION");
  });

  it('rejects unauthorized requests without exposing runtime evidence', () => {
    expect(routeSource).toContain("return noStoreJson({ error: 'Unauthorized' }, { status: 401 })");
    expect(routeSource).toContain("const ROUTE = '/api/ops/legal-rules-validation'");
    expect(routeSource).toContain("const AUTH_ACTION = 'authenticate_legal_rules_runtime_validation'");
  });

  it('binds evidence to release metadata and sanitized request provenance', () => {
    expect(routeSource).toContain('runtimeReleaseMetadata');
    expect(routeSource).toContain("request.headers.get('x-request-id')");
    expect(routeSource).toContain("request.headers.get('x-vercel-id')");
    expect(routeSource).not.toMatch(/request\.headers\.get\(['"]cookie/i);
  });

  it('fails closed and prevents caching, framing and indexing', () => {
    expect(routeSource).toContain("status: evidence.status === 'PASS' ? 200 : 503");
    expect(routeSource).toContain("'Cache-Control': 'no-store, max-age=0'");
    expect(routeSource).toContain("frame-ancestors 'none'");
    expect(routeSource).toContain("'Referrer-Policy': 'no-referrer'");
    expect(routeSource).toContain("'X-Content-Type-Options': 'nosniff'");
    expect(routeSource).toContain("'X-Robots-Tag': 'noindex, nofollow, noarchive'");
  });
});
