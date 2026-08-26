import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  REQUIRED_CHECKS,
  evaluateBranchProtection,
} from '../../scripts/enterprise/build-branch-protection-runtime-evidence.mjs';
import {
  buildCanonicalEvidence,
  buildP0CanonicalEvidence,
  isOptionalWorkflowUnavailable,
  selectBranchProtectionEvidenceEntry,
  selectExactShaRun,
  validateDownloadedEvidence,
} from '../../scripts/enterprise/fetch-branch-protection-runtime-evidence.mjs';
import { validateBranchProtectionFreshness } from '../../scripts/security/validate-branch-protection-freshness.mjs';

const SHA = 'a'.repeat(40);
const RUN_ID = '123456789';
const GENERATED_AT = '2026-08-04T14:00:00.000Z';

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
    generatedAt: GENERATED_AT,
  });
}

describe('branch protection exact-SHA runtime evidence', () => {
  it('accepts complete current-main protection and builds scorecard evidence', () => {
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
    expect(canonical.controlsVerified).toEqual(source.controlsVerified);
    expect(canonical.redactionConfirmation).toBe('All secrets, tokens, credentials, connection strings, and access-granting values are redacted.');
    expect(canonical.evidenceIntegrity).toEqual(expect.objectContaining({
      containsSensitiveValues: false,
      exactShaBound: true,
      sourceRunBound: true,
    }));
  });

  it('promotes the same source into both canonical P0 controls', () => {
    const p0 = buildP0CanonicalEvidence(sourceEvidence(), {
      targetSha: SHA,
      runId: RUN_ID,
    });

    expect(p0.status).toBe('Complete');
    expect(p0.outcome).toBe('passed');
    expect(p0.targetSha).toBe(SHA);
    expect(p0.sourceWorkflow).toEqual(expect.objectContaining({
      name: 'Branch Protection Runtime Proof',
      runId: RUN_ID,
      artifact: `branch-protection-runtime-proof-${SHA}`,
      exactShaBound: true,
    }));
    expect(validateBranchProtectionFreshness(p0, {
      now: new Date(GENERATED_AT),
      expectedCommitSha: SHA,
    })).toEqual([]);
  });

  it('fails closed for stale SHA, missing review protections or missing checks', () => {
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

  it('rejects stale provenance, another run or sensitive evidence', () => {
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

  it('selects only a trusted successful exact-main-SHA producer run', () => {
    const run = {
      id: Number(RUN_ID),
      name: 'Branch Protection Runtime Proof',
      head_sha: SHA,
      head_branch: 'main',
      event: 'push',
      status: 'completed',
      conclusion: 'success',
      updated_at: '2026-08-04T14:00:00Z',
    };
    expect(selectExactShaRun([
      { ...run, id: 1, conclusion: 'failure' },
      { ...run, id: 2, head_branch: 'feature' },
      { ...run, id: 3, event: 'pull_request' },
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

  it('rejects duplicate, traversal, unsafe directory, absolute and backslash ZIP entries', () => {
    expect(selectBranchProtectionEvidenceEntry([
      'p0-evidence/',
      'p0-evidence/branch-protection-main.generated.json',
    ])).toBe('p0-evidence/branch-protection-main.generated.json');

    expect(() => selectBranchProtectionEvidenceEntry([
      'branch-protection-main.generated.json',
      'nested/branch-protection-main.generated.json',
    ])).toThrow('branch_protection_source_not_unique');
    expect(() => selectBranchProtectionEvidenceEntry([
      '../branch-protection-main.generated.json',
    ])).toThrow('artifact_zip_unsafe_entry');
    expect(() => selectBranchProtectionEvidenceEntry([
      '../',
      'branch-protection-main.generated.json',
    ])).toThrow('artifact_zip_unsafe_entry');
    expect(() => selectBranchProtectionEvidenceEntry([
      '/tmp/branch-protection-main.generated.json',
    ])).toThrow('artifact_zip_unsafe_entry');
    expect(() => selectBranchProtectionEvidenceEntry([
      'nested\\branch-protection-main.generated.json',
    ])).toThrow('artifact_zip_unsafe_entry');
  });

  it('uses stable read-only producers and exact-SHA multi-producer P0 aggregation', () => {
    const producer = readFileSync('.github/workflows/branch-protection-runtime-proof.yml', 'utf8');
    const p0 = readFileSync('.github/workflows/p0-runtime-evidence.yml', 'utf8');
    const builder = readFileSync('scripts/enterprise/build-branch-protection-runtime-evidence.mjs', 'utf8');
    const fetcher = readFileSync('scripts/enterprise/fetch-branch-protection-runtime-evidence.mjs', 'utf8');
    const scannerAggregator = readFileSync('scripts/enterprise/aggregate-upload-scanner-runtime-evidence.mjs', 'utf8');

    expect(producer).toContain('name: Branch Protection Runtime Proof');
    expect(producer).not.toMatch(/^run-name:/m);
    expect(producer).toContain('push:\n    branches: [main]');
    expect(producer).toContain('environment: Production');
    expect(producer).toContain('contents: read');
    expect(producer).not.toContain('contents: write');
    expect(producer).not.toContain('pull_request_target');
    expect(producer).toContain('BRANCH_PROTECTION_READ_TOKEN');
    expect(producer).toContain('check-generated-branch-protection-evidence.mjs');

    expect(p0).toContain('- RISCK COMPLY Upload Security CI');
    expect(p0).toContain('- Branch Protection Runtime Proof');
    expect(p0).toContain('UPLOAD_SCANNER_RUNTIME_SOURCE_RUN_ID');
    expect(p0).toContain('BRANCH_PROTECTION_RUNTIME_SOURCE_RUN_ID');
    expect(p0).toContain('aggregate-upload-scanner-runtime-evidence.mjs');
    expect(p0).toContain('fetch-branch-protection-runtime-evidence.mjs');
    expect(p0).not.toContain('contents: write');

    expect(builder).toContain("const absolutePath = join(root, 'p0-evidence', 'branch-protection-main.generated.json')");
    expect(builder).toContain('configuredOutputPath !== DEFAULT_OUTPUT_PATH');
    expect(builder).not.toContain('join(root, outputPath)');

    expect(fetcher).toContain("const WORKFLOW_NAME = 'Branch Protection Runtime Proof'");
    expect(fetcher).toContain('const MAX_API_RESPONSE_BYTES = 1024 * 1024');
    expect(fetcher).toContain('const MAX_ARTIFACT_BYTES = 5 * 1024 * 1024');
    expect(fetcher).toContain('head_sha=${encodeURIComponent(targetSha)}');
    expect(fetcher).toContain('branch-protection-required-checks.json');
    expect(fetcher).toContain("redirect: 'manual'");
    expect(fetcher).toContain('artifact_redirect_not_allowed');
    expect(fetcher).toContain("'.blob.core.windows.net'");
    expect(fetcher).toContain("'.githubusercontent.com'");
    expect(fetcher).toContain('artifact_zip_unsafe_entry');
    expect(fetcher).not.toContain('spawnSync');
    expect(fetcher).not.toContain('response.json()');

    expect(scannerAggregator).toContain('head_sha=${encodeURIComponent(targetSha)}');
    expect(scannerAggregator).toContain('per_page=20');
    expect(scannerAggregator).toContain('MAX_API_RESPONSE_BYTES = 1024 * 1024');
    expect(scannerAggregator).not.toContain('per_page=100');
    expect(scannerAggregator).not.toContain('response.json()');
  });
});
