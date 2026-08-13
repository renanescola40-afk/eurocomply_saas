import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const dossier = fs.readFileSync(
  'docs/security/evidence/human-review/split-reviews/i-dup-16-live-object-evidence.md',
  'utf8',
);
const legacyLedger = fs.readFileSync(
  'supabase/migrations/20260728170000_billing_lifecycle_requests.sql',
  'utf8',
);
const canonicalLedger = fs.readFileSync(
  'supabase/migrations/20260812221912_reconcile_billing_lifecycle_requests_runtime.sql',
  'utf8',
);
const tenantHardening = fs.readFileSync(
  'supabase/migrations/20260728170000_harden_billing_tenant_tables.sql',
  'utf8',
);
const billingCatalog = fs.readFileSync(
  'supabase/migrations/20260727193000_enterprise_billing_catalog.sql',
  'utf8',
);
const rlsHelper = fs.readFileSync(
  'supabase/migrations/20260701150000_supabase_production_rls_proof_hardening.sql',
  'utf8',
);

describe('Supabase I-DUP-16 technical split review', () => {
  it('binds the legacy lifecycle ledger to the canonical runtime reconciliation', () => {
    expect(legacyLedger).toContain('create table if not exists public.billing_lifecycle_requests');
    expect(canonicalLedger).toContain('create table if not exists public.billing_lifecycle_requests');
    expect(canonicalLedger).toContain('billing_lifecycle_requests_org_request_idx');
    expect(canonicalLedger).toContain('billing lifecycle ledger RLS hardening verification failed');
    expect(dossier).toContain('Technical disposition candidate: `SUPERSEDED`');
    expect(dossier).toContain('20260812221912_reconcile_billing_lifecycle_requests_runtime.sql');
  });

  it('keeps the tenant-table half unresolved while the catalog/helper lineage is non-self-contained', () => {
    for (const table of ['customer_add_ons', 'storage_usage', 'billing_limits', 'feature_flags']) {
      expect(tenantHardening).toContain(`'${table}'`);
    }
    expect(billingCatalog).toContain('create table if not exists public.storage_usage');
    expect(billingCatalog).toContain('create table if not exists public.billing_limits');
    expect(billingCatalog).toContain('create table if not exists public.feature_flags');
    expect(billingCatalog).toContain("select public.app_rls_harden_backend_only_table('storage_usage')");
    expect(rlsHelper).toContain('create or replace function public.app_rls_harden_backend_only_table');
    expect(rlsHelper).toContain('drop function if exists public.app_rls_harden_backend_only_table(text)');
    expect(dossier).toContain('split review remains unresolved');
    expect(dossier).not.toContain('Technical disposition candidate: `ALREADY_PRESENT_IN_SCHEMA`');
  });

  it('preserves the non-authorizing evidence boundary', () => {
    expect(dossier).toContain('productionWriteAuthorized = false');
    expect(dossier).toContain('migrationExecutionAuthorized = false');
    expect(dossier).toContain('independentApprovalPresent = false');
    expect(dossier).toContain('canonicalDecisionAccepted = false');
  });
});
