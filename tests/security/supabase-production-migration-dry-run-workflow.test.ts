import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflowPath = '.github/workflows/supabase-production-migration-dry-run.yml';
const workflow = readFileSync(workflowPath, 'utf8');
const normalized = workflow.toLowerCase();
const jobHeader = workflow.slice(0, workflow.indexOf('\n    steps:'));

describe('Supabase production migration dry-run workflow', () => {
  it('is manual-only, exact-SHA bound and supports an explicit bounded mode', () => {
    expect(normalized).toContain('workflow_dispatch:');
    expect(normalized).not.toMatch(/\n\s+push:/);
    expect(normalized).not.toMatch(/\n\s+pull_request:/);
    expect(workflow).toContain('release_sha:');
    expect(workflow).toContain('confirmation:');
    expect(workflow).toContain('rehearsal_run_id:');
    expect(workflow).toContain('forward_dry_run_run_id:');
    expect(workflow).toContain("if [ \"$CONFIRMATION\" != 'DRY_RUN_ONLY' ]; then");
    expect(workflow).toContain('rehearsal_run_id and forward_dry_run_run_id must be supplied together');
    expect(workflow).toContain("BOUNDED_FORWARD='true'");
    expect(normalized).toContain('release_sha must be a full 40-character git sha');
  });

  it('binds execution to the exact current main SHA before dependency installation', () => {
    expect(normalized).toContain('check out exact release sha');
    expect(normalized).toContain('verify exact current main checkout');
    expect(workflow).toContain('if [ "$OBSERVED_SHA" != "$TARGET_SHA" ]; then');
    expect(workflow).toContain('elif [ "$MAIN_SHA" != "$TARGET_SHA" ]; then');
    expect(workflow).toContain('echo "Re-run the workflow with release_sha=$MAIN_SHA" >&2');

    const verifyIndex = normalized.indexOf('verify exact current main checkout');
    const setupIndex = normalized.indexOf('setup node.js');
    expect(verifyIndex).toBeGreaterThan(-1);
    expect(verifyIndex).toBeLessThan(setupIndex);
  });

  it('uses the protected environment, canonical pooler and current pinned CLI', () => {
    expect(jobHeader).toContain('environment: supabase-production-migration-dry-run');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('actions: read');
    expect(workflow).toContain("SUPABASE_CLI_VERSION: '2.114.0'");
    expect(workflow).toContain('version: ${{ env.SUPABASE_CLI_VERSION }}');
    expect(workflow).toContain('SUPABASE_DB_POOLER_URL: ${{ secrets.SUPABASE_DB_POOLER_URL }}');
    expect(workflow).toContain('SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_POOLER_URL }}');
    expect(workflow).toContain('SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}');
    expect(workflow).not.toContain('secrets.SUPABASE_DB_URL');
    expect(workflow).not.toContain('SUPABASE_DB_PASSWORD');
    expect(workflow).not.toContain('supabase link');
  });

  it('requires successful exact-SHA S1 and S2 provenance before bounded mode', () => {
    expect(workflow).toContain(".github/workflows/supabase-forward-reconciliation-rehearsal.yml");
    expect(workflow).toContain(".github/workflows/supabase-forward-reconciliation-dry-run.yml");
    expect(workflow).toContain('test "$(jq -r \'.conclusion\' <<<"$REHEARSAL_JSON")" = \'success\'');
    expect(workflow).toContain('test "$(jq -r \'.conclusion\' <<<"$FORWARD_JSON")" = \'success\'');
    expect(workflow).toContain('supabase-forward-reconciliation-rehearsal-${TARGET_SHA}');
    expect(workflow).toContain('supabase-forward-reconciliation-dry-run-${TARGET_SHA}');
  });

  it('recompiles the immutable manifest and validates S1/S2 evidence digests', () => {
    expect(workflow).toContain('forward-reconciliation-control-plane.mjs compile');
    expect(workflow).toContain('forward-reconciliation-control-plane.mjs validate-rehearsal');
    expect(workflow).toContain("CURRENT_DIGEST=\"$(jq -r '.selectionDigest' \"$CURRENT_MANIFEST\")\"");
    expect(workflow).toContain('.checks.allSelectedVersionsAfterRemoteHead == true');
    expect(workflow).toContain('.checks.pendingSetEqualsSelectedSet == true');
    expect(workflow).toContain('.checks.unauthorizedPendingMigrations == false');
  });

  it('keeps the historical inventory read-only while not requiring global deployability in bounded mode', () => {
    expect(workflow).toContain('AUDIT_ARGS=()');
    expect(workflow).toContain("if [ \"$BOUNDED_FORWARD\" != 'true' ]; then");
    expect(workflow).toContain('AUDIT_ARGS+=(--require-deployable)');
    expect(workflow).toContain('migration-reconciliation-inventory.json');
    expect(workflow).toContain('Unknown remote-only migration drift blocks every dry-run mode.');
    expect(workflow).toContain('Package status: HUMAN_REVIEW_REQUIRED; accepted decisions remain zero');
  });

  it('re-observes production and builds a workdir containing only remote history plus exact selected bytes', () => {
    expect(workflow).toContain('Build fresh bounded workdir from current production history');
    expect(workflow).toContain('supabase --workdir "$WORKDIR" migration fetch --db-url "$DB_URL"');
    expect(workflow).toContain("select version from supabase_migrations.schema_migrations order by version;");
    expect(workflow).toContain('observed_digest="$(sha256sum "$source_path" | awk \'{print $1}\')"');
    expect(workflow).toContain('test "$observed_digest" = "$expected_digest"');
    expect(workflow).toContain('forward-reconciliation-control-plane.mjs verify-set');
    expect(workflow).toContain('verify-forward-version-order.mjs');
  });

  it('contains only dry-run db push commands and the bounded command uses the filtered workdir', () => {
    const pushLines = workflow
      .split('\n')
      .filter((line) => line.trim().startsWith('supabase ') && line.includes(' db push '));

    expect(pushLines).toHaveLength(2);
    for (const line of pushLines) expect(line).toContain('--dry-run');
    expect(pushLines.some((line) => line.includes('--workdir "$WORKDIR"'))).toBe(true);
    expect(normalized).not.toContain('--include-all');
    expect(normalized).not.toContain('migration repair --');
    expect(normalized).not.toContain('--yes');
  });

  it('seals a non-authorizing bounded Production dry-run attestation', () => {
    expect(workflow).toContain('bounded-production-dry-run-attestation.json');
    expect(workflow).toContain("--arg mode 'BOUNDED_FORWARD_DECISION'");
    expect(workflow).toContain('filteredDbPushDryRunOnly: true');
    expect(workflow).toContain('includeAllUsed: false');
    expect(workflow).toContain('migrationHistoryRepairUsed: false');
    expect(workflow).toContain('productionWriteAuthorized: false');
    expect(workflow).toContain('productionWritePerformed: false');
    expect(workflow).toContain('Revalidate current main after remote observation');
  });

  it('protects connection material and retains diagnostics even on failure', () => {
    expect(workflow).toContain('--write-file "$SUPABASE_DB_URL_FILE"');
    expect(workflow).toContain('test "$(stat -c \'%a\' "$SUPABASE_DB_URL_FILE")" = \'600\'');
    expect(workflow).toContain('rm -f "${SUPABASE_DB_URL_FILE:-}"');
    expect(normalized).toContain('if: always()');
    expect(normalized).toContain('request-validation.json');
    expect(normalized).toContain('exact-main-sha-validation.json');
    expect(normalized).toContain('connection-diagnostics.json');
    expect(normalized).toContain('migration-state-remote.txt');
    expect(normalized).toContain('db-push-dry-run.txt');
    expect(normalized).toContain('production writes: not authorised and not executed');
    expect(normalized).toContain('if-no-files-found: error');
  });
});
