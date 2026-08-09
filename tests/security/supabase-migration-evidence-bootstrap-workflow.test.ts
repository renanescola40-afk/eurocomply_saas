import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflowPath = resolve('.github/workflows/supabase-migration-evidence-bootstrap.yml');
const workflow = readFileSync(workflowPath, 'utf8');

describe('Supabase migration evidence bootstrap workflow', () => {
  it('runs the bootstrap only outside pull_request validation', () => {
    expect(workflow).toContain("if: github.event_name != 'pull_request'");
    expect(workflow).toContain('branches: [main]');
  });

  it('ignores canonical evidence-only commits so the subject SHA is preserved', () => {
    expect(workflow).toContain('paths-ignore:');
    expect(workflow).toContain('docs/security/evidence/runtime/supabase-migration-reconciliation-decisions.json');
    expect(workflow).toContain('docs/security/evidence/accepted/supabase-staging-rehearsal-result.json');
    expect(workflow).toContain('docs/security/evidence/accepted/supabase-bounded-production-change-request.json');
  });

  it('grants Actions write only to the bootstrap job', () => {
    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).toContain('permissions:\n      contents: read\n      actions: write');
  });

  it('dispatches only the read-only evidence workflows', () => {
    for (const child of [
      'supabase-migration-drift-audit.yml',
      'supabase-production-migration-dry-run.yml',
      'supabase-live-schema-evidence.yml',
      'supabase-migration-review-dossiers.yml',
      'supabase-migration-reconciliation-decision-gate.yml',
    ]) {
      expect(workflow).toContain(child);
    }

    expect(workflow).not.toContain("STAGING_WORKFLOW='supabase-staging-rehearsal.yml'");
    expect(workflow).not.toContain("PRODUCTION_WORKFLOW='supabase-bounded-production-change.yml'");
  });

  it('cannot write to Supabase directly', () => {
    expect(workflow).not.toContain('supabase db push');
    expect(workflow).not.toContain('psql ');
    expect(workflow).not.toContain('secrets.SUPABASE');
    expect(workflow).toContain('confirmation=DRY_RUN_ONLY');
  });

  it('returns only a machine-readable child run id from dispatch helpers', () => {
    expect(workflow).toContain('gh workflow run "$workflow" --repo "$GITHUB_REPOSITORY" --ref main "$@" >/dev/null');
    expect(workflow).toContain('[[ "$DRIFT_RUN_ID" =~ ^[0-9]+$ ]]');
    expect(workflow).toContain('[[ "$DRY_RUN_ID" =~ ^[0-9]+$ ]]');
    expect(workflow).toContain('[[ "$SCHEMA_RUN_ID" =~ ^[0-9]+$ ]]');
    expect(workflow).toContain('[[ "$DOSSIER_RUN_ID" =~ ^[0-9]+$ ]]');
    expect(workflow).toContain('[[ "$DECISION_RUN_ID" =~ ^[0-9]+$ ]]');
  });

  it('fails fast on malformed run ids and GitHub API failures', () => {
    expect(workflow).toContain('Invalid workflow run id: ${run_id}');
    expect(workflow).toContain('Failed to read workflow run ${run_id}');
    expect(workflow).toContain('Failed to resolve workflow run for ${workflow}');
    expect(workflow).toContain('Unexpected workflow status for ${run_id}: ${status}');
  });

  it('tolerates short artifact-index propagation without weakening evidence checks', () => {
    expect(workflow).toContain('for _ in $(seq 1 30); do');
    expect(workflow).toContain('Missing expected artifact ${artifact_name} for workflow run ${run_id}');
    expect(workflow).toContain('[[ "$artifact_id" =~ ^[0-9]+$ ]]');
  });

  it('requires the real generated evidence files before declaring human review ready', () => {
    expect(workflow).toContain("migration-reconciliation-inventory.json' -print -quit");
    expect(workflow).toContain("migration-object-evidence.json' -print -quit");
    expect(workflow).toContain("migration-review-dossiers.json' -print -quit");
    expect(workflow).toContain("decision-template.json' -print -quit");
    expect(workflow).toContain('HUMAN_MIGRATION_REVIEW_READY');
  });

  it('publishes a non-authorizing provenance bundle', () => {
    expect(workflow).toContain('productionWriteAuthorized: false');
    expect(workflow).toContain('productionWritePerformed: false');
    expect(workflow).toContain('stagingDispatched: false');
    expect(workflow).toContain('boundedProductionChangeDispatched: false');
    expect(workflow).toContain('SHA256SUMS');
  });
});
