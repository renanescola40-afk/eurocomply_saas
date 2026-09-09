import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/data-governance-runtime-proof.yml', 'utf8');
const baseMigration = readFileSync('supabase/migrations/20260720190000_data_governance_enterprise.sql', 'utf8');
const lifecycleMigration = readFileSync('supabase/migrations/20260909143000_harden_data_subject_request_lifecycle.sql', 'utf8');
const runtime = readFileSync('scripts/data-governance/run-data-governance-runtime-proof.mjs', 'utf8');
const validator = readFileSync('scripts/data-governance/check-data-governance-evidence.mjs', 'utf8');

describe('data governance privacy audit megapack', () => {
  it('uses protected exact-main manual execution and an exact-SHA disposable project database', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('environment: production-data-governance-proof');
    expect(workflow).toContain('EXECUTE_DATA_GOVERNANCE_PROOF');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('supabase/setup-cli@46f7f98c7f948ad727d22c1e67fab04c223a0520');
    expect(workflow).toContain('version: 2.101.0');
    expect(workflow).toContain('run-reviewed-ephemeral-schema-boundary-v4.mjs');
    expect(workflow).not.toContain('run-ephemeral-project-schema-replay.mjs');
    expect(workflow).not.toContain('manage-ephemeral-recovery-database.mjs start-project');
    expect(workflow).toContain('manage-ephemeral-recovery-database.mjs stop');
    expect(workflow).toMatch(/Remove disposable project database[\s\S]*?if: always\(\)/);
    expect(workflow).not.toContain('secrets.RECOVERY_ISOLATED_DATABASE_URL');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toContain('contents: write');
  });

  it('retains the historical governance primitives and evolves the canonical DSR table forward', () => {
    for (const token of [
      'data_retention_policies','data_subject_requests','audit_integrity_checkpoints',
      'enable row level security','request_type','retention_days','digest_sha256',
      'organization_members','owner','admin','interval \'30 days\'',
    ]) expect(baseMigration).toContain(token);

    expect(lifecycleMigration).not.toContain('create table if not exists public.data_subject_requests');
    expect(lifecycleMigration).not.toContain("interval '30 days'");
    expect(lifecycleMigration).toContain('alter column due_at drop default');
    expect(lifecycleMigration).toContain('force row level security');
    expect(lifecycleMigration).toContain("'portability'");
    expect(lifecycleMigration).toContain("'consent_withdrawal'");
  });

  it('removes direct browser mutation authority from the canonical DSR table', () => {
    expect(lifecycleMigration).toContain('drop policy if exists "data subjects create own requests"');
    expect(lifecycleMigration).toContain('drop policy if exists "data subject admins process requests"');
    expect(lifecycleMigration).toContain('drop policy if exists "data subject requesters cancel own pending requests"');
    expect(lifecycleMigration).toContain('revoke insert, update, delete on table public.data_subject_requests from anon, authenticated');
    expect(lifecycleMigration).toContain('grant select on table public.data_subject_requests to authenticated');
  });

  it('validates the hardened governance controls without storing customer data', () => {
    for (const token of [
      'governanceTablesPresent','rlsEnabled','dsrForceRlsEnabled','tenantPoliciesPresent',
      'dsrLifecycleColumnsPresent','dsrCalendarDeadlineServerAuthority','dsrChapterThreeTypesPresent',
      'dsrServerOnlyMutationBoundary','auditIntegritySchemaPresent','personalDataStored: false','rowDataStored: false',
    ]) expect(runtime).toContain(token);
    expect(runtime).not.toContain('select * from');
    expect(runtime).not.toContain('dsrDeadlineEnforced');
  });

  it('fails closed on unsafe or incomplete evidence', () => {
    for (const token of ['Complete','exact-SHA','postgresql://','personalDataStored','exportPayloadStored']) {
      expect(validator).toContain(token);
    }
  });
});
