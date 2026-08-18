import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/supabase-forward-reconciliation-production-promotion.yml', 'utf8');
const verifier = readFileSync('scripts/supabase/verify-forward-promotion-transition.mjs', 'utf8');
const postconditions = readFileSync('scripts/supabase/verify-forward-reconciliation-postconditions.sql', 'utf8');
const runbook = readFileSync('docs/runbooks/SUPABASE_FORWARD_RECONCILIATION.md', 'utf8');

function executableDbPushLines(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('supabase ') && line.includes(' db push '));
}

function jobHeader(text: string, jobName: string) {
  const jobIndex = text.indexOf(`  ${jobName}:`);
  expect(jobIndex).toBeGreaterThanOrEqual(0);
  const stepsIndex = text.indexOf('    steps:', jobIndex);
  expect(stepsIndex).toBeGreaterThan(jobIndex);
  return text.slice(jobIndex, stepsIndex);
}

describe('bounded Supabase production promotion workflow', () => {
  it('requires exact-SHA source proofs, deliberate confirmation and protected Production governance', () => {
    expect(workflow).toContain('rehearsal_run_id:');
    expect(workflow).toContain('dry_run_run_id:');
    expect(workflow).toContain('PROMOTE ${TARGET_SHA} USING DRY-RUN ${DRY_RUN_ID}');
    expect(workflow).toContain('GITHUB_ENVIRONMENT_NAME: Production');
    expect(workflow).toContain("REQUIRE_PROTECTED_BRANCHES: 'true'");
    expect(workflow).toContain('node scripts/security/check-github-environment-governance.mjs');
    expect(workflow).toContain('environment: Production');
    expect(workflow).toContain(".github/workflows/supabase-forward-reconciliation-rehearsal.yml");
    expect(workflow).toContain(".github/workflows/supabase-forward-reconciliation-dry-run.yml");
  });

  it('verifies the hosted PostgreSQL client without a package-network dependency before any protected DB secret is used', () => {
    const verifierIndex = workflow.indexOf('Verify runner PostgreSQL client without network installation');
    const secretValidationIndex = workflow.indexOf('Revalidate exact current main and protected database secret');
    expect(verifierIndex).toBeGreaterThanOrEqual(0);
    expect(secretValidationIndex).toBeGreaterThan(verifierIndex);
    expect(workflow).toContain('node scripts/recovery/verify-postgresql-client.mjs');
    expect(workflow).not.toMatch(/apt-get|apt install|Install PostgreSQL client/);
    expect(jobHeader(workflow, 'promote')).not.toContain('SUPABASE_DB_POOLER_URL');
    expect((workflow.match(/secrets\.SUPABASE_DB_POOLER_URL/g) ?? []).length).toBe(6);
  });

  it('rebuilds the filtered set from current remote history and applies exactly once', () => {
    const pushes = executableDbPushLines(workflow);
    expect(pushes).toEqual([
      'supabase --workdir "$WORKDIR" db push --dry-run --db-url "$SUPABASE_DB_POOLER_URL"',
      'supabase --workdir "$WORKDIR" db push --db-url "$SUPABASE_DB_POOLER_URL"',
    ]);
    expect(workflow).toContain('supabase --workdir "$WORKDIR" migration fetch --db-url "$SUPABASE_DB_POOLER_URL"');
    expect(workflow).toContain('verify-forward-version-order.mjs');
    expect(workflow).toContain('forward-reconciliation-control-plane.mjs verify-set');
    expect(workflow).not.toContain('--include-all');
    expect(workflow).not.toContain('migration repair');
  });

  it('binds selected bytes and verifies the post-write ledger plus all live security postconditions', () => {
    expect(workflow).toContain('sha256sum "$source_path"');
    expect(workflow).toContain('selectionDigest');
    expect(workflow).toContain('verify-forward-promotion-transition.mjs');
    expect(workflow).toContain('verify-forward-reconciliation-postconditions.sql');
    expect(workflow).toContain('remoteAfterEqualsBeforePlusSelected');
    expect(workflow).toContain('unauthorizedMigrationApplied == false');
    expect(verifier).toContain('containsSensitiveValues: false');
    expect(verifier).toContain('databaseUrlsStored: false');
    expect(verifier).toContain('migrationHistoryRepairPerformed: false');
    expect(verifier).toContain('unrestrictedDbPushPerformed: false');
    expect(postconditions).toContain('\\ir ../security/validate-enterprise-integrations-runtime.sql');
    expect(postconditions).toContain('\\ir ../security/validate-enterprise-billing-runtime.sql');
    expect(postconditions).toContain('\\ir ../security/validate-live-rls-inventory-helper-boundary.sql');
  });

  it('documents manual protected promotion and prohibits migration shortcuts', () => {
    expect(runbook).toContain('## Stage 3 — human-approved bounded production promotion');
    expect(runbook).toContain('explicit confirmation `PROMOTE <release_sha> USING DRY-RUN <dry_run_run_id>`');
    expect(runbook).toContain('`db push --include-all`');
    expect(runbook).toContain('migration-history repair');
  });
});
