import { describe, expect, it } from 'vitest';

import {
  requiredProfileOperations,
  validateProfileProof,
} from './check-supabase-live-profile-proof.mjs';

function passingEvidence() {
  const tests = requiredProfileOperations.map((operation) => ({
    table: 'profiles',
    operation,
    passed: true,
    returnedRows:
      operation === 'same_tenant_read'
        ? 1
        : operation === 'cross_tenant_read'
          ? 0
          : undefined,
    denialMode:
      operation === 'cross_tenant_insert'
        ? 'rls_or_permission_error'
        : undefined,
  }));

  return {
    status: 'Complete',
    outcome: 'passed',
    testCases: tests,
    tablesReviewed: [
      {
        table: 'profiles',
        status: 'passed',
        rlsEnabled: true,
      },
    ],
  };
}

describe('validateProfileProof', () => {
  it('accepts one passing proof for every required profile operation', () => {
    expect(validateProfileProof(passingEvidence())).toEqual({
      valid: true,
      errors: [],
      operationsVerified: requiredProfileOperations,
    });
  });

  it('fails when cross-user delete coverage is missing', () => {
    const evidence = passingEvidence();
    evidence.testCases = evidence.testCases.filter(
      (test) => test.operation !== 'cross_tenant_delete',
    );

    const result = validateProfileProof(evidence);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'profiles:cross_tenant_delete must appear exactly once',
    );
  });

  it('fails when another user profile is visible', () => {
    const evidence = passingEvidence();
    const read = evidence.testCases.find(
      (test) => test.operation === 'cross_tenant_read',
    );
    if (read) read.returnedRows = 1;

    const result = validateProfileProof(evidence);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'profiles:cross_tenant_read must return zero rows',
    );
  });

  it('fails when own-profile read is not demonstrated', () => {
    const evidence = passingEvidence();
    const read = evidence.testCases.find(
      (test) => test.operation === 'same_tenant_read',
    );
    if (read) read.returnedRows = 0;

    const result = validateProfileProof(evidence);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'profiles:same_tenant_read must return exactly one own-profile row',
    );
  });
});
