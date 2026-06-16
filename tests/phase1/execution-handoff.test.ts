import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 1 execution handoff', () => {
  it('keeps the real execution handoff actionable', () => {
    const path = 'docs/PHASE1_EXECUTION_HANDOFF.md';
    expect(existsSync(path)).toBe(true);

    const handoff = readFileSync(path, 'utf8');

    for (const expected of [
      'npm run supply-chain:lockfile',
      'npm ci',
      'npm run phase1:capture',
      'npm run phase1:smoke',
      'npm run phase1:evidence',
      'npm run phase1:check',
      'npm run phase1:closeout',
      'package-lock.json',
      'npm-audit.log',
      'dev-smoke.log',
      '.env',
      'Service-role keys',
      'fabricated command output',
    ]) {
      expect(handoff).toContain(expected);
    }
  });
});
