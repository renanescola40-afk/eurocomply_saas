import { describe, expect, it } from 'vitest';
import {
  buildEvidencePayload,
  criticalTables,
  parseEvidenceJson,
  redactProjectReferenceFromUrl,
  requiredBackendWriteDenyOperations,
  tableCoverageFrom,
  validatePassingEvidence,
} from '../../scripts/security/run-supabase-live-tenant-isolation.mjs';

const baseOperations = [
  'rls_enabled',
  'cross_tenant_read',
  'cross_tenant_insert',
  'cross_tenant_update',
  'cross_tenant_delete',
  'same_tenant_read',
];

const viewerAdminDenyOperations = [
  'viewer_same_tenant_admin_insert_denied',
  'viewer_same_tenant_admin_update_denied',
  'viewer_same_tenant_admin_delete_denied',
];

function passingTestCases() {
  const cases = criticalTables.flatMap((table) => baseOperations.map((operation) => ({
    table,
    operation: ['audit_events', 'subscriptions'].includes(table) && operation === 'same_tenant_read'
      ? 'same_tenant_read_backend_only'
      : operation,
    passed: true,
    returnedRows: operation.startsWith('cross_tenant') ? 0 : 1,
    error: null,
  })));

  for (const table of ['documents', 'risks', 'vendors', 'tasks']) {
    cases.push({
      table,
      operation: 'same_tenant_insert',
      passed: true,
      returnedRows: 1,
      error: null,
      insertedId: '00000000-0000-0000-0000-000000000000',
    });
  }

  for (const table of ['audit_events', 'subscriptions']) {
    for (const operation of requiredBackendWriteDenyOperations) {
      cases.push({
        table,
        operation,
        passed: true,
        returnedRows: 0,
        error: { code: '42501', message: 'permission denied by RLS' },
      });
    }
  }

  for (const operation of viewerAdminDenyOperations) {
    cases.push({
      table: 'organization_members',
      operation,
      passed: true,
      returnedRows: 0,
      error: { code: '42501', message: 'permission denied by RLS' },
    });
  }

  return cases;
}

function passingEvidence(overrides = {}) {
  const testCases = overrides.testCases ?? passingTestCases();
  return buildEvidencePayload({
    status: 'Complete',
    outcome: 'passed',
    supabaseUrl: 'https://abcdefghijklmnopqrst.supabase.co',
    command: 'node scripts/security/run-supabase-live-tenant-isolation.mjs --update-register',
    commitSha: '1234567890abcdef1234567890abcdef12345678',
    timestamp: '2026-06-20T12:00:00Z',
    reviewer: 'security-reviewer',
    testCases,
    failures: [],
    tablesReviewed: tableCoverageFrom(testCases),
    ...overrides,
  });
}

describe('Supabase live RLS evidence parser and generator', () => {
  it('tracks the enterprise critical table set exactly', () => {
    expect(criticalTables).toEqual([
      'organizations',
      'organization_members',
      'documents',
      'audit_events',
      'risks',
      'vendors',
      'tasks',
      'subscriptions',
      'notifications',
    ]);
  });

  it('tracks backend-owned write denial operations', () => {
    expect(requiredBackendWriteDenyOperations).toEqual([
      'same_tenant_insert_denied',
      'same_tenant_update_denied',
      'same_tenant_delete_denied',
    ]);
  });

  it('generates passing evidence with redacted project reference and required runtime fields', () => {
    const testCases = passingTestCases();
    const evidence = passingEvidence({ testCases });

    expect(evidence.status).toBe('Complete');
    expect(evidence.outcome).toBe('passed');
    expect(evidence.timestamp).toBe('2026-06-20T12:00:00Z');
    expect(evidence.supabaseProjectReferenceRedacted).toBe(true);
    expect(evidence.supabaseProjectReference).toMatch(/^redacted:sha256:/);
    expect(evidence.supabaseProjectReference).not.toContain('abcdefghijklmnopqrst');
    expect(evidence.testsRun).toHaveLength(testCases.length);
    expect(evidence.failures).toEqual([]);
    expect(validatePassingEvidence(evidence)).toEqual({ valid: true, errors: [] });
  });

  it('redacts Supabase project references deterministically without leaking the raw ref', () => {
    const redacted = redactProjectReferenceFromUrl('https://tenantsecretref.supabase.co');

    expect(redacted).toMatch(/^redacted:sha256:[a-f0-9]{16}$/);
    expect(redacted).not.toContain('tenantsecretref');
    expect(redactProjectReferenceFromUrl('https://tenantsecretref.supabase.co')).toBe(redacted);
  });

  it('parses evidence JSON and reports malformed evidence safely', () => {
    const parsed = parseEvidenceJson('{"status":"Open"}');
    const malformed = parseEvidenceJson('{not-json');

    expect(parsed.evidence).toEqual({ status: 'Open' });
    expect(parsed.errors).toEqual([]);
    expect(malformed.evidence).toBeNull();
    expect(malformed.errors[0]).toContain('invalid JSON');
  });

  it('rejects Complete evidence without passing outcome, failures array, or required table coverage', () => {
    const testCases = passingTestCases().filter((test) => test.table !== 'tasks');
    const evidence = buildEvidencePayload({
      status: 'Complete',
      outcome: 'failed',
      supabaseUrl: 'https://abcdefghijklmnopqrst.supabase.co',
      command: 'node scripts/security/run-supabase-live-tenant-isolation.mjs',
      commitSha: '1234567890abcdef1234567890abcdef12345678',
      timestamp: '2026-06-20T12:00:00Z',
      testCases,
      failures: ['tasks coverage missing'],
      tablesReviewed: tableCoverageFrom(testCases),
    });

    const result = validatePassingEvidence(evidence);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('outcome must be passed');
    expect(result.errors).toContain('passing evidence must not contain failures');
    expect(result.errors).toContain('missing live RLS table coverage: tasks');
  });

  it('rejects evidence that has global operations but misses a critical table operation', () => {
    const testCases = passingTestCases().filter((test) => !(test.table === 'vendors' && test.operation === 'cross_tenant_update'));
    const result = validatePassingEvidence(passingEvidence({ testCases }));

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('missing live RLS operation coverage: vendors:cross_tenant_update');
  });

  it('rejects evidence that omits RLS enablement proof for a critical table', () => {
    const testCases = passingTestCases().filter((test) => !(test.table === 'documents' && test.operation === 'rls_enabled'));
    const result = validatePassingEvidence(passingEvidence({ testCases }));

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('missing live RLS operation coverage: documents:rls_enabled');
  });

  it('rejects evidence that omits same-tenant backend write denial for audit events', () => {
    const testCases = passingTestCases().filter((test) => !(test.table === 'audit_events' && test.operation === 'same_tenant_update_denied'));
    const result = validatePassingEvidence(passingEvidence({ testCases }));

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('missing live RLS operation coverage: audit_events:same_tenant_update_denied');
  });

  it('rejects evidence that omits viewer same-tenant admin denial', () => {
    const testCases = passingTestCases().filter((test) => test.operation !== 'viewer_same_tenant_admin_update_denied');
    const result = validatePassingEvidence(passingEvidence({ testCases }));

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('missing live RLS operation coverage: organization_members:viewer_same_tenant_admin_update_denied');
  });
});
