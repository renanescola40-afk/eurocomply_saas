import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/data-governance-runtime-proof.yml', 'utf8');
const migration = readFileSync('supabase/migrations/20260720190000_data_governance_enterprise.sql', 'utf8');
const runtime = readFileSync('scripts/data-governance/run-data-governance-runtime-proof.mjs', 'utf8');
const validator = readFileSync('scripts/data-governance/check-data-governance-evidence.mjs', 'utf8');

describe('data governance privacy audit megapack', () => {
  it('uses protected exact-main manual execution', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('environment: production-data-governance-proof');
    expect(workflow).toContain('EXECUTE_DATA_GOVERNANCE_PROOF');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toContain('contents: write');
  });

  it('creates tenant-scoped retention, DSR and integrity controls', () => {
    for (const token of [
      'data_retention_policies','data_subject_requests','audit_integrity_checkpoints',
      'enable row level security','request_type','retention_days','digest_sha256',
      'organization_members','owner','admin','interval \'30 days\'',
    ]) expect(migration).toContain(token);
  });

  it('validates governance controls without storing customer data', () => {
    for (const token of [
      'governanceTablesPresent','rlsEnabled','tenantPoliciesPresent','dsrDeadlineEnforced',
      'auditIntegritySchemaPresent','personalDataStored: false','rowDataStored: false',
    ]) expect(runtime).toContain(token);
    expect(runtime).not.toContain('select * from');
  });

  it('fails closed on unsafe or incomplete evidence', () => {
    for (const token of ['Complete','exact-SHA','postgresql://','personalDataStored','exportPayloadStored']) {
      expect(validator).toContain(token);
    }
  });
});
