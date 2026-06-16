import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 1 repo-side handoff', () => {
  it('keeps repo-side readiness separate from runtime validation', () => {
    const path = 'docs/PHASE1_REPO_SIDE_HANDOFF.md';
    expect(existsSync(path)).toBe(true);

    const handoff = readFileSync(path, 'utf8');
    expect(handoff).toContain('Repository-side Phase 1 preparation is ready for real execution');
    expect(handoff).toContain('Runtime/CI Phase 1 validation remains pending');
    expect(handoff).toContain('package-lock.json');
    expect(handoff).toContain('npm run phase1:closeout');
    expect(handoff).toContain('docs/evidence/phase1/dev-smoke.log');
  });
});
