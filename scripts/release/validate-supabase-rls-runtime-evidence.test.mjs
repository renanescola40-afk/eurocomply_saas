import { describe, expect, it } from 'vitest';
import { validateSupabaseRlsRuntimeEvidence } from './validate-supabase-rls-runtime-evidence.mjs';

const now = new Date('2026-07-11T16:00:00Z');
const tables = [
  'organizations', 'organization_members', 'ai_systems', 'compliance_tasks',
  'documents', 'risks', 'vendors', 'subscriptions', 'audit_logs', 'invitations',
  'onboarding_activation_runs', 'monitoring_preferences', 'profiles',
  'regulatory_updates', 'ai_assessments',
];

function completeEvidence() {
  const profileOperations = [
    'rls_enabled', 'cross_tenant_read', 'cross_tenant_insert',
    'cross_tenant_update', 'cross_tenant_delete', 'same_tenant_read',
  ];
  return {
    evidenceItem: 'supabase-live-rls-validation',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: '2026-07-11T15:00:00Z',
    commitSha: 'a'.repeat(40),
    runtimeContext: {
      generatedByGithubActions: true,
      repository: 'renanescola40-afk/eurocomply_saas',
      branch: 'main',
      githubRunId: '29170000000',
      commitSha: 'a'.repeat(40),
    },
    supabaseProjectReference: 'redacted:sha256:abc123',
    supabaseProjectReferenceRedacted: true,
    tablesReviewed: tables.map((table) => ({
      table,
      status: 'passed',
      rlsEnabled: true,
      operations: table === 'regulatory_updates'
        ? { globalReferenceReadOnly: true, backendWritesDenied: true }
        : {
            crossTenantReadDenied: true,
            crossTenantInsertDenied: true,
            crossTenantUpdateDenied: true,
            crossTenantDeleteDenied: true,
            sameTenantReadAllowed: true,
          },
    })),
    testCases: profileOperations.map((operation) => ({ table: 'profiles', operation, passed: true })),
    evidenceIntegrity: { containsSensitiveValues: false, credentialsStored: false },
  };
}

describe('validateSupabaseRlsRuntimeEvidence', () => {
  it('accepts fresh complete live RLS proof for main', () => {
    expect(validateSupabaseRlsRuntimeEvidence(completeEvidence(), { now })).toEqual([]);
  });

  it('rejects stale RLS evidence', () => {
    const evidence = completeEvidence();
    evidence.generatedAt = '2026-07-01T15:00:00Z';
    expect(validateSupabaseRlsRuntimeEvidence(evidence, { now }))
      .toContain('generatedAt is older than 7 days');
  });

  it('rejects evidence from a feature branch', () => {
    const evidence = completeEvidence();
    evidence.runtimeContext.branch = 'feature/example';
    expect(validateSupabaseRlsRuntimeEvidence(evidence, { now }))
      .toContain('runtimeContext.branch must be main');
  });

  it('rejects missing cross-tenant delete denial', () => {
    const evidence = completeEvidence();
    evidence.tablesReviewed.find((entry) => entry.table === 'documents').operations.crossTenantDeleteDenied = false;
    expect(validateSupabaseRlsRuntimeEvidence(evidence, { now }))
      .toContain('documents.crossTenantDeleteDenied must be true');
  });

  it('rejects missing explicit profiles live proof', () => {
    const evidence = completeEvidence();
    evidence.testCases = evidence.testCases.filter((test) => test.operation !== 'cross_tenant_update');
    expect(validateSupabaseRlsRuntimeEvidence(evidence, { now }))
      .toContain('profiles:cross_tenant_update must have exactly one passing live test');
  });

  it('rejects unredacted Supabase project identity', () => {
    const evidence = completeEvidence();
    evidence.supabaseProjectReference = 'real-project-reference';
    expect(validateSupabaseRlsRuntimeEvidence(evidence, { now }))
      .toContain('supabaseProjectReference must contain only a redacted digest');
  });

  it('rejects evidence that stores credentials', () => {
    const evidence = completeEvidence();
    evidence.evidenceIntegrity.credentialsStored = true;
    expect(validateSupabaseRlsRuntimeEvidence(evidence, { now }))
      .toContain('evidenceIntegrity.credentialsStored must be false');
  });
});
