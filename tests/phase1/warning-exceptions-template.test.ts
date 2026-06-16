import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 1 warning exception template', () => {
  it('keeps the warning exception template actionable', () => {
    const path = 'docs/evidence/phase1/WARNING_EXCEPTIONS_TEMPLATE.md';
    expect(existsSync(path)).toBe(true);

    const template = readFileSync(path, 'utf8');
    expect(template).toContain('Warning summary');
    expect(template).toContain('Impact assessment');
    expect(template).toContain('Decision');
    expect(template).toContain('Owner');
    expect(template).toContain('Follow-up date');
    expect(template).toContain('Phase 1 cannot be marked complete');
  });
});
