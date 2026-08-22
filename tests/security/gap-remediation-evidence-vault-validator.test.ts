import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const validator = readFileSync('scripts/security/validate-gap-remediation-runtime.sql', 'utf8');
const evidenceVaultMigration = readFileSync(
  'supabase/migrations/20260822123626_v19_reconcile_enterprise_evidence_vault.sql',
  'utf8',
);

const canonicalMetadataPolicies = [
  'rls_evidence_items_select_organization',
  'rls_evidence_items_insert_organization',
  'rls_evidence_items_update_organization',
];

const canonicalStoragePolicies = [
  'rls_compliance_evidence_objects_select_organization',
  'rls_compliance_evidence_objects_insert_organization',
];

describe('Gap remediation Evidence Vault runtime validator', () => {
  it('tracks the canonical organization-scoped Evidence Vault policy contract', () => {
    for (const policy of [...canonicalMetadataPolicies, ...canonicalStoragePolicies]) {
      expect(evidenceVaultMigration).toContain(policy);
      expect(validator).toContain(policy);
    }

    expect(validator).toContain('evidence_items_policy_count <> 3');
    expect(validator).toContain('storage_policy_count <> 2');
    expect(validator).toContain(
      "has_table_privilege('authenticated', 'public.evidence_items', 'DELETE')",
    );
    expect(validator).toContain(
      'authenticated must not have hard DELETE privilege on Evidence Vault metadata',
    );
    expect(validator).toContain(
      'authenticated Evidence Vault storage UPDATE/DELETE policy remains active',
    );
  });

  it('keeps the compatibility evidence table contract separate from canonical Evidence Vault metadata', () => {
    expect(validator).toContain("tablename = 'compliance_evidence'");
    expect(validator).toContain('rls_compliance_evidence_select_owner');
    expect(validator).toContain('rls_compliance_evidence_insert_owner');
    expect(validator).toContain('rls_compliance_evidence_update_owner');
    expect(validator).toContain('rls_compliance_evidence_delete_owner');
    expect(validator).toContain('compliance_evidence_policy_count <> 4');
  });
});
