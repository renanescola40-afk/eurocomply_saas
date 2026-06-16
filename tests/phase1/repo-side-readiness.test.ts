import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 1 repository-side readiness report', () => {
  it('keeps repository-side readiness separate from real completion', () => {
    const path = 'docs/PHASE1_REPO_SIDE_READINESS.md';
    expect(existsSync(path)).toBe(true);

    const report = readFileSync(path, 'utf8');
    expect(report).toContain('Phase 1 is repository-side ready, but not complete');
    expect(report).toContain('package-lock.json');
    expect(report).toContain('docs/evidence/phase1');
    expect(report).toContain('npm run phase1:closeout');
    expect(report).toContain('real local or CI execution');
  });
});
