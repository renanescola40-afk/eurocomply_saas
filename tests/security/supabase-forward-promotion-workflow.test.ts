import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/supabase-forward-reconciliation-production-promotion.yml', 'utf8');
const runbook = readFileSync('docs/runbooks/SUPABASE_FORWARD_RECONCILIATION.md', 'utf8');

function executableDbPushLines(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('supabase ') && line.includes(' db push '));
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

  it('binds selected bytes and verifies the post-write ledger plus live security postconditions', () => {
    expect(workflow).toContain('sha256sum "$source_path"');
    expect(workflow).toContain('selectionDigest');
    expect(workflow).toContain('verify-forward-promotion-transition.mjs');
    expect(workflow).toContain('verify-forward-reconciliation-postconditions.sql');
    expect(workflow).toContain('remoteAfterEqualsBeforePlusSelected');
    expect(workflow).toContain('unauthorizedMigrationApplied == false');
    expect(workflow).toContain('containsSensitiveValues');
  });

  it('documents the human-approved production boundary rather than automatic promotion', () => {
    expect(runbook).toContain('## Production boundary');
    expect(runbook).toContain('explicit human approval/confirmation');
  });
});
