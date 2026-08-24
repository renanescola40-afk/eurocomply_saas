import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20260822123626_v19_reconcile_enterprise_evidence_vault.sql';
const migration = readFileSync(migrationPath, 'utf8');
const evidenceRuntime = readFileSync('src/lib/evidence/storage.ts', 'utf8');
const evidencePage = readFileSync('src/app/[locale]/dashboard/evidence/page.tsx', 'utf8');
const reconciliation = JSON.parse(readFileSync('config/supabase-forward-reconciliation.json', 'utf8')) as {
  changeSet: string;
  migrations: Array<{ filename: string; purpose: string }>;
  truthBoundary: Record<string, boolean>;
};

const selected = reconciliation.migrations.map((migrationRecord) => migrationRecord.filename);

describe('Enterprise Evidence Vault data plane', () => {
  it('keeps the proved Evidence Vault migration ordered before the V20 payment-first Storage closure', () => {
    expect(reconciliation.changeSet).toBe('2026-08-23-enterprise-data-plane-payment-first-closure-v20');
    expect(selected).toHaveLength(27);
    expect(selected).toContain('20260822123626_v19_reconcile_enterprise_evidence_vault.sql');
    expect(selected).not.toContain('20260822120617_atomic_vendor_risk_quota_mutations.sql');

    expect(selected.indexOf('20260822123548_v19_reconcile_enterprise_break_glass_governance.sql')).toBeLessThan(
      selected.indexOf('20260822123550_v19_reconcile_enterprise_licensing_control_plane.sql'),
    );
    expect(selected.indexOf('20260822123550_v19_reconcile_enterprise_licensing_control_plane.sql')).toBeLessThan(
      selected.indexOf('20260822123552_v19_reconcile_enterprise_integrations_scim.sql'),
    );
    expect(selected.indexOf('20260822123622_v19_reconcile_gap_remediation_persistence.sql')).toBeLessThan(
      selected.indexOf('20260822123626_v19_reconcile_enterprise_evidence_vault.sql'),
    );
    expect(selected.indexOf('20260822123626_v19_reconcile_enterprise_evidence_vault.sql')).toBeLessThan(
      selected.indexOf('20260823123000_payment_first_commercial_data_plane.sql'),
    );
    expect(selected.indexOf('20260823123000_payment_first_commercial_data_plane.sql')).toBeLessThan(
      selected.indexOf('20260823131500_payment_first_gap_analysis_and_storage.sql'),
    );
    expect(selected.at(-1)).toBe('20260823131500_payment_first_gap_analysis_and_storage.sql');

    expect(reconciliation.truthBoundary.automaticClassification).toBe(false);
    expect(reconciliation.truthBoundary.productionWriteAuthorizedByConfig).toBe(false);
    expect(reconciliation.truthBoundary.migrationHistoryRepairAllowed).toBe(false);
    expect(reconciliation.truthBoundary.unrestrictedDbPushAllowed).toBe(false);
    expect(reconciliation.truthBoundary.onlyListedForwardMigrationsMayBeRehearsedOrRequested).toBe(true);
  });

  it('fails closed when legacy tenant or object ownership cannot be proved', () => {
    expect(migration).toContain('having count(distinct om.organization_id) = 1');
    expect(migration).toContain('do not map to exactly one organization');
    expect(migration).toContain('require explicit object copy and SHA-256 reconciliation');
    expect(migration).toContain('alter column organization_id set not null');
    expect(migration).toContain('evidence_items_organization_id_fkey');
  });

  it('makes tenant, creator, attachment and deletion boundaries immutable', () => {
    expect(migration).toContain('app_private.enforce_evidence_item_invariants()');
    expect(migration).toContain('evidence_items_enforce_invariants');
    expect(migration).toContain('Evidence tenant, creator, identity and creation boundary are immutable');
    expect(migration).toContain('Evidence attachment metadata is write-once');
    expect(migration).toContain('Soft-deleted Evidence Vault records are immutable');
    expect(migration).toContain('new.updated_at := now()');
    expect(migration).toContain('Evidence creator must match the authenticated actor');
  });

  it('enforces canonical metadata RLS, soft delete, append-only audit and hash metadata', () => {
    expect(migration).toContain('alter table public.evidence_items enable row level security');
    expect(migration).toContain('alter table public.evidence_items force row level security');
    expect(migration).toContain('alter table public.evidence_item_audit_events force row level security');
    expect(migration).toContain('rls_evidence_items_select_organization');
    expect(migration).toContain('rls_evidence_items_insert_organization');
    expect(migration).toContain('rls_evidence_items_update_organization');
    expect(migration).not.toContain('create policy "rls_evidence_items_delete_organization"');
    expect(migration).toContain('revoke all on table public.evidence_items from public, anon, authenticated');
    expect(migration).toContain('grant select, insert, update on table public.evidence_items to authenticated');
    expect(migration).toContain('Evidence Vault records are append-audited and must be soft-deleted');
    expect(migration).toContain('create table if not exists public.evidence_item_audit_events');
    expect(migration).toContain('evidence_items_attachment_completeness_check');
    expect(migration).toContain('file_sha256 ~');
    expect(migration).toContain("event_type in ('created', 'updated', 'soft_deleted')");
  });

  it('binds Storage objects to organization and Evidence IDs with no browser mutation policy', () => {
    expect(migration).toContain("values ('compliance-evidence', 'compliance-evidence', false)");
    expect(migration).toContain('app_private.evidence_storage_organization_id(object_name text)');
    expect(migration).toContain('app_private.evidence_storage_evidence_id(object_name text)');
    expect(migration).toContain('e.storage_object_path = storage.objects.name');
    expect(migration).toContain('rls_compliance_evidence_objects_select_organization');
    expect(migration).toContain('rls_compliance_evidence_objects_insert_organization');
    expect(migration).not.toContain('create policy "rls_compliance_evidence_objects_update_organization"');
    expect(migration).not.toContain('create policy "rls_compliance_evidence_objects_delete_organization"');
    expect(migration).toContain('authenticated Evidence Storage UPDATE/DELETE policy remains present');
  });

  it('binds the application contract to organization_id and the Evidence record id', () => {
    expect(evidenceRuntime).toContain('organizationId: string');
    expect(evidenceRuntime).toContain('evidenceId: string');
    expect(evidenceRuntime).toContain(".eq('organization_id', params.organizationId)");
    expect(evidenceRuntime).toContain('Multiple organizations are available; select an organization');
    expect(evidenceRuntime).toContain('`${params.organizationId}/${params.evidenceId}/${fileName}`');
    expect(evidenceRuntime).toContain("crypto.subtle.digest('SHA-256', buffer)");
    expect(evidenceRuntime).toContain('Create Evidence metadata first, then attach bytes with uploadEvidenceFile.');
    expect(evidenceRuntime).not.toContain('`${params.organizationId}/${objectId}/${fileName}`');
    expect(evidencePage).toContain('resolveEvidenceOrganization');
    expect(evidencePage).toContain('organizationId,');
  });

  it('asserts the earlier Enterprise dependency spine before the Vault can close', () => {
    for (const table of [
      'enterprise_break_glass_requests',
      'platform_admin_users',
      'organization_entitlements',
      'enterprise_identity_connections',
      'enterprise_scim_tokens',
      'enterprise_scim_identities',
      'enterprise_integration_audit_events',
    ]) {
      expect(migration).toContain(`'${table}'`);
    }
  });
});
