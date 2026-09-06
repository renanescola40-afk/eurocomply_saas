import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const rehearsal = readFileSync(
  '.github/workflows/supabase-forward-reconciliation-rehearsal.yml',
  'utf8',
);
const providerRestore = readFileSync(
  'scripts/recovery/verify-supabase-provider-managed-restore.mjs',
  'utf8',
);
const postconditions = readFileSync(
  'scripts/supabase/verify-cross-tenant-reference-integrity-postconditions.sql',
  'utf8',
);

describe('V39 provider-managed rehearsal contract', () => {
  it('runs the reviewed V39 validator after the exact-byte migration package', () => {
    expect(rehearsal).toContain(
      'scripts/supabase/verify-cross-tenant-reference-integrity-postconditions.sql',
    );
    const applyIndex = rehearsal.indexOf(
      'Apply only selected exact-byte migrations to isolated Supabase restore project',
    );
    const verifyIndex = rehearsal.indexOf(
      'Verify selected migration postconditions on isolated Supabase restore project',
    );
    const v39Index = rehearsal.indexOf(
      'scripts/supabase/verify-cross-tenant-reference-integrity-postconditions.sql',
      verifyIndex,
    );
    expect(applyIndex).toBeGreaterThanOrEqual(0);
    expect(verifyIndex).toBeGreaterThan(applyIndex);
    expect(v39Index).toBeGreaterThan(verifyIndex);
  });

  it('allows only the reviewed V39 postcondition file through provider apply-file', () => {
    expect(providerRestore).toContain(
      "'scripts/supabase/verify-cross-tenant-reference-integrity-postconditions.sql'",
    );
    expect(providerRestore).toContain('approvedValidators');
    expect(providerRestore).toContain('rehearsal_sql_path_not_allowed');
  });

  it('keeps the validator read-only and focused on guard presence plus zero cross-tenant relations', () => {
    expect(postconditions).toContain(
      "to_regprocedure('app_private.enforce_same_tenant_reference_integrity()')",
    );
    expect(postconditions).toContain(
      'cross-tenant reference integrity violation exists after promotion',
    );
    expect(postconditions).not.toMatch(
      /^\s*(insert|update|delete|truncate|alter|drop|create)\s+/gim,
    );
  });
});
