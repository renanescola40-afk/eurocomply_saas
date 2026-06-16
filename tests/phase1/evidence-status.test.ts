import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 1 evidence status command', () => {
  it('keeps the evidence status script and package command wired', () => {
    expect(existsSync('scripts/dev/check-phase1-evidence-status.mjs')).toBe(true);

    const pkg = readFileSync('package.json', 'utf8');
    expect(pkg).toContain('phase1:evidence');
    expect(pkg).toContain('check-phase1-evidence-status.mjs');
  });

  it('checks every required Phase 1 evidence log', () => {
    const script = readFileSync('scripts/dev/check-phase1-evidence-status.mjs', 'utf8');

    for (const expected of [
      'package-lock.json',
      'floating-deps.log',
      'npm-ci.log',
      'npm-audit.log',
      'typecheck.log',
      'test.log',
      'build.log',
      'lint.log',
      'dev-smoke.log',
    ]) {
      expect(script).toContain(expected);
    }
  });
});
