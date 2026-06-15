import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Phase 11 evidence handoff review', () => {
  it('keeps the selected handoff workflow documented', () => {
    const scope = read('docs/PHASE11_SCOPE.md');
    const inventory = read('docs/PHASE11_INVENTORY.md');
    const validation = read('docs/PHASE11_VALIDATION_PLAN.md');

    expect(scope).toContain('Evidence handoff review');
    expect(inventory).toContain('Evidence handoff review');
    expect(validation).toContain('Evidence handoff review');
  });

  it('keeps required handoff touchpoints documented', () => {
    const inventory = read('docs/PHASE11_INVENTORY.md');

    expect(inventory).toContain('Audit package review surface');
    expect(inventory).toContain('Readiness export preparation surface');
    expect(inventory).toContain('Executive reporting package snapshot');
    expect(inventory).toContain('Reports navigation entrypoint');
    expect(inventory).toContain('workflowReadiness');
  });

  it('keeps handoff review safe before additional runtime changes', () => {
    const validation = read('docs/PHASE11_VALIDATION_PLAN.md');

    expect(validation).toContain('Evidence handoff review remains read-only');
    expect(validation).toContain('Reports navigation remains the safe handoff entrypoint');
    expect(validation).toContain('No product, email, document, or UI template changes are required');
  });
});
