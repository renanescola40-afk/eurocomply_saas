import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflowPath = '.github/workflows/supabase-migration-drift-audit.yml';
const workflow = readFileSync(workflowPath, 'utf8');
const normalized = workflow.toLowerCase();
const jobHeader = workflow.slice(0, workflow.indexOf('\n    steps:'));

describe('Supabase migration drift audit workflow', () => {
  it('runs on its intended triggers with read-only repository permissions', () => {
    expect(normalized).toContain('workflow_dispatch:');
    expect(normalized).toContain('schedule:');
    expect(normalized).toContain('pull_request:');
    expect(normalized).toContain('permissions:\n  contents: read');
    expect(normalized).not.toContain('contents: write');
  });

  it('uses the protected production environment without job-wide secrets', () => {
    expect(jobHeader).toContain('environment: production');
    expect(jobHeader).not.toContain('${{ secrets.');
    expect(workflow).toContain(
      'SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}',
    );
    expect(workflow).toContain(
      'SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}',
    );
    expect(workflow).toContain(
      'SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}',
    );
    expect(workflow).toContain(
      'for name in SUPABASE_DB_URL SUPABASE_DB_PASSWORD SUPABASE_PROJECT_ID; do',
    );
  });

  it('passes the protected password only through step environment and a mode-600 file', () => {
    const passwordBindings = workflow.match(
      /SUPABASE_DB_PASSWORD: \$\{\{ secrets\.SUPABASE_DB_PASSWORD \}\}/g,
    );
    expect(passwordBindings).toHaveLength(2);
    expect(workflow).not.toMatch(/--password\s/);
    expect(workflow).not.toMatch(/echo\s+.*SUPABASE_DB_PASSWORD/i);
    expect(workflow).toContain(
      'test "$(stat -c \'%a\' "$SUPABASE_DB_URL_FILE")" = \'600\'',
    );
  });

  it('pins the Supabase CLI and avoids linked-project pooler discovery', () => {
    expect(workflow).toContain("SUPABASE_CLI_VERSION: '2.101.0'");
    expect(workflow).toContain('version: ${{ env.SUPABASE_CLI_VERSION }}');
    expect(workflow).toContain(
      'supabase migration list --db-url "$DB_URL"',
    );
    expect(normalized).not.toContain('supabase link');
    expect(normalized).not.toContain('migration list --linked');
    expect(normalized).not.toContain('version: latest');
  });

  it('validates and removes the temporary connection material', () => {
    expect(normalized).toContain('prepare-production-db-connection.mjs');
    expect(normalized).toContain('connection-diagnostics.json');
    expect(workflow).toContain(
      'test "$(stat -c \'%a\' "$SUPABASE_DB_URL_FILE")" = \'600\'',
    );
    expect(workflow).toContain('rm -f "$SUPABASE_DB_URL_FILE"');
  });

  it('retains evidence before enforcing drift failure', () => {
    expect(normalized.indexOf('generate drift evidence')).toBeLessThan(
      normalized.indexOf('upload migration drift evidence'),
    );
    expect(normalized.indexOf('upload migration drift evidence')).toBeLessThan(
      normalized.indexOf('enforce critical drift gate'),
    );
    expect(normalized).toContain('if: always()');
    expect(normalized).toContain('migration-state-remote.txt');
    expect(normalized).toContain('migration-drift-summary.md');
  });

  it('never executes production mutation commands', () => {
    expect(normalized).not.toContain('supabase db push');
    expect(normalized).not.toContain('supabase db reset');
    expect(normalized).not.toContain('migration repair');
  });
});
