import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('scripts/security/check-p0-supabase-rls-evidence.mjs', 'utf8');
const evidence = JSON.parse(readFileSync('docs/security/evidence/runtime/supabase-live-rls-validation.json', 'utf8'));
const requiredProfileOperations = ['rls_enabled', 'cross_tenant_read', 'cross_tenant_insert', 'cross_tenant_update', 'cross_tenant_delete', 'same_tenant_read'];

function operationsFrom(cases = []) {
  return cases
    .filter((test) => test?.table === 'profiles')
    .map((test) => test.operation);
}

describe('P0 Supabase RLS evidence checker profile coverage gate', () => {
  it('requires profiles user-scoped runtime operations before accepting Complete evidence', () => {
    expect(source).toContain("const userScopedTable = 'profiles'");
    for (const operation of requiredProfileOperations) {
      expect(source).toContain(operation);
    }
    expect(source).toContain('missing live RLS user-scoped table coverage');
  });

  it('keeps pending evidence Open/not_run while documenting the required profiles live proof cases', () => {
    if (evidence.status === 'Complete') {
      expect(evidence.outcome).toBe('passed');
      expect(operationsFrom(evidence.testCases)).toEqual(expect.arrayContaining(requiredProfileOperations));
      for (const operation of requiredProfileOperations) {
        expect(evidence.testCases).toContainEqual(expect.objectContaining({ table: 'profiles', operation, passed: true }));
      }
      return;
    }

    expect(evidence.status).toBe('Open');
    expect(evidence.outcome).toBe('not_run');
    expect(evidence.profileProofExecutionState).toBe('not_run');
    expect(operationsFrom(evidence.requiredProfileProofCases)).toEqual(requiredProfileOperations);
    expect(evidence).not.toHaveProperty('testsPassed');
  });
});
