import { describe, expect, it } from 'vitest';

import { resolveProductionGateStatement } from '../../scripts/enterprise/fetch-supabase-rls-evidence.mjs';

describe('Supabase RLS production gate contract hydration', () => {
  it('preserves the checked-in production gate statement when runtime evidence is lean', () => {
    const source = {
      productionGate: 'P0 production release may proceed only if all other P0 runtime evidence is satisfied.',
    };
    const runtime = {
      status: 'Complete',
      outcome: 'passed',
    };

    expect(resolveProductionGateStatement(source, runtime)).toBe(source.productionGate);
  });

  it('prefers an authoritative runtime production gate statement when present', () => {
    const source = {
      productionGate: 'P0 production release may proceed only if all other P0 runtime evidence is satisfied.',
    };
    const runtime = {
      productionGate: 'Production release remains governed by the exact-SHA runtime authority.',
    };

    expect(resolveProductionGateStatement(source, runtime)).toBe(runtime.productionGate);
  });

  it('fails closed when no production gate statement exists', () => {
    expect(() => resolveProductionGateStatement({}, {})).toThrow('production_gate_statement_missing');
  });
});
