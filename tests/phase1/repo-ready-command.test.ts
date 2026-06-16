import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 1 repo-side readiness command', () => {
  it('keeps the repo-ready command wired to the readiness checker', () => {
    expect(existsSync('scripts/dev/check-phase1-repo-side-readiness.mjs')).toBe(true);

    const pkg = readFileSync('package.json', 'utf8');
    expect(pkg).toContain('phase1:repo-ready');
    expect(pkg).toContain('check-phase1-repo-side-readiness.mjs');
  });
});
