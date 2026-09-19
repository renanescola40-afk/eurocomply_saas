import { describe, expect, it } from 'vitest';
import {
  backendOwnedTables,
  buildEvidencePayload,
  customerTenantTables,
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

  it('treats current reviewed commercial mutation surfaces as backend-owned', () => {
    for (const table of [
      'compliance_tasks',
      'ai_systems',
      'documents',
      'risks',
      'vendors',
      'onboarding_activation_runs',
      'ai_assessments',
      'audit_events',
    ]) {
      expect(backendOwnedTables).toContain(table);
      expect(sameTenantWritableTables).not.toContain(table);
    }
    expect(sameTenantWritableTables).toEqual(['monitoring_preferences']);
    expect(customerTenantTables).toContain('audit_events');
  });

  it('emits an explicit production gate statement for passing live RLS evidence', () => {
    const evidence = buildEvidencePayload({
      status: 'Complete',
      outcome: 'passed',
      supabaseUrl: 'https://example.supabase.co',
      commitSha: 'a'.repeat(40),
    });
    expect(String(evidence.productionGate).toLowerCase()).toContain('production');
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