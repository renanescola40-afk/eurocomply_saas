import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const workflowSource = readFileSync(resolve('.github/workflows/legal-rules-runtime-promotion.yml'), 'utf8');
const controlsSource = readFileSync(resolve('docs/enterprise/controls.json'), 'utf8');
const overridesSource = readFileSync(resolve('docs/enterprise/evidence-overrides.json'), 'utf8');
const canonicalPath = 'docs/security/evidence/runtime/legal-rules-validation.json';

describe('legal rules runtime retention contract', () => {
  it('accepts only successful current-main deployment-status source runs automatically', () => {
    expect(workflowSource).toContain('workflow_run:');
    expect(workflowSource).toContain('workflows: [Legal Rules Runtime Validation]');
    expect(workflowSource).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(workflowSource).toContain("github.event.workflow_run.head_branch == 'main'");
    expect(workflowSource).toContain("github.event.workflow_run.event == 'deployment_status'");
    expect(workflowSource).toContain('test "$current_main" = "$ASSESSED_SHA"');
    expect(workflowSource).toContain('test "$SOURCE_HEAD_SHA" = "$ASSESSED_SHA"');
  });

  it('keeps manual replay explicit and exact-run-bound', () => {
    expect(workflowSource).toContain('RETAIN_LEGAL_RULES_EVIDENCE');
    expect(workflowSource).toContain('SOURCE_RUN_ID: ${{ inputs.source_run_id || github.event.workflow_run.id }}');
    expect(workflowSource).toContain('run-id: ${{ env.SOURCE_RUN_ID }}');
    expect(workflowSource).toContain('name: legal-rules-runtime-${{ env.ASSESSED_SHA }}');
  });

  it('validates an isolated single-file artifact before retaining it', () => {
    expect(workflowSource).toContain('test -z "$(find "$BUNDLE_ROOT" -type f ! -path "$EVIDENCE_PATH" -print -quit)"');
    expect(workflowSource).toContain('node "$GITHUB_WORKSPACE/scripts/security/check-p0-runtime-evidence-files.mjs"');
    expect(workflowSource).toContain("evidence.status !== 'PASS'");
    expect(workflowSource).toContain('evidence.deploymentSha !== process.env.ASSESSED_SHA');
    expect(workflowSource).toContain('evidence.countsForRuntimeCoverage !== true');
    expect(workflowSource).toContain("evidence.evidenceIntegrity?.placeholderOnly !== false");
    expect(workflowSource).toContain('retention evidence digest is malformed');
  });

  it('is read-only end to end and cannot create another release-changing PR', () => {
    expect(workflowSource).toContain('permissions:\n  actions: read\n  contents: read');
    expect(workflowSource).not.toContain('contents: write');
    expect(workflowSource).not.toContain('pull-requests: write');
    expect(workflowSource).not.toContain('git push');
    expect(workflowSource).not.toContain('Open human-reviewed evidence promotion PR');
    expect(workflowSource).not.toContain('create-legal-rules-runtime-promotion-pr.mjs');
    expect(workflowSource).not.toContain('open-pr:');
  });

  it('retains exact-SHA evidence plus a non-writing receipt for 365 days', () => {
    expect(workflowSource).toContain("schema: 'risck-comply.legal-rules-runtime-retention.v1'");
    expect(workflowSource).toContain("status: 'RETAINED_READ_ONLY'");
    expect(workflowSource).toContain("authority: 'immutable-github-actions-artifact'");
    expect(workflowSource).toContain('repositoryWritePerformed: false');
    expect(workflowSource).toContain('pullRequestCreated: false');
    expect(workflowSource).toContain('retained-legal-rules-runtime-${{ env.ASSESSED_SHA }}-${{ env.SOURCE_RUN_ID }}');
    expect(workflowSource).toContain('retention-days: 365');
  });

  it('does not make the enterprise scorecard depend on the self-referential repository snapshot', () => {
    expect(controlsSource).not.toContain(canonicalPath);
    expect(overridesSource).not.toContain(canonicalPath);
  });

  it('documents why repository promotion is intentionally avoided', () => {
    expect(workflowSource).toContain('Repository-resident runtime snapshots are intentionally not rewritten');
    expect(workflowSource).toContain('a commit cannot contain runtime evidence for its own not-yet-existing SHA');
  });

  it('uses pinned artifact actions', () => {
    expect(workflowSource).toContain('actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0');
    expect(workflowSource).toContain('actions/setup-node@820762786026740c76f36085b0efc47a31fe5020');
    expect(workflowSource).toContain('actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c');
    expect(workflowSource).toContain('actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a');
  });
});
