import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 1 repo-ready self-check', () => {
  it('requires the repo-ready command and test in the checker', () => {
    const checker = readFileSync('scripts/dev/check-phase1-repo-side-readiness.mjs', 'utf8');

    expect(checker).toContain('phase1:repo-ready');
    expect(checker).toContain('tests/phase1/repo-ready-command.test.ts');
  });
});
