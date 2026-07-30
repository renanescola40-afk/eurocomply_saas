import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflowPath =
  '.github/workflows/supabase-production-migration-dry-run.yml';
const workflow = readFileSync(workflowPath, 'utf8');
const normalized = workflow.toLowerCase();

describe('Supabase production migration dry-run workflow', () => {
  it('is manual-only and requires exact SHA plus explicit dry-run confirmation', () => {
    expect(normalized).toContain('workflow_dispatch:');
    expect(normalized).not.toMatch(/\n\s+push:/);
    expect(normalized).not.toMatch(/\n\s+pull_request:/);
    expect(normalized).toContain('release_sha:');
    expect(normalized).toContain('confirmation:');
    expect(workflow).toContain("test '${{ inputs.confirmation }}' = 'DRY_RUN_ONLY'");
    expect(normalized).toContain('release_sha must be a full 40-character git sha');
  });

  it('binds execution to the exact current main SHA', () => {
    expect(normalized).toContain('check out exact release sha');
    expect(normalized).toContain('verify exact current main checkout');
    expect(workflow).toContain('test "$OBSERVED_SHA" = "$TARGET_SHA"');
    expect(workflow).toContain('test "$MAIN_SHA" = "$TARGET_SHA"');
    expect(normalized).toContain('/commits/main');
  });

  it('requires a strict deployability audit before any dry-run', () => {
    expect(normalized).toContain('--require-deployable');
    expect(normalized).toContain('audit-migration-drift.test.mjs');
    expect(normalized.indexOf('require deployable migration history before dry-run')).toBeLessThan(
      normalized.indexOf('execute supabase migration dry-run only'),
    );
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

  it('retains diagnostics even when deployability is blocked', () => {
    expect(normalized).toContain('if: always()');
    expect(normalized).toContain('migration-state-remote.txt');
    expect(normalized).toContain('deployability-summary.md');
    expect(normalized).toContain('db-push-dry-run.txt');
    expect(normalized).toContain('production writes: not authorised');
  });
});
