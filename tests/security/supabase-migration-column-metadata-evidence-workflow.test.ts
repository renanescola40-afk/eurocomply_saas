import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflowPath = '.github/workflows/supabase-migration-column-metadata-evidence.yml';
const workflow = readFileSync(workflowPath, 'utf8');

function stepBody(name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = workflow.match(new RegExp(`- name: ${escaped}\\n([\\s\\S]*?)(?=\\n      - name:|$)`));
  if (!match) throw new Error(`workflow step not found: ${name}`);
  return match[1];
}

describe('Supabase Migration Column Metadata Evidence workflow', () => {
  it('requires exact bounded dispatch inputs and confirmation', () => {
    expect(workflow).toContain('target_sha:');
    expect(workflow).toContain('source_sha:');
    expect(workflow).toContain('semantic_evidence_run_id:');
    expect(workflow).toContain('schema_evidence_run_id:');
    expect(workflow).toContain("test \"$CONFIRMATION\" = 'REFINE_MIGRATION_COLUMN_METADATA_EVIDENCE'");
    expect(workflow).toContain('[[ "$TARGET_SHA" =~ ^[0-9a-fA-F]{40}$ ]]');
    expect(workflow).toContain('[[ "$SOURCE_SHA" =~ ^[0-9a-fA-F]{40}$ ]]');
  });

  it('binds execution to current main and an immutable migrations tree', () => {
    const step = stepBody('Verify exact current main and immutable migrations tree');
    expect(step).toContain('test "$observed_sha" = "$TARGET_SHA"');
    expect(step).toContain('test "$main_sha" = "$TARGET_SHA"');
    expect(step).toContain('source_tree="$(git rev-parse "${SOURCE_SHA}:supabase/migrations")"');
    expect(step).toContain('target_tree="$(git rev-parse "${TARGET_SHA}:supabase/migrations")"');
    expect(step).toContain('test "$source_tree" = "$target_tree"');
    expect(step).toContain('productionWriteAuthorized: false');
    expect(step).toContain('productionWritePerformed: false');
  });

  it('accepts only successful manual unexpired artifacts with exact SHA provenance', () => {
    const step = stepBody('Download exact semantic and enriched schema evidence');
    expect(step).toContain("test \"$semantic_conclusion\" = 'success'");
    expect(step).toContain('test "$semantic_sha" = "$SOURCE_SHA"');
    expect(step).toContain("test \"$semantic_event\" = 'workflow_dispatch'");
    expect(step).toContain('expired == false');
    expect(step).toContain('test "$semantic_count" = \'1\'');
    expect(step).toContain("test \"$schema_conclusion\" = 'success'");
    expect(step).toContain('test "$schema_sha" = "$TARGET_SHA"');
    expect(step).toContain("test \"$schema_event\" = 'workflow_dispatch'");
    expect(step).toContain('test "$schema_count" = \'1\'');
    expect(step).toContain('actual_catalog_sha');
    expect(step).toContain('test "$actual_catalog_sha" = "$expected_catalog_sha"');
  });

  it('requires safely encoded enriched column and constraint metadata', () => {
    const download = stepBody('Download exact semantic and enriched schema evidence');
    const enforce = stepBody('Enforce non-crediting safety boundary');
    expect(download).toContain("grep -Eq '^column_meta_hex\\|[0-9a-fA-F]+$'");
    expect(download).toContain("grep -Eq '^constraint_meta_hex\\|[0-9a-fA-F]+$'");
    expect(download).not.toMatch(/grep -q '\^column\|/);
    expect(download).toContain("report.status !== 'HUMAN_REVIEW_REQUIRED'");
    expect(download).toContain('report.acceptedDecisions !== 0');
    expect(download).toContain("report.semanticRefinement?.status !== 'HUMAN_REVIEW_REQUIRED'");
    expect(enforce).toContain("report.columnMetadataRefinement.status !== 'HUMAN_REVIEW_REQUIRED'");
    expect(enforce).toContain('report.columnMetadataRefinement.acceptedDecisions !== 0');
    expect(enforce).toContain('report.columnMetadataRefinement.automaticClassificationAllowed');
    expect(enforce).toContain('item.candidate.humanDecisionRequired !== true');
  });

  it('has no database credential or write path', () => {
    expect(workflow).not.toMatch(/SUPABASE_DB_(?:POOLER_)?URL/);
    expect(workflow).not.toMatch(/SUPABASE_DB_PASSWORD/);
    expect(workflow).not.toMatch(/\bpsql\b/);
    expect(workflow).not.toMatch(/supabase\s+db\s+(?:push|repair)/);
    expect(workflow).not.toMatch(/postgres(?:ql)?:\/\//);
    expect(workflow).toContain('permissions:\n  contents: read\n  actions: read');
    expect(workflow).toContain('persist-credentials: false');
  });
});
