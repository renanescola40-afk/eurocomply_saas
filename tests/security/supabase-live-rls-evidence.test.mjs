import { describe, expect, it } from 'vitest';
import {
  buildEvidencePayload,
  criticalTables,
  parseEvidenceJson,
  redactProjectReferenceFromUrl,
  tableCoverageFrom,
  validatePassingEvidence,
} from '../../scripts/security/run-supabase-live-tenant-isolation.mjs';

const operations = [
  'cross_tenant_read',
  'cross_tenant_insert',
  'cross_tenant_update',
  'cross_tenant_delete',
  'same_tenant_read',
];

function passingTestCases() {
  const cases = criticalTables.flatMap((table) => operations.map((operation) => ({
    table,
    operation,
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

  return cases;
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

  it('generates passing evidence with redacted project reference and required runtime fields', () => {
    const testCases = passingTestCases();
    const evidence = buildEvidencePayload({
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
    });

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
});
