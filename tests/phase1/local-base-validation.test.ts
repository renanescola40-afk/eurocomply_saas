import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Phase 1 local base validation gate', () => {
  it('keeps required phase 1 helper files in place', () => {
    expect(existsSync('scripts/dev/run-phase1-checks.mjs')).toBe(true);
    expect(existsSync('scripts/dev/capture-phase1-evidence.mjs')).toBe(true);
    expect(existsSync('scripts/dev/capture-phase1-smoke.mjs')).toBe(true);
    expect(existsSync('docs/PHASE1_EXECUTION_GATE.md')).toBe(true);
    expect(existsSync('docs/evidence/phase1/README.md')).toBe(true);
    expect(existsSync('docs/PHASE1_HELPER_INVENTORY.md')).toBe(true);
  });

  it('keeps package scripts wired for phase 1 execution', () => {
    const pkg = read('package.json');

    expect(pkg).toContain('phase1:check');
    expect(pkg).toContain('phase1:capture');
    expect(pkg).toContain('phase1:smoke');
    expect(pkg).toContain('supply-chain:lockfile');
    expect(pkg).toContain('supply-chain:floating-deps');
    expect(pkg).toContain('npm install --package-lock-only --ignore-scripts');
  });

  it('keeps the phase 1 gate focused on real local validation evidence', () => {
    const gate = read('docs/PHASE1_EXECUTION_GATE.md');
    const evidence = read('docs/evidence/phase1/README.md');

    for (const command of [
      'npm run supply-chain:floating-deps',
      'npm ci',
      'npm run typecheck',
      'npm run test',
      'npm run build',
      'npm run lint',
    ]) {
      expect(evidence).toContain(command);
    }

    for (const command of ['npm ci', 'npm run typecheck', 'npm run test', 'npm run build', 'npm run lint']) {
      expect(gate).toContain(command);
    }

    expect(gate).toContain('package-lock.json');
    expect(evidence).toContain('npm run phase1:capture');
    expect(evidence).toContain('npm run phase1:smoke');
    expect(evidence).toContain('Do not hand-write lockfile contents or fabricate command output');
  });
});
