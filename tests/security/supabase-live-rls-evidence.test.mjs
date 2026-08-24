import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  GOVERNED_CHANGE_SET,
  LIVE_RLS_EVIDENCE_SCHEMA,
  backendOwnedTables,
  buildEvidencePayload,
  criticalTables,
  customerTenantTables,
  globalReferenceTables,
  parseEvidenceJson,
  redactProjectReferenceFromUrl,
  requiredBackendWriteDenyOperations,
  requiredCoverageOperations,
  requiredGlobalReferenceOperations,
  requiredSameTenantReadOperations,
  requiredViewerAdminDenyOperations,
  sameTenantWritableTables,
  tableCoverageFrom,
  validatePassingEvidence,
} from '../../scripts/security/supabase-live-rls-evidence.mjs';

const serviceRolePaths = [
  { path: 'fixture_setup', purpose: 'synthetic setup' },
  { path: 'rls_inventory', purpose: 'live inventory' },
  { path: 'post_assertion_integrity_checks', purpose: 'integrity' },
  { path: 'fixture_cleanup', purpose: 'cleanup' },
];

function passingTestCases() {
  const cases = [];
  for (const table of customerTenantTables) {
    cases.push({ table, operation: 'rls_enabled', passed: true, returnedRows: 1, error: null });
    for (const operation of requiredCoverageOperations) {
      cases.push({ table, operation, passed: true, returnedRows: 0, error: null });
    }
    cases.push({
      table,
      operation: backendOwnedTables.includes(table) ? 'same_tenant_read_backend_only' : requiredSameTenantReadOperations[0],
      passed: true,
      returnedRows: 1,
      error: null,
    });
  }
  for (const table of sameTenantWritableTables) {
    cases.push({ table, operation: 'same_tenant_insert', passed: true, returnedRows: 1, error: null, insertedId: '00000000-0000-0000-0000-000000000000' });
  }
  for (const table of backendOwnedTables) {
    for (const operation of requiredBackendWriteDenyOperations) {
      cases.push({ table, operation, passed: true, returnedRows: 0, error: { code: '42501', message: 'permission denied' } });
    }
  }
  for (const operation of requiredViewerAdminDenyOperations) {
    cases.push({ table: 'organization_members', operation, passed: true, returnedRows: 0, error: { code: '42501', message: 'permission denied' } });
  }
  for (const table of globalReferenceTables) {
    cases.push({ table, operation: 'rls_enabled', passed: true, returnedRows: 1, error: null });
    for (const operation of requiredGlobalReferenceOperations.filter((value) => value !== 'rls_enabled')) {
      cases.push({ table, operation, passed: true, returnedRows: operation === 'service_role_read_allowed' ? 1 : 0, error: null });
    }
  }
  return cases;
}

function passingEvidence(overrides = {}) {
  const testCases = overrides.testCases ?? passingTestCases();
  return buildEvidencePayload({
    status: 'Complete',
    outcome: 'passed',
    supabaseUrl: 'https://abcdefghijklmnopqrst.supabase.co',
    command: 'node scripts/security/run-supabase-live-tenant-isolation.mjs',
    commitSha: '1234567890abcdef1234567890abcdef12345678',
    timestamp: '2026-08-24T12:00:00Z',
    reviewer: 'security-reviewer',
    testCases,
    failures: [],
    tablesReviewed: tableCoverageFrom(testCases),
    serviceRolePaths,
    ...overrides,
  });
}

beforeEach(() => {
  process.env.PROMOTION_RUN_ID = '123456';
  process.env.PROMOTION_CHANGE_SET = GOVERNED_CHANGE_SET;
  process.env.PROMOTION_SELECTED_MIGRATION_COUNT = '31';
  process.env.PROMOTION_SELECTION_DIGEST = `sha256:${'a'.repeat(64)}`;
  process.env.PROMOTION_REMOTE_TRANSITION_VERIFIED = 'true';
  process.env.PROMOTION_UNAUTHORIZED_MIGRATION_APPLIED = 'false';
  process.env.PROMOTION_PRODUCTION_VERIFIED = 'true';
});

afterEach(() => {
  for (const key of Object.keys(process.env).filter((name) => name.startsWith('PROMOTION_'))) delete process.env[key];
});

describe('Supabase V21/31 live RLS evidence contract', () => {
  it('tracks the canonical tenant and global surfaces', () => {
    expect(criticalTables).toEqual([...customerTenantTables, ...globalReferenceTables]);
    expect(customerTenantTables).toContain('compliance_tasks');
    expect(backendOwnedTables).toContain('compliance_tasks');
    expect(sameTenantWritableTables).not.toContain('compliance_tasks');
  });

  it('requires the backend-only regulatory contract', () => {
    expect(requiredGlobalReferenceOperations).toEqual([
      'rls_enabled',
      'authenticated_read_denied',
      'authenticated_insert_denied',
      'authenticated_update_denied',
      'authenticated_delete_denied',
      'service_role_read_allowed',
    ]);
  });

  it('generates passing V21 evidence only with promotion lineage', () => {
    const evidence = passingEvidence();
    expect(evidence.schema).toBe(LIVE_RLS_EVIDENCE_SCHEMA);
    expect(evidence.promotionLineage).toMatchObject({
      promotionRunId: '123456',
      changeSet: GOVERNED_CHANGE_SET,
      selectedMigrationCount: 31,
      remoteAfterEqualsBeforePlusSelected: true,
      unauthorizedMigrationApplied: false,
      productionPromotionVerified: true,
    });
    expect(validatePassingEvidence(evidence)).toEqual({ valid: true, errors: [] });
  });

  it('fails closed without exact 31/31 Production-promotion lineage', () => {
    process.env.PROMOTION_SELECTED_MIGRATION_COUNT = '30';
    process.env.PROMOTION_PRODUCTION_VERIFIED = 'false';
    const result = validatePassingEvidence(passingEvidence());
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('promotionLineage.selectedMigrationCount must be 31');
    expect(result.errors).toContain('promotionLineage.productionPromotionVerified must be true');
  });

  it('rejects stale authenticated-read regulatory semantics', () => {
    const testCases = passingTestCases().filter((test) => !(test.table === 'regulatory_updates' && test.operation === 'authenticated_read_denied'));
    testCases.push({ table: 'regulatory_updates', operation: 'authenticated_read_allowed', passed: true, returnedRows: 1, error: null });
    const result = validatePassingEvidence(passingEvidence({ testCases }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('missing live RLS operation coverage: regulatory_updates:authenticated_read_denied');
  });

  it('requires compliance_tasks organization browser writes to remain backend-owned', () => {
    const testCases = passingTestCases().filter((test) => !(test.table === 'compliance_tasks' && test.operation === 'same_tenant_update_denied'));
    const result = validatePassingEvidence(passingEvidence({ testCases }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('missing live RLS operation coverage: compliance_tasks:same_tenant_update_denied');
  });

  it('rejects missing cross-tenant coverage', () => {
    const testCases = passingTestCases().filter((test) => !(test.table === 'vendors' && test.operation === 'cross_tenant_update'));
    const result = validatePassingEvidence(passingEvidence({ testCases }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('missing live RLS operation coverage: vendors:cross_tenant_update');
  });

  it('redacts project references deterministically', () => {
    const redacted = redactProjectReferenceFromUrl('https://tenantsecretref.supabase.co');
    expect(redacted).toMatch(/^redacted:sha256:[a-f0-9]{16}$/);
    expect(redacted).not.toContain('tenantsecretref');
    expect(redactProjectReferenceFromUrl('https://tenantsecretref.supabase.co')).toBe(redacted);
  });

  it('parses malformed JSON safely', () => {
    expect(parseEvidenceJson('{"status":"Open"}').errors).toEqual([]);
    expect(parseEvidenceJson('{not-json').evidence).toBeNull();
  });
});
