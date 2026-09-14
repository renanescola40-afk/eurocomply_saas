import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/supabase-forward-production-reattestation.yml', 'utf8');
const verifier = readFileSync('scripts/supabase/verify-forward-production-reattestation.mjs', 'utf8');

function executableMigrationCommands(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('supabase ') || line.startsWith('psql ') || line.startsWith('node '));
}

describe('Supabase production reattestation', () => {
  it('is manual exact-SHA and protected before Production database access', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('release_sha:');
    expect(workflow).toContain('baseline_promotion_run_id:');
    expect(workflow).toContain('recovery_run_id:');
    expect(workflow).toContain('REATTEST ${TARGET_SHA} FROM PROMOTION ${BASELINE_PROMOTION_RUN_ID} WITH RECOVERY ${RECOVERY_RUN_ID}');
    expect(workflow).toContain('GITHUB_ENVIRONMENT_NAME: Production');
    expect(workflow).toContain("REQUIRE_PROTECTED_BRANCHES: 'true'");
    expect(workflow).toContain('environment: Production');
  });

  it('accepts only a successful historical canonical promotion plus current exact-SHA recovery', () => {
    expect(workflow).toContain(".github/workflows/supabase-forward-reconciliation-production-promotion.yml");
    expect(workflow).toContain(".github/workflows/recovery-resilience-proof.yml");
    expect(workflow).toContain("test \"$(jq -r '.conclusion' <<<\"$PROMOTION_JSON\")\" = 'success'");
    expect(workflow).toContain("test \"$(jq -r '.head_sha' <<<\"$RECOVERY_JSON\")\" = \"$TARGET_SHA\"");
    expect(workflow).toContain('recovery <= promotion');
    expect(verifier).toContain('current selected migration bytes differ from baseline promotion');
    expect(verifier).toContain('baseline human approval');
    expect(verifier).toContain('baseline promotion');
  });

  it('performs only fresh read-only live observation and never adds a migration write path', () => {
    const executable = executableMigrationCommands(workflow).join('\n');
    expect(workflow).toContain("--command 'begin transaction read only; select version from supabase_migrations.schema_migrations order by version; rollback;'");
    expect(workflow).toContain("--command 'begin transaction read only;'");
    expect(workflow).toContain("--command 'rollback;'");
    expect(workflow).toContain('assert-live-tenant-isolation-read-only.sql');
    expect(executable).not.toContain(' db push ');
    expect(executable).not.toContain('--include-all');
    expect(executable).not.toContain('migration repair');
    expect(executable).not.toContain('supabase migration');
    expect(executable).not.toContain('apply_migration');
  });

  it('binds current selected bytes to the baseline and refuses ledger drift', () => {
    expect(verifier).toContain('current.changeSet === baseline.changeSet');
    expect(verifier).toContain('JSON.stringify(current.keys) === JSON.stringify(baseline.keys)');
    expect(verifier).toContain('migration drift detected since baseline promotion');
    expect(verifier).toContain('selected migration is absent from live ledger');
    expect(verifier).toContain('backup/restore source migration ledger digest differs from live ledger');
  });

  it('uses the combined forward and cross-tenant postcondition identity', () => {
    expect(workflow).toContain('forward_reconciliation_and_cross_tenant_reference_postconditions_passed');
    expect(verifier).toContain("proof?.postconditions === 'forward_reconciliation_and_cross_tenant_reference_postconditions_passed'");
  });

  it('emits the existing canonical Supabase acceptance schema and artifact name', () => {
    expect(verifier).toContain("schema: 'risck-comply.supabase-forward-production-acceptance.v1'");
    expect(verifier).toContain("evidenceItem: 'supabase-forward-production-acceptance'");
    expect(verifier).toContain("acceptanceMode: 'read_only_reattestation'");
    expect(workflow).toContain('name: supabase-forward-production-acceptance-${{ inputs.release_sha }}');
    expect(verifier).toContain('productionMutationPerformedByReattestation: false');
  });
});
