import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { customerTenantTables } from '../../scripts/security/supabase-live-rls-evidence.mjs';
import { loadForwardManifestContract } from '../../scripts/security/supabase-forward-manifest-contract.mjs';

const writer = readFileSync('scripts/security/write-supabase-rls-scorecard-evidence.mjs', 'utf8');

describe('Supabase RLS scorecard promotion fan-in', () => {
  it('keeps the canonical scorecard dependent on trusted runtime source evidence', () => {
    expect(writer).toContain('validateSupabaseRlsRuntimeEvidence');
    expect(writer).toContain('const trusted = validation.passed');
    expect(writer).toContain("productionGate: allPassed ? 'eligible for downstream enterprise gates' : 'blocked'");
  });

  it('requires cross-tenant CRUD denial for every current customer tenant table', () => {
    expect(customerTenantTables.length).toBeGreaterThan(5);
    expect(writer).toContain("allTenantTablesPass(testCases, 'cross_tenant_read')");
    expect(writer).toContain("allTenantTablesPass(testCases, 'cross_tenant_insert')");
    expect(writer).toContain("allTenantTablesPass(testCases, 'cross_tenant_update')");
    expect(writer).toContain("allTenantTablesPass(testCases, 'cross_tenant_delete')");
  });

  it('does not encode a package version or migration count in scorecard promotion', () => {
    const contract = loadForwardManifestContract();
    expect(contract.count).toBeGreaterThan(0);
    expect(writer).not.toContain('selectedMigrationCount');
    expect(writer).not.toContain('V20');
    expect(writer).not.toContain('27/27');
  });
});
