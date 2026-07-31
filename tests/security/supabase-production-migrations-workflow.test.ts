import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflowPath = '.github/workflows/supabase-production-migrations.yml';
const workflow = readFileSync(workflowPath, 'utf8');
const normalized = workflow.toLowerCase();
const jobHeader = workflow.slice(0, workflow.indexOf('\n    steps:'));

describe('Supabase production migrations workflow', () => {
  it('is manual-only and requires exact explicit production authorization', () => {
    expect(normalized).toContain('workflow_dispatch:');
    expect(normalized).not.toMatch(/\n\s+push:/);
    expect(normalized).not.toMatch(/\n\s+pull_request:/);
    expect(workflow).toContain('INPUT_CONFIRMATION: ${{ inputs.confirmation }}');
    expect(workflow).toContain(
      '"APPLY_SUPABASE_MIGRATIONS"',
    );
    expect(normalized).toContain('release_sha must be a full 40-character git sha');
  });

  it('checks out and reverifies the exact current main SHA', () => {
    expect(normalized).toContain('check out exact release sha');
    expect(normalized).toContain('verify exact current main checkout');
    expect(workflow).toContain('test "$OBSERVED_SHA" = "$TARGET_SHA"');
    expect(workflow).toContain('test "$MAIN_SHA" = "$TARGET_SHA"');
    expect(normalized).toContain('reverify main did not move during deployment');
  });

  it('uses a protected environment and no job-wide secrets', () => {
    expect(jobHeader).toContain('environment: production');
    expect(jobHeader).not.toContain('${{ secrets.');
    expect(workflow).toContain(
      'SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}',
    );
    expect(workflow).toContain(
      'SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}',
    );
    expect(workflow).not.toContain('SUPABASE_DB_PASSWORD');
    expect(workflow).not.toContain('supabase link');
  });

  it('pins and verifies the Supabase CLI', () => {
    expect(workflow).toContain("SUPABASE_CLI_VERSION: '2.101.0'");
    expect(workflow).toContain('version: ${{ env.SUPABASE_CLI_VERSION }}');
    expect(workflow).toContain(
      'test "$(supabase --version)" = "$SUPABASE_CLI_VERSION"',
    );
    expect(normalized).not.toContain('version: latest');
  });

  it('uses the validated explicit DB URL for every remote command', () => {
    const migrationListLines = workflow
      .split('\n')
      .filter((line) => line.includes('supabase migration list'));
    const dbPushLines = workflow
      .split('\n')
      .filter((line) => line.includes('supabase db push'));

    expect(migrationListLines).toHaveLength(2);
    expect(migrationListLines.every((line) => line.includes('--db-url "$DB_URL"'))).toBe(true);
    expect(dbPushLines).toHaveLength(2);
    expect(dbPushLines.every((line) => line.includes('--db-url "$DB_URL"'))).toBe(true);
    expect(dbPushLines[0]).toContain('--dry-run');
    expect(dbPushLines[1]).not.toContain('--dry-run');
    expect(normalized).not.toContain('--linked');
  });

  it('previews before applying and verifies history afterwards', () => {
    expect(normalized.indexOf('capture and validate migration history before deployment')).toBeLessThan(
      normalized.indexOf('preview pending production migrations'),
    );
    expect(normalized.indexOf('preview pending production migrations')).toBeLessThan(
      normalized.indexOf('apply pending production migrations'),
    );
    expect(normalized.indexOf('apply pending production migrations')).toBeLessThan(
      normalized.indexOf('verify production migration history after deployment'),
    );
  });

  it('never enables destructive or broad migration flags', () => {
    expect(normalized).not.toContain('db reset');
    expect(normalized).not.toContain('--include-all');
    expect(normalized).not.toContain('migration repair');
    expect(normalized).not.toContain('--yes');
  });

  it('keeps connection material temporary and uploads bounded evidence', () => {
    expect(normalized).toContain('prepare-production-db-connection.mjs');
    expect(normalized).toContain('connection-diagnostics.json');
    expect(workflow).toContain('rm -f "$SUPABASE_DB_URL_FILE"');
    expect(normalized).toContain('upload production migration evidence');
    expect(normalized).toContain('retention-days: 90');
  });

  it('keeps repository permissions read-only', () => {
    expect(normalized).toContain('permissions:\n  contents: read');
    expect(normalized).not.toContain('contents: write');
  });
});
