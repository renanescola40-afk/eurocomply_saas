import { describe, expect, it } from 'vitest';
import { validateSupabaseRlsRuntimeEvidence } from './validate-supabase-rls-runtime-evidence.mjs';
import { LIVE_RLS_EVIDENCE_SCHEMA, loadForwardManifestContract } from '../security/supabase-forward-manifest-contract.mjs';

const now = new Date('2026-08-24T19:00:00Z');
const SHA = 'a'.repeat(40);
const tables = [
  'organizations', 'organization_members', 'ai_systems', 'compliance_tasks',
  'documents', 'risks', 'vendors', 'subscriptions', 'audit_logs', 'invitations',
  'onboarding_activation_runs', 'monitoring_preferences', 'profiles',
  'regulatory_updates', 'ai_assessments',
];

function completeEvidence() {
  const contract = loadForwardManifestContract();
  return {
    schema: LIVE_RLS_EVIDENCE_SCHEMA,
    evidenceItem: 'supabase-live-rls-validation',
    status: 'Complete', outcome: 'passed', generatedAt: '2026-08-24T18:30:00Z', commitSha: SHA,
    promotionLineage: {
      promotionRunId: '12345', changeSet: contract.changeSet,
      selectedMigrationCount: contract.count, selectionDigest: `sha256:${'b'.repeat(64)}`,
      manifestMatchVerified: true, remoteAfterEqualsBeforePlusSelected: true,
      unauthorizedMigrationApplied: false, productionPromotionVerified: true,
    },
    runtimeContext: {
      generatedByGithubActions: true, repository: 'renanescola40-afk/eurocomply_saas',
      branch: 'main', githubRunId: '67890', commitSha: SHA,
    },
    supabaseProjectReference: 'redacted:sha256:abc123', supabaseProjectReferenceRedacted: true,
    tablesReviewed: tables.map((table) => ({
      table, status: 'passed', rlsEnabled: true,
      operations: table === 'regulatory_updates'
        ? { globalProductBackendOnly: true }
        : { crossTenantReadDenied: true, crossTenantInsertDenied: true, crossTenantUpdateDenied: true, crossTenantDeleteDenied: true, sameTenantReadAllowed: true, backendWritesDenied: true },
    })),
    testCases: ['rls_enabled','cross_tenant_read','cross_tenant_insert','cross_tenant_update','cross_tenant_delete','same_tenant_read'].map((operation) => ({ table: 'profiles', operation, passed: true })),
    paymentFirstV20: { licensedTenantsProved: true, unlicensedSameTenantDenied: true, regulatoryUpdatesBackendOnly: true, providerEventsCreated: false, stripeLifecycleSynthesized: false },
    evidenceIntegrity: { containsSensitiveValues: false, credentialsStored: false },
  };
}

describe('release Supabase RLS validator', () => {
  it('accepts a fresh exact-SHA proof bound to the current manifest', () => {
    expect(validateSupabaseRlsRuntimeEvidence(completeEvidence(), { now })).toEqual([]);
  });
  it('rejects stale package counts without hard-coding a version count', () => {
    const evidence = completeEvidence();
    evidence.promotionLineage.selectedMigrationCount -= 1;
    expect(validateSupabaseRlsRuntimeEvidence(evidence, { now })).toContain('promotionLineage.selectedMigrationCount must match current governed manifest');
  });
  it('rejects missing ordered-manifest binding', () => {
    const evidence = completeEvidence();
    evidence.promotionLineage.manifestMatchVerified = false;
    expect(validateSupabaseRlsRuntimeEvidence(evidence, { now })).toContain('promotionLineage.manifestMatchVerified must be true');
  });
});
