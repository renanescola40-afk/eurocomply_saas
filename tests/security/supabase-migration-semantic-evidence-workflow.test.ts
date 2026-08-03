import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflowPath = '.github/workflows/supabase-migration-semantic-evidence.yml';
const workflow = readFileSync(workflowPath, 'utf8');
const normalized = workflow.toLowerCase();
const jobHeader = workflow.slice(0, workflow.indexOf('\n    steps:'));

describe('Supabase migration semantic evidence workflow', () => {
  it('is manual-only and requires all exact evidence inputs', () => {
    expect(normalized).toContain('workflow_dispatch:');
    expect(normalized).not.toMatch(/\n\s+push:/);
    expect(normalized).not.toMatch(/\n\s+pull_request:/);
    expect(normalized).toContain('target_sha:');
    expect(normalized).toContain('source_sha:');
    expect(normalized).toContain('object_evidence_run_id:');
    expect(normalized).toContain('schema_evidence_run_id:');
    expect(workflow).toContain(
      "test \"$CONFIRMATION\" = 'REFINE_MIGRATION_SEMANTIC_EVIDENCE'",
    );
  });

  it('binds execution to exact current main and an identical migrations tree', () => {
    expect(workflow).toContain('test "$observed_sha" = "$TARGET_SHA"');
    expect(workflow).toContain('test "$main_sha" = "$TARGET_SHA"');
    expect(workflow).toContain(
      'source_tree="$(git rev-parse "${SOURCE_SHA}:supabase/migrations")"',
    );
    expect(workflow).toContain(
      'target_tree="$(git rev-parse "${TARGET_SHA}:supabase/migrations")"',
    );
    expect(workflow).toContain('test "$source_tree" = "$target_tree"');
    expect(normalized).toContain('migrations-tree-equivalence.json');
    expect(normalized).toContain('migrationsTreeEquivalent: true'.toLowerCase());
  });

  it('accepts only exact successful unexpired source artifacts', () => {
    expect(workflow).toContain('test "$object_conclusion" = \'success\'');
    expect(workflow).toContain('test "$schema_conclusion" = \'success\'');
    expect(workflow).toContain('test "$object_sha" = "$SOURCE_SHA"');
    expect(workflow).toContain('test "$schema_sha" = "$SOURCE_SHA"');
    expect(workflow).toContain('test "$object_event" = \'workflow_dispatch\'');
    expect(workflow).toContain('test "$schema_event" = \'workflow_dispatch\'');
    expect(workflow).toContain('supabase-migration-object-evidence-${SOURCE_SHA}');
    expect(workflow).toContain('supabase-production-schema-evidence-${SOURCE_SHA}');
    expect(workflow).toContain('.expired == false');
    expect(workflow).toContain('test "$actual_catalog_sha" = "$expected_catalog_sha"');
    expect(workflow).toContain(
      'report.source.catalogSha256 !== process.env.EXPECTED_CATALOG_SHA',
    );
  });

  it('uses no database credentials and performs no database operation', () => {
    expect(jobHeader).toContain('environment: production-migration-reconciliation');
    expect(jobHeader).not.toContain('${{ secrets.');
    expect(normalized).not.toContain('supabase_db_pooler_url');
    expect(normalized).not.toContain('supabase_db_password');
    expect(normalized).not.toContain('service_role');
    expect(normalized).not.toContain('supabase db push');
    expect(normalized).not.toContain('psql ');
  });

  it('keeps all output non-crediting and review-gated', () => {
    expect(normalized).toContain('refine-migration-semantic-evidence.mjs');
    expect(normalized).toContain("report.status !== 'human_review_required'");
    expect(normalized).toContain('report.accepteddecisions !== 0');
    expect(normalized).toContain(
      "report.semanticrefinement.status !== 'human_review_required'",
    );
    expect(normalized).toContain('report.semanticrefinement.accepteddecisions !== 0');
    expect(normalized).toContain('report.semanticrefinement.automaticclassificationallowed');
    expect(normalized).toContain('candidate.humandecisionrequired !== true');
  });

  it('runs focused tests and retains immutable output', () => {
    expect(workflow).toContain(
      'node --test scripts/supabase/refine-migration-semantic-evidence.test.mjs',
    );
    expect(workflow).toContain(
      'supabase-migration-semantic-evidence-workflow.test.ts',
    );
    expect(workflow).toContain(
      'supabase-migration-semantic-evidence-${{ env.TARGET_SHA }}-from-${{ env.SOURCE_SHA }}',
    );
    expect(normalized).toContain('if-no-files-found: error');
    expect(normalized).toContain('retention-days: 90');
  });

  it('uses least-privilege repository permissions', () => {
    expect(normalized).toContain('permissions:\n  contents: read\n  actions: read');
    expect(normalized).not.toContain('contents: write');
  });
});
