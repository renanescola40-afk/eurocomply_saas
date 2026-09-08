import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflowPath = '.github/workflows/supabase-production-migrations.yml';
const workflow = readFileSync(workflowPath, 'utf8');
const normalized = workflow.toLowerCase();

describe('legacy Supabase production migrations guard', () => {
  it('is manual-only and cannot be triggered by code changes', () => {
    expect(normalized).toContain('workflow_dispatch:');
    expect(normalized).not.toMatch(/\n\s+push:/);
    expect(normalized).not.toMatch(/\n\s+pull_request:/);
  });

  it('requires the exact current main SHA and explicit legacy acknowledgement', () => {
    expect(workflow).toContain('USE_CANONICAL_FORWARD_PROMOTION');
    expect(normalized).toContain('release_sha must be a full lowercase 40-character git sha');
    expect(workflow).toContain('test "$MAIN_SHA" = "$TARGET_SHA"');
    expect(workflow).toContain('test "$(git rev-parse HEAD)" = "$TARGET_SHA"');
  });

  it('never receives database secrets or a protected database environment', () => {
    expect(normalized).not.toContain('environment: production');
    expect(normalized).not.toContain('supabase_db_pooler_url');
    expect(normalized).not.toContain('supabase_project_id');
    expect(normalized).not.toContain('secrets.');
  });

  it('contains no database write or migration execution command', () => {
    expect(normalized).not.toContain('supabase db push');
    expect(normalized).not.toContain('supabase migration repair');
    expect(normalized).not.toContain('db reset');
    expect(normalized).not.toContain('--include-all');
    expect(normalized).not.toContain('apply pending production migrations');
  });

  it('requires the canonical governed production-promotion workflow', () => {
    expect(workflow).toContain(
      '.github/workflows/supabase-forward-reconciliation-production-promotion.yml',
    );
    expect(workflow).toContain('productionWriteAuthorizedByConfig == false');
    expect(workflow).toContain('migrationHistoryRepairAllowed == false');
    expect(workflow).toContain('unrestrictedDbPushAllowed == false');
    expect(workflow).toContain('onlyListedForwardMigrationsMayBeRehearsedOrRequested == true');
    expect(workflow).toContain('Verify rehearsal dry-run and human decision provenance');
    expect(workflow).toContain('Execute final filtered dry run immediately before promotion');
    expect(workflow).toContain(
      'Revalidate current main, bounded S3 and human approval immediately before production write',
    );
    expect(workflow).toContain('Apply only the filtered selected migration set');
  });

  it('fails closed so a green legacy run can never be mistaken for a production promotion', () => {
    expect(normalized).toContain('block legacy production write path');
    expect(workflow).toContain('Production write performed: `false`');
    expect(workflow).toContain('Database credentials released: `false`');
    expect(workflow).toMatch(/Legacy Supabase Production Migrations never writes Production/);
    expect(workflow).toMatch(/\n\s+exit 1\n/);
  });

  it('keeps repository permissions read-only', () => {
    expect(normalized).toContain('permissions:\n  contents: read');
    expect(normalized).not.toContain('contents: write');
  });
});
