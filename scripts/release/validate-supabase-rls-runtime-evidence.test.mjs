import { describe, expect, it } from 'vitest';
import { validateSupabaseRlsRuntimeEvidence } from './validate-supabase-rls-runtime-evidence.mjs';

const now = new Date('2026-08-25T16:00:00Z');
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
    schema: 'risck-comply.supabase-live-rls-validation.v21',
    evidenceItem: 'supabase-live-rls-validation',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: '2026-08-25T15:00:00Z',
    commitSha: 'a'.repeat(40),
    promotionLineage: {
      promotionRunId: '33123456789',
      changeSet: '2026-08-24-enterprise-data-plane-payment-first-trusted-access-closure-v21',
      selectedMigrationCount: 31,
      selectionDigest: `sha256:${'b'.repeat(64)}`,
      remoteAfterEqualsBeforePlusSelected: true,
      unauthorizedMigrationApplied: false,
      productionPromotionVerified: true,
    },
    runtimeContext: {
      generatedByGithubActions: true,
      repository: 'renanescola40-afk/eurocomply_saas',
      branch: 'main',
      githubRunId: '33123456890',
      commitSha: 'a'.repeat(40),
    },
    supabaseProjectReference: 'redacted:sha256:abc123',
    supabaseProjectReferenceRedacted: true,
    tablesReviewed: tables.map((table) => ({
      table,
      status: 'passed',
      rlsEnabled: true,
      operations: table === 'regulatory_updates'
        ? { globalProductBackendOnly: true }
        : {
            crossTenantReadDenied: true,
            crossTenantInsertDenied: true,
            crossTenantUpdateDenied: true,
            crossTenantDeleteDenied: true,
            sameTenantReadAllowed: true,
            ...(table === 'compliance_tasks' ? { backendWritesDenied: true } : {}),
          },
    })),
    testCases: profileOperations.map((operation) => ({ table: 'profiles', operation, passed: true })),
    paymentFirstV20: {
      licensedTenantsProved: true,
      unlicensedSameTenantDenied: true,
      regulatoryUpdatesBackendOnly: true,
      providerEventsCreated: false,
      stripeLifecycleSynthesized: false,
    },
    evidenceIntegrity: { containsSensitiveValues: false, credentialsStored: false },
  };
}

describe('validateSupabaseRlsRuntimeEvidence V21', () => {
  it('accepts fresh promotion-bound live RLS proof for main', () => {
    expect(validateSupabaseRlsRuntimeEvidence(completeEvidence(), { now })).toEqual([]);
  });

  it('rejects stale RLS evidence', () => {
    const evidence = completeEvidence();
    evidence.generatedAt = '2026-08-01T15:00:00Z';
    expect(validateSupabaseRlsRuntimeEvidence(evidence, { now })).toContain('generatedAt is older than 7 days');
  });

  it('rejects evidence from a feature branch', () => {
    const evidence = completeEvidence();
    evidence.runtimeContext.branch = 'feature/example';
    expect(validateSupabaseRlsRuntimeEvidence(evidence, { now })).toContain('runtimeContext.branch must be main');
  });

  it('rejects incomplete or non-V21 promotion lineage', () => {
    const evidence = completeEvidence();
    evidence.promotionLineage.selectedMigrationCount = 30;
    evidence.promotionLineage.productionPromotionVerified = false;
    const failures = validateSupabaseRlsRuntimeEvidence(evidence, { now });
    expect(failures).toContain('promotionLineage.selectedMigrationCount must be 31');
    expect(failures).toContain('promotionLineage.productionPromotionVerified must be true');
  });

  it('rejects stale authenticated regulatory-read semantics', () => {
    const evidence = completeEvidence();
    evidence.tablesReviewed.find((entry) => entry.table === 'regulatory_updates').operations = { globalReferenceReadOnly: true };
    expect(validateSupabaseRlsRuntimeEvidence(evidence, { now })).toContain('regulatory_updates must be backend-only after governed promotion');
  });

  it('rejects organization compliance task browser writes', () => {
    const evidence = completeEvidence();
    evidence.tablesReviewed.find((entry) => entry.table === 'compliance_tasks').operations.backendWritesDenied = false;
    expect(validateSupabaseRlsRuntimeEvidence(evidence, { now })).toContain('compliance_tasks organization browser writes must be denied');
  });

  it('rejects missing cross-tenant delete denial', () => {
    const evidence = completeEvidence();
    evidence.tablesReviewed.find((entry) => entry.table === 'documents').operations.crossTenantDeleteDenied = false;
    expect(validateSupabaseRlsRuntimeEvidence(evidence, { now })).toContain('documents.crossTenantDeleteDenied must be true');
  });

  it('rejects missing explicit profiles live proof', () => {
    const evidence = completeEvidence();
    evidence.testCases = evidence.testCases.filter((test) => test.operation !== 'cross_tenant_update');
    expect(validateSupabaseRlsRuntimeEvidence(evidence, { now })).toContain('profiles:cross_tenant_update must have exactly one passing live test');
  });

  it('rejects synthetic provider or Stripe lifecycle', () => {
    const evidence = completeEvidence();
    evidence.paymentFirstV20.providerEventsCreated = true;
    evidence.paymentFirstV20.stripeLifecycleSynthesized = true;
    const failures = validateSupabaseRlsRuntimeEvidence(evidence, { now });
    expect(failures).toContain('paymentFirstV20 must not synthesize provider events');
    expect(failures).toContain('paymentFirstV20 must not synthesize Stripe lifecycle');
  });

  it('rejects unredacted project identity or stored credentials', () => {
    const evidence = completeEvidence();
    evidence.supabaseProjectReference = 'real-project-reference';
    evidence.evidenceIntegrity.credentialsStored = true;
    const failures = validateSupabaseRlsRuntimeEvidence(evidence, { now });
    expect(failures).toContain('supabaseProjectReference must contain only a redacted digest');
    expect(failures).toContain('evidenceIntegrity.credentialsStored must be false');
  });
});
