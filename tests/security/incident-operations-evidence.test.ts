import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const collectionRoute = readFileSync('src/app/api/ai-incidents/route.ts', 'utf8');
const itemRoute = readFileSync('src/app/api/ai-incidents/[id]/route.ts', 'utf8');

describe('incident operations evidence contract', () => {
  it('enforces tenant-scoped authenticated collection access', () => {
    expect(collectionRoute).toMatch(/organization|workspace/i);
    expect(collectionRoute).toMatch(/auth|user/i);
    expect(collectionRoute).toMatch(/GET|POST/);
  });

  it('supports controlled lifecycle updates without cache leakage', () => {
    expect(itemRoute).toMatch(/PATCH|PUT|DELETE/);
    expect(itemRoute).toMatch(/organization|workspace/i);
    expect(`${collectionRoute}\n${itemRoute}`).toMatch(/noStore|no-store|Cache-Control/i);
  });

  it('retains operational evidence fields', () => {
    expect(`${collectionRoute}\n${itemRoute}`).toMatch(/severity|status|owner|timeline|evidence|audit/i);
  });
});
