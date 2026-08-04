import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflowPath = '.github/workflows/supabase-migration-object-evidence.yml';
const workflow = readFileSync(workflowPath, 'utf8');
const normalized = workflow.toLowerCase();
const jobHeader = workflow.slice(0, workflow.indexOf('\n    steps:'));

describe('Supabase migration object evidence workflow', () => {
  it('is manual-only and binds both source artifacts to exact current main SHA', () => {
    expect(normalized).toContain('workflow_dispatch:');
    expect(normalized).not.toMatch(/\n\s+push:/);
    expect(normalized).not.toMatch(/\n\s+pull_request:/);
    expect(normalized).toContain('target_sha:');
    expect(normalized).toContain('dry_run_id:');
    expect(normalized).toContain('schema_evidence_run_id:');
    expect(workflow).toContain("test \"$CONFIRMATION\" = 'BUILD_MIGRATION_OBJECT_EVIDENCE'");
    expect(workflow).toContain('test "$observed_sha" = "$TARGET_SHA"');
    expect(workflow).toContain('test "$main_sha" = "$TARGET_SHA"');
    expect(workflow).toContain('test "$dry_sha" = "$TARGET_SHA"');
    expect(workflow).toContain('test "$schema_sha" = "$TARGET_SHA"');
  });

  it('uses the protected reconciliation environment without database credentials', () => {
    expect(jobHeader).toContain('environment: production-migration-reconciliation');
    expect(jobHeader).not.toContain('${{ secrets.');
    expect(normalized).not.toContain('supabase_db_pooler_url');
    expect(normalized).not.toContain('supabase_db_password');
    expect(normalized).not.toContain('service_role');
  });

  it('requires exact unexpired artifact names and validates schema digest', () => {
    expect(workflow).toContain('supabase-production-migration-dry-run-${TARGET_SHA}');
    expect(workflow).toContain('supabase-production-schema-evidence-${TARGET_SHA}');
    expect(workflow).toContain('.expired == false');
    expect(workflow).toContain('expected_catalog_sha="$(cut -d\' \' -f1 artifacts/source/schema/SHA256SUMS)"');
    expect(workflow).toContain('actual_catalog_sha="$(sha256sum artifacts/source/schema/catalog.txt | cut -d\' \' -f1)"');
    expect(workflow).toContain('test "$actual_catalog_sha" = "$expected_catalog_sha"');
    expect(workflow).toContain("grep -q '^catalog_capability|persistent_object_grants_v1$'");
    expect(workflow).toContain('migration-reconciliation-inventory.json');
    expect(workflow).toContain('catalog.txt');
  });

  it('generates candidates but never accepts decisions or performs database writes', () => {
    expect(workflow).toContain('build-migration-object-evidence.mjs');
    expect(normalized).toContain("report.status !== 'human_review_required'");
    expect(normalized).toContain('report.accepteddecisions !== 0');
    expect(normalized).toContain('report.safety.automaticclassificationallowed');
    expect(normalized).toContain('candidate.humandecisionrequired !== true');
    expect(normalized).not.toContain('supabase db push');
    expect(normalized).not.toContain('migration repair');
    expect(normalized).not.toContain('psql ');
  });

  it('runs focused tests and retains immutable evidence batches', () => {
    expect(workflow).toContain('node --test scripts/supabase/build-migration-object-evidence.test.mjs');
    expect(workflow).toContain('supabase-migration-object-evidence-workflow.test.ts');
    expect(workflow).toContain('supabase-migration-object-evidence-${{ env.TARGET_SHA }}');
    expect(workflow).toContain('retention-days: 90');
    expect(workflow).toContain('if-no-files-found: error');
  });

  it('uses least-privilege repository permissions', () => {
    expect(normalized).toContain('permissions:\n  contents: read\n  actions: read');
    expect(normalized).not.toContain('contents: write');
  });
});
