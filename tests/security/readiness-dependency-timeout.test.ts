import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readyRouteSource = readFileSync('src/app/api/ready/route.ts', 'utf8');

describe('readiness dependency timeout contract', () => {
  it('bounds the Supabase readiness probe and fails through the existing not-ready path', () => {
    expect(readyRouteSource).toContain('const READINESS_DEPENDENCY_TIMEOUT_MS = 1_500;');
    expect(readyRouteSource).toContain('withReadinessDependencyTimeout(query)');
    expect(readyRouteSource).toContain("new ReadinessDependencyTimeoutError()");
    expect(readyRouteSource).toContain("reportError(error, { area: 'ready_supabase_check' })");
    expect(readyRouteSource).toContain("detail: 'not_ready'");
  });

  it('clears the timeout after either the dependency or timeout settles', () => {
    expect(readyRouteSource).toContain('if (timeout) clearTimeout(timeout);');
  });
});
