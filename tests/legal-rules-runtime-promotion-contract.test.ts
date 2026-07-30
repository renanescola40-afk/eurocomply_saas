import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const workflowSource = readFileSync(resolve('.github/workflows/legal-rules-runtime-promotion.yml'), 'utf8');
const scriptSource = readFileSync(resolve('scripts/compliance/create-legal-rules-runtime-promotion-pr.mjs'), 'utf8');

describe('legal rules runtime promotion contract', () => {
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
    expect(workflowSource).toContain('PROMOTE_LEGAL_RULES_EVIDENCE');
    expect(workflowSource).toContain('SOURCE_RUN_ID: ${{ inputs.source_run_id || github.event.workflow_run.id }}');
    expect(workflowSource).toContain('run-id: ${{ env.SOURCE_RUN_ID }}');
    expect(workflowSource).toContain('name: legal-rules-runtime-${{ env.ASSESSED_SHA }}');
  });

  it('validates an isolated single-file artifact before using write permissions', () => {
    expect(workflowSource).toContain('test -z "$(find "$BUNDLE_ROOT" -type f ! -path "$EVIDENCE_PATH" -print -quit)"');
    expect(workflowSource).toContain('node "$GITHUB_WORKSPACE/scripts/security/check-p0-runtime-evidence-files.mjs"');
    expect(workflowSource).toContain("evidence.status !== 'PASS'");
    expect(workflowSource).toContain('evidence.deploymentSha !== process.env.ASSESSED_SHA');
    expect(workflowSource).toContain('evidence.countsForRuntimeCoverage !== true');
    expect(workflowSource.indexOf('Validate isolated artifact and promotion contracts'))
      .toBeLessThan(workflowSource.indexOf('Open or reuse draft evidence promotion PR'));
  });

  it('uses pinned artifact actions and retains an immutable receipt', () => {
    expect(workflowSource).toContain('actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0');
    expect(workflowSource).toContain('actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38');
    expect(workflowSource).toContain('actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093');
    expect(workflowSource).toContain('actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a');
    expect(workflowSource).toContain('retention-days: 365');
    expect(workflowSource).toContain('umask 077');
  });

  it('creates only a human-reviewed draft PR for the canonical evidence path', () => {
    expect(scriptSource).toContain("const CANONICAL_PATH = 'docs/security/evidence/runtime/legal-rules-validation.json'");
    expect(scriptSource).toContain("draft: true");
    expect(scriptSource).toContain("maintainer_can_modify: false");
    expect(scriptSource).toContain('Final review and merge remain human-controlled.');
    expect(scriptSource).toContain("status: 'ALREADY_PROMOTED'");
    expect(scriptSource).not.toContain('pulls.merge');
    expect(scriptSource).not.toContain('/merges');
    expect(scriptSource).not.toContain('enablePullRequestAutoMerge');
  });

  it('revalidates repository, SHA, digest and sensitive-data boundaries', () => {
    expect(scriptSource).toContain("const REPOSITORY = 'renanescola40-afk/eurocomply_saas'");
    expect(scriptSource).toContain("evidence.status !== 'PASS'");
    expect(scriptSource).toContain('evidence.deploymentSha !== assessedSha');
    expect(scriptSource).toContain('artifactSha256 !== digest(withoutArtifactDigest)');
    expect(scriptSource).toContain("['authorization', 'set-cookie', 'service_role', 'stripe_secret', 'password=']");
    expect(scriptSource).toContain('assessed SHA is no longer current main');
    expect(scriptSource).toContain('conflicting PASS evidence for the assessed SHA');
  });
});
