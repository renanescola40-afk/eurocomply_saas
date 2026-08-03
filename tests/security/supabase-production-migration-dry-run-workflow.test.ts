import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflowPath =
  '.github/workflows/supabase-production-migration-dry-run.yml';
const workflow = readFileSync(workflowPath, 'utf8');
const normalized = workflow.toLowerCase();
const jobHeader = workflow.slice(0, workflow.indexOf('\n    steps:'));

describe('Supabase production migration dry-run workflow', () => {
  it('is manual-only and requires exact SHA plus safely handled confirmation', () => {
    expect(normalized).toContain('workflow_dispatch:');
    expect(normalized).not.toMatch(/\n\s+push:/);
    expect(normalized).not.toMatch(/\n\s+pull_request:/);
    expect(normalized).toContain('release_sha:');
    expect(normalized).toContain('confirmation:');
    expect(workflow).toContain('CONFIRMATION: ${{ inputs.confirmation }}');
    expect(workflow).toContain(
      'if [ "$CONFIRMATION" != \'DRY_RUN_ONLY\' ]; then',
    );
    expect(workflow).not.toContain("test '${{ inputs.confirmation }}'");
    expect(normalized).toContain('release_sha must be a full 40-character git sha');
    expect(normalized).toContain('request-validation.json');
  });

  it('binds execution to the exact current main SHA and retains mismatch diagnostics', () => {
    expect(normalized).toContain('check out exact release sha');
    expect(normalized).toContain('initialize exact-sha diagnostic artifact');
    expect(normalized).toContain('verify exact current main checkout');
    expect(workflow).toContain('if [ "$OBSERVED_SHA" != "$TARGET_SHA" ]; then');
    expect(workflow).toContain('elif [ "$MAIN_SHA" != "$TARGET_SHA" ]; then');
    expect(normalized).toContain('/commits/main');
    expect(normalized).toContain('exact-main-sha-validation.json');
    expect(normalized).toContain(
      'requested release sha is stale because main has advanced',
    );
    expect(workflow).toContain(
      'echo "Re-run the workflow with release_sha=$MAIN_SHA" >&2',
    );
    expect(normalized).toContain('requestedsha: $requestedsha');
    expect(normalized).toContain('observedcheckoutsha: $observedsha');
    expect(normalized).toContain('currentmainsha:');
  });

  it('fails stale SHA requests before dependency installation', () => {
    const checkoutIndex = normalized.indexOf('check out exact release sha');
    const initializeIndex = normalized.indexOf(
      'initialize exact-sha diagnostic artifact',
    );
    const verifyIndex = normalized.indexOf('verify exact current main checkout');
    const setupNodeIndex = normalized.indexOf('setup node.js');
    const npmCiIndex = normalized.indexOf('npm ci --ignore-scripts');

    expect(checkoutIndex).toBeGreaterThan(-1);
    expect(checkoutIndex).toBeLessThan(initializeIndex);
    expect(initializeIndex).toBeLessThan(verifyIndex);
    expect(verifyIndex).toBeLessThan(setupNodeIndex);
    expect(setupNodeIndex).toBeLessThan(npmCiIndex);
  });

  it('uses a concrete Supabase CLI version and verifies the installed binary', () => {
    expect(workflow).toContain("SUPABASE_CLI_VERSION: '2.101.0'");
    expect(workflow).toContain('version: ${{ env.SUPABASE_CLI_VERSION }}');
    expect(workflow).toContain(
      'test "$(supabase --version)" = "$SUPABASE_CLI_VERSION"',
    );
    expect(normalized).not.toContain('version: latest');
  });

  it('uses a dedicated environment and the canonical pooler secret', () => {
    expect(jobHeader).toContain(
      'environment: supabase-production-migration-dry-run',
    );
    expect(jobHeader).not.toContain('${{ secrets.');
    expect(workflow).toContain(
      'SUPABASE_DB_POOLER_URL: ${{ secrets.SUPABASE_DB_POOLER_URL }}',
    );
    expect(workflow).toContain(
      'SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_POOLER_URL }}',
    );
    expect(workflow).toContain(
      'SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}',
    );
    expect(
      workflow.match(/secrets\.SUPABASE_DB_POOLER_URL/g),
    ).toHaveLength(2);
    expect(workflow).not.toContain('secrets.SUPABASE_DB_URL');
    expect(workflow).not.toContain('SUPABASE_DB_PASSWORD');
    expect(workflow).not.toContain('supabase link');
  });

  it('uses one validated endpoint and credential source', () => {
    expect(normalized).toContain('prepare explicit production database connection');
    expect(workflow).toContain(
      'node scripts/supabase/prepare-production-db-connection.mjs',
    );
    expect(normalized).toContain(
      'database endpoint and credential: canonical protected supabase_db_pooler_url',
    );
    expect(normalized).not.toContain('migration list --linked');
    expect(normalized).not.toContain('db push --linked');
  });

  it('prepares an owner-only connection file without exposing the URL', () => {
    expect(normalized).toContain('prepare explicit production database connection');
    expect(workflow).toContain(
      'node scripts/supabase/prepare-production-db-connection.mjs',
    );
    expect(workflow).toContain('--write-file "$SUPABASE_DB_URL_FILE"');
    expect(workflow).toContain(
      'test "$(stat -c \'%a\' "$SUPABASE_DB_URL_FILE")" = \'600\'',
    );
    expect(workflow).toContain('rm -f "${SUPABASE_DB_URL_FILE:-}"');
  });

  it('uses the explicit protected URL for remote history and dry-run only', () => {
    expect(workflow).toContain(
      'supabase migration list --db-url "$DB_URL"',
    );
    expect(workflow).toContain(
      'supabase db push --db-url "$DB_URL" --dry-run',
    );
    expect(normalized).not.toContain('migration list --linked');
    expect(normalized).not.toContain('db push --linked');
  });

  it('retains audit and evidence-write exit codes before generating review packages', () => {
    expect(normalized).toContain('--require-deployable');
    expect(normalized).toContain('audit-migration-drift.test.mjs');
    expect(normalized).toContain(
      'generate-migration-reconciliation-review-packages.test.mjs',
    );
    expect(normalized).toContain('prepare-production-db-connection.test.mjs');
    expect(workflow).toContain('set +e');
    expect(workflow).toContain('PIPELINE_STATUS=("${PIPESTATUS[@]}")');
    expect(workflow).toContain('AUDIT_EXIT="${PIPELINE_STATUS[0]}"');
    expect(workflow).toContain('TEE_EXIT="${PIPELINE_STATUS[1]}"');
    expect(workflow).toContain('set -e');
    expect(workflow).toContain(
      'echo "exit_code=$AUDIT_EXIT" >> "$GITHUB_OUTPUT"',
    );
    expect(workflow).toContain(
      'echo "tee_exit_code=$TEE_EXIT" >> "$GITHUB_OUTPUT"',
    );
    expect(workflow).toContain('if [ "$TEE_EXIT" -ne 0 ]; then');
    expect(workflow).toContain('exit "$TEE_EXIT"');

    const auditStep = normalized.slice(
      normalized.indexOf(
        'evaluate migration deployability and retain blocker status',
      ),
      normalized.indexOf('generate non-crediting reconciliation review packages'),
    );
    expect(auditStep.indexOf('set +e')).toBeLessThan(
      auditStep.indexOf('node scripts/supabase/audit-migration-drift.mjs'),
    );
    expect(auditStep.indexOf('pipeline_status=("${pipestatus[@]}")')).toBeLessThan(
      auditStep.lastIndexOf('set -e'),
    );
    expect(auditStep.indexOf('tee_exit="${pipeline_status[1]}"')).toBeLessThan(
      auditStep.indexOf('if [ "$tee_exit" -ne 0 ]; then'),
    );
    expect(
      normalized.indexOf(
        'evaluate migration deployability and retain blocker status',
      ),
    ).toBeLessThan(
      normalized.indexOf('generate non-crediting reconciliation review packages'),
    );
    expect(
      normalized.indexOf('generate non-crediting reconciliation review packages'),
    ).toBeLessThan(
      normalized.indexOf('enforce migration deployability before dry-run'),
    );
    expect(
      normalized.indexOf('enforce migration deployability before dry-run'),
    ).toBeLessThan(
      normalized.indexOf('execute supabase migration dry-run only'),
    );
  });

  it('keeps generated package status non-crediting', () => {
    expect(normalized).toContain('--batch-size=25');
    expect(normalized).toContain('reconciliation-review-summary.json');
    expect(normalized).toContain('package status: human_review_required');
    expect(normalized).toContain('accepted decisions remain zero');
    expect(normalized).toContain('review packages were retained');
  });

  it('contains only dry-run database push commands', () => {
    const pushLines = workflow
      .split('\n')
      .filter((line) => line.includes('supabase db push'));

    expect(pushLines).toHaveLength(1);
    expect(pushLines[0]).toContain('--dry-run');
    expect(normalized).not.toContain('--include-all');
    expect(normalized).not.toContain('--yes');
  });

  it('never grants write permission to repository contents', () => {
    expect(normalized).toContain('permissions:\n  contents: read');
    expect(normalized).not.toContain('contents: write');
  });

  it('retains diagnostics and review packages even when execution blocks early', () => {
    expect(normalized).toContain('if: always()');
    expect(normalized).toContain(
      'migration_dry_run_artifact_dir: artifacts/supabase-production-migration-dry-run',
    );
    expect(normalized).toContain('request-validation.json');
    expect(normalized).toContain('exact-main-sha-validation.json');
    expect(normalized).toContain('connection-diagnostics.json');
    expect(normalized).toContain('migration-state-remote.txt');
    expect(normalized).toContain('deployability-summary.md');
    expect(normalized).toContain('reconciliation-review');
    expect(normalized).toContain('db-push-dry-run.txt');
    expect(normalized).toContain('production writes: not authorised');
    expect(normalized).toContain('if-no-files-found: error');
  });
});
