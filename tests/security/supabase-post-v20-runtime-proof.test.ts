import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  '.github/workflows/supabase-post-v20-runtime-proof.yml',
  'utf8',
);
const runner = readFileSync(
  'scripts/security/run-supabase-post-v20-runtime-proof.mjs',
  'utf8',
);

describe('Supabase post-V20 Production runtime proof contract', () => {
  it('is dispatch-only, exact-SHA, promotion-bound and protected', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toMatch(/^\s{2}push:/m);
    expect(workflow).not.toMatch(/^\s{2}pull_request:/m);
    expect(workflow).toContain('release_sha:');
    expect(workflow).toContain('promotion_run_id:');
    expect(workflow).toContain('confirmation:');
    expect(workflow).toContain('EXECUTE_POST_V20_RUNTIME_PROOF');
    expect(workflow).toContain("test \"$GITHUB_REF_NAME\" = 'main'");
    expect(workflow).toContain('test "$GITHUB_SHA" = "$TARGET_SHA"');
    expect(workflow).toContain(
      '.github/workflows/supabase-forward-reconciliation-production-promotion.yml',
    );
    expect(workflow).toContain("test \"$(jq -r '.event' <<<\"$PROMOTION_JSON\")\" = 'workflow_dispatch'");
    expect(workflow).toContain("test \"$(jq -r '.conclusion' <<<\"$PROMOTION_JSON\")\" = 'success'");
    expect(workflow).toContain('environment: supabase-live-rls-validation');
    expect(workflow).toContain('GITHUB_ENVIRONMENT_NAME: supabase-live-rls-validation');
  });

  it('accepts only a successful exact 27-item governed promotion artifact', () => {
    expect(workflow).toContain('supabase-forward-production-promotion-${TARGET_SHA}');
    expect(workflow).toContain('promotion-transition.json');
    expect(workflow).toContain('live-postconditions.json');
    expect(workflow).toContain('current-manifest.json');
    expect(workflow).toContain('.selectedMigrationCount == 27');
    expect(workflow).toContain('.checks.remoteAfterEqualsBeforePlusSelected == true');
    expect(workflow).toContain('.checks.unauthorizedMigrationApplied == false');
    expect(workflow).toContain('.postconditions == "forward_reconciliation_postconditions_passed"');
    expect(workflow).toContain('.schema == "risck-comply.supabase-forward-reconciliation-manifest.v1"');
    expect(workflow).toContain('.targetSha == $sha');
    expect(workflow).toContain('(.selectionDigest | test("^sha256:[a-f0-9]{64}$"))');
    expect(workflow).toContain('(.migrations | length) == 27');
    expect(workflow).toContain('20260823123000_payment_first_commercial_data_plane.sql');
    expect(workflow).toContain('20260823131500_payment_first_gap_analysis_and_storage.sql');
    expect(workflow).toContain('.checks.exactShaBound == true');
    expect(workflow).toContain('.checks.productionWriteAuthorized == false');
    expect(workflow).toContain('.checks.migrationHistoryRepairAuthorized == false');
    expect(workflow).toContain('.checks.unrestrictedDbPushAuthorized == false');
  });

  it('contains no migration, SQL or Production schema mutation path', () => {
    expect(workflow).not.toContain('db push');
    expect(workflow).not.toContain('--include-all');
    expect(workflow).not.toContain('migration repair');
    expect(workflow).not.toContain('SUPABASE_DB_POOLER_URL');
    expect(workflow).not.toMatch(/\bpsql\b/);
    expect(workflow).not.toContain('apply_migration');
    expect(workflow).not.toContain('apply_migrations');
    expect(runner).not.toContain('SUPABASE_DB_POOLER_URL');
    expect(runner).not.toMatch(/\bpsql\b/);
  });

  it('creates bounded signed-contract proof authority without synthetic Stripe lifecycle', () => {
    expect(runner).toContain("'enterprise_entitlement_sources'");
    expect(runner).toContain("'enterprise_entitlement_snapshots'");
    expect(runner).toContain("source_kind: 'signed_contract'");
    expect(runner).toContain("status: 'applied'");
    expect(runner).toContain('unlicensedSameTenantReadDenied');
    expect(runner).toContain('unlicensedSameTenantInsertDenied');
    expect(runner).toContain('paymentFirstLicensedAndUnlicensed: true');
    expect(runner).not.toContain("from('stripe_events_processed').insert");
    expect(runner).not.toContain('from("stripe_events_processed").insert');
    expect(runner).toContain('providerEventsCreated: false');
    expect(runner).toContain('stripeLifecycleSynthesized: false');
  });

  it('proves tenant A/B and browser/PostgREST denial semantics after payment-first', () => {
    for (const marker of [
      'licensedSameTenantRead',
      'licensedSameTenantInsert',
      'crossTenantReadDenied',
      'crossTenantInsertDenied',
      'crossTenantUpdateDenied',
      'crossTenantDeleteDenied',
      'anonymousPaidTableReadDenied',
      'regulatoryUpdatesBackendOnly',
      'inventoryHelperServiceRoleOnly',
      'legacyEvidenceBrowserSurfaceRevoked',
    ]) {
      expect(runner).toContain(marker);
      expect(workflow).toContain(`.checks.${marker} == true`);
    }
    expect(runner).toContain("from('regulatory_updates').select");
    expect(runner).toContain("rpc('eurocomply_live_rls_inventory'");
  });

  it('covers Evidence Vault live negative boundaries without weakening the disposable positive proof', () => {
    expect(runner).toContain("from('evidence_items').insert");
    expect(runner).toContain("getBucket('compliance-evidence')");
    expect(runner).toContain("storage.from('compliance-evidence').upload");
    expect(runner).toContain('evidenceVaultPaymentFirstInsertDenied');
    expect(runner).toContain('evidenceVaultBucketPrivate');
    expect(runner).toContain('evidenceStorageRequiresCanonicalMetadata');
    expect(runner).toContain('evidenceVaultLiveNegativeBoundary: true');
    expect(runner).toContain('evidenceVaultDisposablePositiveBoundaryRequiredSeparately: true');
  });

  it('cleans payment-first fixtures and the automatically-created Enterprise compatibility envelope', () => {
    for (const table of [
      'enterprise_entitlement_reconciliation_events',
      'enterprise_entitlement_snapshots',
      'enterprise_entitlement_sources',
      'organization_entitlements',
      'organization_usage',
      'enterprise_contracts',
      'organization_members',
      'organizations',
    ]) {
      expect(runner).toContain(`'${table}'`);
    }
    expect(runner).toContain('admin.auth.admin.deleteUser');
    expect(runner).toContain('fixture_cleanup_failed');
    expect(runner).toContain('cleanupRequired: true');
    expect(workflow).toContain('.checks.fixtureCleanup == true');
  });

  it('emits only a redacted, exact-SHA, promotion-linked artifact', () => {
    expect(runner).toContain('risck-comply.supabase-post-v20-runtime-proof.v1');
    expect(runner).toContain('supabaseProjectReferenceRedacted: true');
    expect(runner).toContain('promotionRunId');
    expect(workflow).toContain('supabase-post-v20-runtime-proof-${{ inputs.release_sha }}');
    expect(workflow).toContain('SHA256SUMS');
    expect(workflow).toContain('retention-days: 90');
  });
});
