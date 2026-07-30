import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const routePath = resolve('src/app/api/public/legal-rules-validation/route.ts');
const routeSource = readFileSync(routePath, 'utf8');

describe('public legal rules runtime validation API contract', () => {
  it('is dynamic, Node-bound and rate limited', () => {
    expect(routeSource).toContain("export const dynamic = 'force-dynamic'");
    expect(routeSource).toContain("export const runtime = 'nodejs'");
    expect(routeSource).toContain('checkDistributedRateLimit');
    expect(routeSource).toContain('rateLimitResponse');
    expect(routeSource).toContain("action: 'read-public-legal-rules-validation'");
  });

  it('binds evidence to release metadata and sanitised request provenance', () => {
    expect(routeSource).toContain('runtimeReleaseMetadata');
    expect(routeSource).toContain("request.headers.get('x-request-id')");
    expect(routeSource).toContain("request.headers.get('x-vercel-id')");
    expect(routeSource).not.toMatch(/authorization|cookie/i);
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
