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

  it('separates read-only validation from the write-enabled PR job', () => {
    expect(workflowSource).toContain('permissions:\n  actions: read\n  contents: read');
    expect(workflowSource).toContain('validate:\n    name: Validate trusted source artifact read-only');
    expect(workflowSource).toContain('open-pr:\n    name: Open human-reviewed evidence promotion PR\n    needs: validate');
    expect(workflowSource).toContain('permissions:\n      actions: read\n      contents: write\n      pull-requests: write');
    expect(workflowSource).toContain('validated-legal-rules-runtime-${{ env.ASSESSED_SHA }}-${{ env.SOURCE_RUN_ID }}');
    expect(workflowSource.indexOf('Retain validated promotion input'))
      .toBeLessThan(workflowSource.indexOf('Open or reuse draft evidence promotion PR'));
  });

  it('commits artifact bytes through an isolated one-file Git branch', () => {
    expect(workflowSource).toContain('Revalidate and publish single-file promotion branch');
    expect(workflowSource).toContain('test "$changed_paths" = "$CANONICAL_PATH"');
    expect(workflowSource).toContain('test "$(git rev-list --count "${ASSESSED_SHA}..${promotion_commit_sha}")" = \'1\'');
    expect(workflowSource).toContain('cmp --silent "$EVIDENCE_PATH" "$RUNNER_TEMP/existing-legal-rules-evidence.json"');
    expect(workflowSource).toContain('GIT_ASKPASS="$askpass"');
    expect(workflowSource).toContain('GIT_TERMINAL_PROMPT=0');
    expect(workflowSource).toContain('git push "$remote_url" "HEAD:refs/heads/${promotion_branch}"');
    expect(workflowSource).not.toContain('x-access-token:${GITHUB_TOKEN}@');
  });

  it('rejects conflicting canonical PASS evidence for the same SHA before API calls', () => {
    expect(scriptSource).toContain("const current = JSON.parse(readFileSync(canonicalPath, 'utf8'))");
    expect(scriptSource).toContain("current.status === 'PASS'");
    expect(scriptSource).toContain('current.deploymentSha === assessedSha');
    expect(scriptSource).toContain('current.artifactSha256 !== artifactSha256');
    expect(scriptSource).toContain('canonical main already contains conflicting PASS evidence for the assessed SHA');
    expect(scriptSource.indexOf('assertNoConflictingCanonicalPass(canonicalPath, assessedSha, artifactSha256)'))
      .toBeLessThan(scriptSource.indexOf("const mainCommit = await api('/commits/main')"));
  });

  it('keeps source artifact bytes out of the pull-request API client', () => {
    expect(scriptSource).toContain("readFileSync(canonicalPath, 'utf8')");
    expect(scriptSource).not.toContain('EVIDENCE_PATH');
    expect(scriptSource).not.toContain('/contents/');
    expect(scriptSource).not.toContain('Buffer.from');
    expect(scriptSource).toContain('/compare/${assessedSha}...${promotionCommitSha}');
    expect(scriptSource).toContain('comparison.files.length !== 1');
    expect(scriptSource).toContain('changedFile?.filename !== canonicalPath');
    expect(scriptSource).toContain("changedFile?.status !== 'modified'");
  });

  it('uses pinned artifact actions and retains an immutable receipt', () => {
    expect(workflowSource).toContain('actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0');
    expect(workflowSource).toContain('actions/setup-node@820762786026740c76f36085b0efc47a31fe5020');
    expect(workflowSource).toContain('actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c');
    expect(workflowSource).toContain('actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a');
    expect(workflowSource).toContain('retention-days: 365');
    expect(workflowSource).toContain('umask 077');
  });

  it('creates only a human-reviewed draft PR for the canonical evidence path', () => {
    expect(scriptSource).toContain("const CANONICAL_PATH = 'docs/security/evidence/runtime/legal-rules-validation.json'");
    expect(scriptSource).toContain('draft: true');
    expect(scriptSource).toContain('maintainer_can_modify: false');
    expect(scriptSource).toContain('Final review and merge remain human-controlled.');
    expect(scriptSource).not.toContain('pulls.merge');
    expect(scriptSource).not.toContain('/merges');
    expect(scriptSource).not.toContain('enablePullRequestAutoMerge');
  });

  it('revalidates repository, SHA, branch, commit and digest metadata', () => {
    expect(scriptSource).toContain("const REPOSITORY = 'renanescola40-afk/eurocomply_saas'");
    expect(scriptSource).toContain('ARTIFACT_SHA256 must be a lowercase SHA-256 digest');
    expect(scriptSource).toContain('promotion branch does not match the assessed SHA and source run');
    expect(scriptSource).toContain('assessed SHA is no longer current main');
    expect(scriptSource).toContain('promotion commit must be exactly one commit ahead of assessed main');
    expect(scriptSource).toContain('promotion commit changes an unapproved path or file status');
  });
});
