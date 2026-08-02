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
    expect(workflow).toContain('test "$CONFIRMATION" = \'DRY_RUN_ONLY\'');
    expect(workflow).not.toContain("test '${{ inputs.confirmation }}'");
    expect(normalized).toContain('release_sha must be a full 40-character git sha');
  });

  it('binds execution to the exact current main SHA', () => {
    expect(normalized).toContain('check out exact release sha');
    expect(normalized).toContain('verify exact current main checkout');
    expect(workflow).toContain('test "$OBSERVED_SHA" = "$TARGET_SHA"');
    expect(workflow).toContain('test "$MAIN_SHA" = "$TARGET_SHA"');
    expect(normalized).toContain('/commits/main');
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
    expect(workflow).toContain('rm -f "$SUPABASE_DB_URL_FILE"');
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

  it('retains the strict audit exit code and generates review packages before enforcing it', () => {
    expect(normalized).toContain('--require-deployable');
    expect(normalized).toContain('audit-migration-drift.test.mjs');
    expect(normalized).toContain(
      'generate-migration-reconciliation-review-packages.test.mjs',
    );
    expect(normalized).toContain('prepare-production-db-connection.test.mjs');
    expect(workflow).toContain('AUDIT_EXIT="${PIPESTATUS[0]}"');
    expect(workflow).toContain(
      'echo "exit_code=$AUDIT_EXIT" >> "$GITHUB_OUTPUT"',
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

  it('retains diagnostics and review packages even when deployability is blocked', () => {
    expect(normalized).toContain('if: always()');
    expect(normalized).toContain('connection-diagnostics.json');
    expect(normalized).toContain('migration-state-remote.txt');
    expect(normalized).toContain('deployability-summary.md');
    expect(normalized).toContain('reconciliation-review');
    expect(normalized).toContain('db-push-dry-run.txt');
    expect(normalized).toContain('production writes: not authorised');
  });
});
