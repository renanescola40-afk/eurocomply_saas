import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflowPath = '.github/workflows/supabase-migration-absence-closure-evidence.yml';
const workflow = readFileSync(workflowPath, 'utf8');

function stepBody(name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = workflow.match(new RegExp(`- name: ${escaped}\\n([\\s\\S]*?)(?=\\n      - name:|$)`));
  if (!match) throw new Error(`workflow step not found: ${name}`);
  return match[1];
}

describe('Supabase Migration Absence Closure Evidence workflow', () => {
  it('requires exact bounded inputs and explicit confirmation', () => {
    expect(workflow).toContain('target_sha:');
    expect(workflow).toContain('source_sha:');
    expect(workflow).toContain('column_metadata_evidence_run_id:');
    expect(workflow).toContain("test \"$CONFIRMATION\" = 'REFINE_MIGRATION_ABSENCE_CLOSURE_EVIDENCE'");
    expect(workflow).toContain('[[ "$TARGET_SHA" =~ ^[0-9a-fA-F]{40}$ ]]');
    expect(workflow).toContain('[[ "$SOURCE_SHA" =~ ^[0-9a-fA-F]{40}$ ]]');
    expect(workflow).toContain('[[ "$COLUMN_METADATA_EVIDENCE_RUN_ID" =~ ^[0-9]+$ ]]');
  });

  it('binds execution to current main and byte-identical migrations', () => {
    const step = stepBody('Verify exact current main and immutable migrations tree');
    expect(step).toContain('test "$observed_sha" = "$TARGET_SHA"');
    expect(step).toContain('test "$main_sha" = "$TARGET_SHA"');
    expect(step).toContain('source_tree="$(git rev-parse "${SOURCE_SHA}:supabase/migrations")"');
    expect(step).toContain('target_tree="$(git rev-parse "${TARGET_SHA}:supabase/migrations")"');
    expect(step).toContain('test "$source_tree" = "$target_tree"');
    expect(step).toContain('productionWriteAuthorized: false');
    expect(step).toContain('productionWritePerformed: false');
  });

  it('accepts one successful manual unexpired exact-SHA source artifact', () => {
    const step = stepBody('Download exact column metadata evidence');
    expect(step).toContain("test \"$source_conclusion\" = 'success'");
    expect(step).toContain('test "$source_sha" = "$SOURCE_SHA"');
    expect(step).toContain("test \"$source_event\" = 'workflow_dispatch'");
    expect(step).toContain('expired == false');
    expect(step).toContain('test "$artifact_count" = \'1\'');
    expect(step).toContain("report.status !== 'HUMAN_REVIEW_REQUIRED'");
    expect(step).toContain('report.acceptedDecisions !== 0');
    expect(step).toContain("report.columnMetadataRefinement?.status !== 'HUMAN_REVIEW_REQUIRED'");
    expect(step).toContain('report.columnMetadataRefinement?.acceptedDecisions !== 0');
    expect(step).toContain('tree.targetSha !== process.env.SOURCE_SHA');
    expect(step).toContain('tree.migrationsTreeEquivalent !== true');
  });

  it('enforces closure only from an absent parent column and keeps human review', () => {
    const step = stepBody('Enforce non-crediting safety boundary');
    expect(step).toContain("report.absenceClosureRefinement?.status !== 'HUMAN_REVIEW_REQUIRED'");
    expect(step).toContain('report.absenceClosureRefinement?.acceptedDecisions !== 0');
    expect(step).toContain('report.absenceClosureRefinement?.automaticClassificationAllowed');
    expect(step).toContain("operation.evidenceLayer === 'ABSENT_COLUMN_CLOSURE_REFINEMENT'");
    expect(step).toContain("operation.kind !== 'INLINE_COLUMN_TARGET_STATE'");
    expect(step).toContain("operation.expectedState !== 'PRESENT'");
    expect(step).toContain("operation.observedState !== 'ABSENT'");
    expect(step).toContain("operation.closureBasis?.parentKind !== 'COLUMN'");
    expect(step).toContain("operation.closureBasis?.parentObservedState !== 'ABSENT'");
    expect(step).toContain('item.candidate.humanDecisionRequired !== true');
  });

  it('has no database credential, connection, push or history-repair path', () => {
    expect(workflow).not.toMatch(/SUPABASE_DB_(?:POOLER_)?URL/);
    expect(workflow).not.toMatch(/SUPABASE_DB_PASSWORD/);
    expect(workflow).not.toMatch(/postgres(?:ql)?:\/\//);
    expect(workflow).not.toMatch(/\bpsql\b/);
    expect(workflow).not.toMatch(/supabase\s+db\s+(?:push|repair)/);
    expect(workflow).toContain('permissions:\n  contents: read\n  actions: read');
    expect(workflow).toContain('persist-credentials: false');
  });
});
