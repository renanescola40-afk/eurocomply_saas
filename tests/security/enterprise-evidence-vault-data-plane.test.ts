import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20260817001500_reconcile_enterprise_evidence_vault.sql';
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
  it('adds exactly one proved Evidence Vault tail to the bounded forward set', () => {
    expect(reconciliation.changeSet).toBe('2026-08-17-enterprise-data-plane-closure-v17');
    expect(selected).toHaveLength(25);
    expect(selected.at(-1)).toBe('20260817001500_reconcile_enterprise_evidence_vault.sql');

    expect(selected.indexOf('20260813234000_reconcile_enterprise_break_glass_governance.sql')).toBeLessThan(
      selected.indexOf('20260814090000_reconcile_enterprise_licensing_control_plane.sql'),
    );
    expect(selected.indexOf('20260814090000_reconcile_enterprise_licensing_control_plane.sql')).toBeLessThan(
      selected.indexOf('20260814091000_reconcile_enterprise_integrations_scim.sql'),
    );
    expect(selected.indexOf('20260816104500_reconcile_gap_remediation_persistence.sql')).toBeLessThan(
      selected.indexOf('20260817001500_reconcile_enterprise_evidence_vault.sql'),
    );

    expect(reconciliation.truthBoundary.productionWriteAuthorizedByConfig).toBe(false);
    expect(reconciliation.truthBoundary.migrationHistoryRepairAllowed).toBe(false);
    expect(reconciliation.truthBoundary.unrestrictedDbPushAllowed).toBe(false);
  });

  it('fails closed when legacy tenant or object ownership cannot be proved', () => {
    expect(migration).toContain('having count(distinct om.organization_id) = 1');
    expect(migration).toContain('do not map to exactly one organization');
    expect(migration).toContain('legacy object path(s) require explicit tenant-safe Storage migration');
    expect(migration).toContain('alter column organization_id set not null');
    expect(migration).toContain('evidence_items_organization_id_fkey');
  });

  it('enforces canonical metadata RLS, soft delete, append-only audit and hash metadata', () => {
    expect(migration).toContain('alter table public.evidence_items enable row level security');
    expect(migration).toContain('alter table public.evidence_items force row level security');
    expect(migration).toContain('rls_evidence_items_select_organization');
    expect(migration).toContain('rls_evidence_items_insert_organization');
    expect(migration).toContain('rls_evidence_items_update_organization');
    expect(migration).not.toContain('create policy "rls_evidence_items_delete_organization"');
    expect(migration).toContain('revoke all on table public.evidence_items from public, anon, authenticated');
    expect(migration).toContain('grant select, insert, update on table public.evidence_items to authenticated');
    expect(migration).toContain('Evidence Vault records are append-audited and must be soft-deleted');
    expect(migration).toContain('create table if not exists public.evidence_item_audit_events');
    expect(migration).toContain('file_sha256 ~');
    expect(migration).toContain("event_type in ('created', 'updated', 'soft_deleted')");
  });

  it('enforces private tenant-prefixed Storage without authenticated hard delete', () => {
    expect(migration).toContain("values ('compliance-evidence', 'compliance-evidence', false)");
    expect(migration).toContain('app_private.evidence_storage_organization_id(name)');
    expect(migration).toContain('rls_compliance_evidence_objects_select_organization');
    expect(migration).toContain('rls_compliance_evidence_objects_insert_organization');
    expect(migration).toContain('rls_compliance_evidence_objects_update_organization');
    expect(migration).not.toContain('create policy "rls_compliance_evidence_objects_delete_organization"');
    expect(migration).toContain('legacy authenticated Evidence Storage delete policy remains present');
  });

  it('binds the application contract to organization_id instead of caller-supplied user_id', () => {
    expect(evidenceRuntime).toContain('organizationId: string');
    expect(evidenceRuntime).toContain(".eq('organization_id', params.organizationId)");
    expect(evidenceRuntime).toContain('Multiple organizations are available; select an organization');
    expect(evidenceRuntime).toContain('`${params.organizationId}/${objectId}/${fileName}`');
    expect(evidenceRuntime).toContain("crypto.subtle.digest('SHA-256', buffer)");
    expect(evidenceRuntime).not.toContain('userId: string;\n  workspaceId');
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
