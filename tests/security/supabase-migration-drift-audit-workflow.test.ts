import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflowPath = '.github/workflows/supabase-migration-drift-audit.yml';
const workflow = readFileSync(workflowPath, 'utf8');
const normalized = workflow.toLowerCase();
const prJobStart = workflow.indexOf('  pr-contract:');
const liveJobStart = workflow.indexOf('  audit:');
const prJob = workflow.slice(prJobStart, liveJobStart);
const liveJob = workflow.slice(liveJobStart);

describe('Supabase migration drift audit workflow', () => {
  it('runs on its intended triggers with read-only repository permissions', () => {
    expect(normalized).toContain('workflow_dispatch:');
    expect(normalized).toContain('schedule:');
    expect(normalized).toContain('pull_request:');
    expect(normalized).toContain('permissions:\n  contents: read');
    expect(normalized).not.toContain('contents: write');
  });

  it('keeps pull-request validation completely outside the production environment', () => {
    expect(prJob).toContain("if: github.event_name == 'pull_request'");
    expect(prJob).toContain('Validate drift-audit contract without production access');
    expect(prJob).not.toContain('environment: production');
    expect(prJob).not.toContain('${{ secrets.');
    expect(prJob).not.toContain('SUPABASE_DB_POOLER_URL');
    expect(prJob).not.toContain('SUPABASE_PROJECT_ID');
    expect(prJob).not.toContain('supabase migration list');
    expect(prJob).toContain('tests/security/supabase-migration-drift-audit-workflow.test.ts');
    expect(prJob).toContain('No production database secret or connection is available to this job.');
  });

  it('protects live drift inspection behind the production environment', () => {
    expect(liveJob).toContain("if: github.event_name != 'pull_request'");
    expect(liveJob).toContain('environment: production');
    expect(liveJob).toContain(
      'SUPABASE_DB_POOLER_URL: ${{ secrets.SUPABASE_DB_POOLER_URL }}',
    );
    expect(liveJob).toContain(
      'SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_POOLER_URL }}',
    );
    expect(liveJob).toContain(
      'SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}',
    );
    expect(liveJob).toContain(
      'for name in SUPABASE_DB_POOLER_URL SUPABASE_PROJECT_ID; do',
    );
    expect(workflow).not.toContain('secrets.SUPABASE_DB_URL');
    expect(workflow).not.toContain('SUPABASE_DB_PASSWORD');
  });

  it('passes the canonical URL only through live step environment and a mode-600 file', () => {
    const poolerBindings = workflow.match(/secrets\.SUPABASE_DB_POOLER_URL/g);
    expect(poolerBindings).toHaveLength(2);
    expect(workflow).not.toMatch(/--password\s/);
    expect(workflow).not.toMatch(/echo\s+.*SUPABASE_DB_POOLER_URL/i);
    expect(liveJob).toContain(
      'test "$(stat -c \'%a\' "$SUPABASE_DB_URL_FILE")" = \'600\'',
    );
  });

  it('pins the Supabase CLI and avoids linked-project pooler discovery', () => {
    expect(liveJob).toContain("SUPABASE_CLI_VERSION: '2.101.0'");
    expect(liveJob).toContain('version: ${{ env.SUPABASE_CLI_VERSION }}');
    expect(liveJob).toContain('supabase migration list --db-url "$DB_URL"');
    expect(normalized).not.toContain('supabase link');
    expect(normalized).not.toContain('migration list --linked');
    expect(normalized).not.toContain('version: latest');
  });

  it('validates and removes temporary production connection material', () => {
    expect(liveJob).toContain('prepare-production-db-connection.mjs');
    expect(liveJob).toContain('connection-diagnostics.json');
    expect(liveJob).toContain(
      'test "$(stat -c \'%a\' "$SUPABASE_DB_URL_FILE")" = \'600\'',
    );
    expect(liveJob).toContain('rm -f "$SUPABASE_DB_URL_FILE"');
  });

  it('retains live evidence before enforcing drift failure', () => {
    expect(liveJob.indexOf('Generate drift evidence')).toBeLessThan(
      liveJob.indexOf('Upload migration drift evidence'),
    );
    expect(liveJob.indexOf('Upload migration drift evidence')).toBeLessThan(
      liveJob.indexOf('Enforce critical drift gate'),
    );
    expect(liveJob).toContain('if: always()');
    expect(liveJob).toContain('migration-state-remote.txt');
    expect(liveJob).toContain('migration-drift-summary.md');
  });

  it('never executes production mutation commands', () => {
    expect(normalized).not.toContain('supabase db push');
    expect(normalized).not.toContain('supabase db reset');
    expect(normalized).not.toContain('migration repair');
  });
});
