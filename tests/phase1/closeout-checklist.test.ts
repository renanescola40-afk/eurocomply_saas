import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 1 closeout checklist', () => {
  it('keeps closeout requirements tied to real evidence', () => {
    const path = 'docs/PHASE1_CLOSEOUT_CHECKLIST.md';
    expect(existsSync(path)).toBe(true);

    const checklist = readFileSync(path, 'utf8');
    expect(checklist).toContain('package-lock.json');
    expect(checklist).toContain('npm-ci.log');
    expect(checklist).toContain('npm-audit.log');
    expect(checklist).toContain('dev-smoke.log');
    expect(checklist).toContain('npm run phase1:evidence');
    expect(checklist).toContain('npm run phase1:check');
    expect(checklist).toContain('No unresolved blocking warning remains');
    expect(checklist).toContain('real committed evidence');
  });
});
