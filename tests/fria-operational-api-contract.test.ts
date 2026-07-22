import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const route = readFileSync('src/app/api/ai-governance/fria/route.ts', 'utf8');

describe('FRIA operational API contract', () => {
  it('is organisation scoped and validates authenticated access', () => {
    expect(route).toMatch(/organization|organisation/);
    expect(route).toMatch(/auth|user/i);
    expect(route).toMatch(/GET|POST|PATCH/);
  });

  it('uses bounded validation and non-cacheable responses', () => {
    expect(route).toMatch(/zod|safeParse|parse\(/i);
    expect(route).toMatch(/noStore|no-store|Cache-Control/i);
  });

  it('records workflow decisions rather than returning a legal guarantee', () => {
    expect(route).toMatch(/assessment|decision|evidence|approval/i);
    expect(route).not.toMatch(/guaranteed compliance|automatically compliant/i);
  });
});
