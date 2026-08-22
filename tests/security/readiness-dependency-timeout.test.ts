import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readyRouteSource = readFileSync('src/app/api/ready/route.ts', 'utf8');

describe('readiness dependency timeout contract', () => {
  it('bounds provider readiness probes with a production-tolerant window and fails through the existing not-ready path', () => {
    expect(readyRouteSource).toContain('const READINESS_DEPENDENCY_TIMEOUT_MS = 5_000;');
    expect(readyRouteSource).toContain('withReadinessDependencyTimeout(subscriptionsQuery)');
    expect(readyRouteSource).toContain('withReadinessDependencyTimeout(commercialMutationProbe)');
    expect(readyRouteSource).toContain('timeout: STRIPE_READINESS_TIMEOUT_MS');
    expect(readyRouteSource).toContain("new ReadinessDependencyTimeoutError()");
    expect(readyRouteSource).toContain("reportError(error, { area: 'ready_supabase_check' })");
    expect(readyRouteSource).toContain("detail: 'not_ready'");
  });

  it('does not convert provider timeout into readiness success', () => {
    expect(readyRouteSource).toContain("status: ok ? 'ready' : 'not_ready'");
    expect(readyRouteSource).toContain('{ status: ok ? 200 : 503 }');
  });

  it('clears the timeout after either the dependency or timeout settles', () => {
    expect(readyRouteSource).toContain('if (timeout) clearTimeout(timeout);');
  });
});
