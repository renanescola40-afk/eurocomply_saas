import { describe, expect, it } from 'vitest';
import {
  backendOwnedTables,
  requiredGlobalReferenceOperations,
  sameTenantWritableTables,
} from '../../scripts/security/supabase-live-rls-evidence.mjs';
import {
  LIVE_RLS_EVIDENCE_SCHEMA,
  loadForwardManifestContract,
} from '../../scripts/security/supabase-forward-manifest-contract.mjs';

describe('Supabase live RLS forward-promotion evidence contract', () => {
  it('derives package authority from the current governed manifest', () => {
    const contract = loadForwardManifestContract();
    expect(contract.count).toBeGreaterThan(0);
    expect(contract.filenames).toHaveLength(contract.count);
    expect(new Set(contract.filenames).size).toBe(contract.count);
    expect(contract.changeSet).toMatch(/enterprise-data-plane/);
    expect(LIVE_RLS_EVIDENCE_SCHEMA).toBe('risck-comply.supabase-live-rls-validation.forward-promotion.v1');
  });

  it('treats organization compliance task mutations as backend-owned', () => {
    expect(backendOwnedTables).toContain('compliance_tasks');
    expect(sameTenantWritableTables).not.toContain('compliance_tasks');
  });

  it('treats regulatory updates as backend-only product data', () => {
    expect(requiredGlobalReferenceOperations).toEqual([
      'rls_enabled',
      'authenticated_read_denied',
      'authenticated_insert_denied',
      'authenticated_update_denied',
      'authenticated_delete_denied',
      'service_role_read_allowed',
    ]);
  });
});
