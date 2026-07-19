import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  REQUIRED_CHECKS,
  evaluateBranchProtection,
} from '../../scripts/enterprise/build-branch-protection-runtime-evidence.mjs';
import {
  buildCanonicalEvidence,
  isOptionalWorkflowUnavailable,
  selectExactShaRun,
  validateDownloadedEvidence,
} from '../../scripts/enterprise/fetch-branch-protection-runtime-evidence.mjs';

const SHA = 'a'.repeat(40);
const RUN_ID = '123456789';

function completeProtection() {
  return {
    required_status_checks: {
      strict: true,
      contexts: [...REQUIRED_CHECKS],
      checks: [],
    },
    required_pull_request_reviews: {
      required_approving_review_count: 1,
      require_code_owner_reviews: true,
      dismiss_stale_reviews: true,
    },
    required_conversation_resolution: { enabled: true },
    allow_force_pushes: { enabled: false },
    allow_deletions: { enabled: false },
    restrictions: null,
  };
}

function sourceEvidence() {
  return evaluateBranchProtection({
    protection: completeProtection(),
    targetSha: SHA,
    checkedOutSha: SHA,
    currentMainSha: SHA,
    runId: RUN_ID,
    generatedAt: '2026-07-19T00:00:00.000Z',
  });
}

describe('branch protection exact-SHA runtime evidence', () => {
  it('accepts complete current-main protection and writes canonical scorecard evidence', () => {
    const source = sourceEvidence();
    expect(source.status).toBe('Complete');
    expect(source.outcome).toBe('passed');
    expect(source.sourceDetails.missingRequiredChecks).toEqual([]);
    expect(source.sourceDetails.missingProtectionFlags).toBe(0);
    expect(validateDownloadedEvidence(source, { targetSha: SHA, runId: RUN_ID })).toEqual({
      passed: true,
      failures: [],
    });

    const canonical = buildCanonicalEvidence(source, { targetSha: SHA, runId: RUN_ID });
    expect(canonical.status).toBe('Complete');
    expect(canonical.outcome).toBe('passed');
    expect(canonical.checks).toEqual([
      expect.objectContaining({ name: 'branchProtection', passed: true }),
    ]);
    expect(canonical.evidenceIntegrity).toEqual(expect.objectContaining({
      containsSensitiveValues: false,
      exactShaBound: true,
      sourceRunBound: true,
    }));
  });

  it('fails closed for stale SHA, missing review protections or missing required checks', () => {
    const stale = evaluateBranchProtection({
      protection: completeProtection(),
      targetSha: SHA,
      checkedOutSha: SHA,
      currentMainSha: 'b'.repeat(40),
      runId: RUN_ID,
    });
    expect(stale.outcome).toBe('blocked');
    expect(stale.failures).toContain('exact_main_sha_mismatch');

    const weakReviews = completeProtection();
    weakReviews.required_pull_request_reviews.require_code_owner_reviews = false;
    const incompleteReviews = evaluateBranchProtection({
      protection: weakReviews,
      targetSha: SHA,
      checkedOutSha: SHA,
      currentMainSha: SHA,
      runId: RUN_ID,
    });
    expect(incompleteReviews.outcome).toBe('failed');
    expect(incompleteReviews.sourceDetails.missingProtectionFlags).toBeGreaterThan(0);

    const missingCheck = completeProtection();
    missingCheck.required_status_checks.contexts = REQUIRED_CHECKS.slice(1);
    const incompleteChecks = evaluateBranchProtection({
      protection: missingCheck,
      targetSha: SHA,
      checkedOutSha: SHA,
      currentMainSha: SHA,
      runId: RUN_ID,
    });
    expect(incompleteChecks.outcome).toBe('failed');
    expect(incompleteChecks.sourceDetails.missingRequiredChecks).toContain(REQUIRED_CHECKS[0]);
  });

  it('rejects stale source provenance, a different run or sensitive evidence', () => {
    const valid = sourceEvidence();
    expect(validateDownloadedEvidence({ ...valid, targetSha: 'b'.repeat(40) }, {
      targetSha: SHA,
      runId: RUN_ID,
    }).passed).toBe(false);
    expect(validateDownloadedEvidence(valid, {
      targetSha: SHA,
      runId: '999',
    }).failures).toEqual(expect.arrayContaining([
      'workflow run provenance mismatch',
      'source run provenance mismatch',
    ]));
    expect(validateDownloadedEvidence({
      ...valid,
      evidenceIntegrity: { ...valid.evidenceIntegrity, accessTokensStored: true },
    }, {
      targetSha: SHA,
      runId: RUN_ID,
    }).passed).toBe(false);
  });

  it('selects only a successful exact-main-SHA proof and treats only optional 404 as absent', () => {
    const run = {
      id: Number(RUN_ID),
      name: 'Branch Protection Runtime Proof',
      head_sha: SHA,
      head_branch: 'main',
      status: 'completed',
      conclusion: 'success',
      updated_at: '2026-07-19T00:00:00Z',
    };
    expect(selectExactShaRun([
      { ...run, id: 1, conclusion: 'failure' },
      { ...run, id: 2, head_branch: 'feature' },
      run,
    ], SHA)).toEqual(run);
    expect(selectExactShaRun([run], SHA, '999')).toBeNull();

    const missing = Object.assign(new Error('github_api_404'), { status: 404 });
    const unauthorized = Object.assign(new Error('github_api_401'), { status: 401 });
    expect(isOptionalWorkflowUnavailable(missing)).toBe(true);
    expect(isOptionalWorkflowUnavailable(missing, { required: true })).toBe(false);
    expect(isOptionalWorkflowUnavailable(missing, { sourceRunId: RUN_ID })).toBe(false);
    expect(isOptionalWorkflowUnavailable(unauthorized)).toBe(false);
  });

  it('uses a protected read-only producer and exact-SHA scorecard consumption', () => {
    const producer = readFileSync('.github/workflows/branch-protection-runtime-proof.yml', 'utf8');
    const scorecard = readFileSync('.github/workflows/enterprise-readiness-scorecard.yml', 'utf8');
    const builder = readFileSync('scripts/enterprise/build-branch-protection-runtime-evidence.mjs', 'utf8');
    const fetcher = readFileSync('scripts/enterprise/fetch-branch-protection-runtime-evidence.mjs', 'utf8');

    expect(producer).toContain('push:\n    branches: [main]');
    expect(producer).toContain('environment: Production');
    expect(producer).toContain('contents: read');
    expect(producer).not.toContain('contents: write');
    expect(producer).not.toContain('pull_request_target');
    expect(producer).toContain('BRANCH_PROTECTION_READ_TOKEN');
    expect(producer).toContain('check-generated-branch-protection-evidence.mjs');

    expect(scorecard).toContain('Branch Protection Runtime Proof');
    expect(scorecard).toContain('BRANCH_PROTECTION_RUNTIME_SOURCE_RUN_ID');
    expect(scorecard).toContain('fetch-branch-protection-runtime-evidence.mjs');
    expect(scorecard).toContain('branch-protection-validation.json');

    expect(builder).toContain("const absolutePath = join(root, 'p0-evidence', 'branch-protection-main.generated.json')");
    expect(builder).toContain('configuredOutputPath !== DEFAULT_OUTPUT_PATH');
    expect(builder).not.toContain('join(root, outputPath)');

    expect(fetcher).toContain("const WORKFLOW_NAME = 'Branch Protection Runtime Proof'");
    expect(fetcher).toContain("run?.head_branch === 'main'");
    expect(fetcher).toContain('validateGeneratedBranchProtectionEvidence');
    expect(fetcher).toContain('workflow run provenance mismatch');
  });
});
