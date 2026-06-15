import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Phase 12 evidence handoff readiness review', () => {
  it('keeps the selected readiness workflow documented', () => {
    const scope = read('docs/PHASE12_SCOPE.md');
    const inventory = read('docs/PHASE12_INVENTORY.md');
    const validation = read('docs/PHASE12_VALIDATION_PLAN.md');

    expect(scope).toContain('Evidence handoff readiness review');
    expect(inventory).toContain('Evidence handoff readiness review');
    expect(validation).toContain('Evidence handoff readiness review');
  });

  it('keeps readiness review touchpoints documented', () => {
    const inventory = read('docs/PHASE12_INVENTORY.md');

    expect(inventory).toContain('Evidence handoff review surface');
    expect(inventory).toContain('Readiness export preparation surface');
    expect(inventory).toContain('Reports navigation entrypoint');
    expect(inventory).toContain('workflowReadiness');
  });

  it('keeps readiness review safe before additional runtime changes', () => {
    const validation = read('docs/PHASE12_VALIDATION_PLAN.md');

    expect(validation).toContain('Evidence handoff readiness review remains read-only');
    expect(validation).toContain('Reports navigation remains the safe readiness review entrypoint');
    expect(validation).toContain('No product, email, document, or UI template changes are required');
  });
});
