import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 1 warning triage policy', () => {
  it('keeps warning triage policy available', () => {
    const path = 'docs/PHASE1_WARNING_TRIAGE.md';
    expect(existsSync(path)).toBe(true);

    const policy = readFileSync(path, 'utf8');
    expect(policy).toContain('Blocking warnings');
    expect(policy).toContain('Non-blocking warnings');
    expect(policy).toContain('high or critical security finding');
    expect(policy).toContain('build optimization or runtime behavior');
    expect(policy).toContain('Phase 1 cannot be marked complete');
  });
});
