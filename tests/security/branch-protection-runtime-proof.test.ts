import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { validateGeneratedBranchProtectionEvidence } from '../../scripts/security/check-generated-branch-protection-evidence.mjs';

const SHA = 'a'.repeat(40);
const completeProtection = {
  protect_branch: true,
  require_pull_request: true,
  required_approving_reviews: 1,
  require_code_owner_review: true,
  dismiss_stale_reviews: true,
  require_conversation_resolution: true,
  require_status_checks: true,
  require_up_to_date_branch: true,
  block_force_pushes: true,
  block_deletions: true,
  restrict_direct_pushes: true,
};
const trustedProvenance = {
  githubActions: true,
  runId: '123456',
  exactShaBound: true,
  mainHeadMatched: true,
};
const safeIntegrity = {
  containsSensitiveValues: false,
  rawApiPayloadStored: false,
  accessTokensStored: false,
  exactShaBound: true,
};

function passingEvidence(overrides: Record<string, unknown> = {}) {
  return {
    schema: 'risck-comply.branch-protection-runtime-evidence.v1',
    schema_version: 5,
    evidenceItem: 'required-status-checks',
    evidence_type: 'branch-protection-required-checks',
    status: 'Complete',
    outcome: 'passed',
    repository: 'renanescola40-afk/eurocomply_saas',
    branch: 'main',
    targetSha: SHA,
    checkedOutSha: SHA,
    currentMainSha: SHA,
    source: 'github-api-branch-protection-workflow',
    redactionConfirmation: 'Redaction confirmed for branch protection runtime evidence.',
    required_status_checks: ['CI / quality'],
    branch_protection: completeProtection,
    controlsVerified: Array.from({ length: 11 }, (_, index) => `control-${index + 1}`),
    sourceDetails: {
      missingRequiredChecks: [],
      missingProtectionFlags: 0,
    },
    provenance: trustedProvenance,
    failures: [],
    evidenceIntegrity: safeIntegrity,
    ...overrides,
  };
}

describe('exact-SHA branch protection runtime proof', () => {
  it('accepts only complete evidence for the exact current main SHA', () => {
    expect(validateGeneratedBranchProtectionEvidence(passingEvidence(), { expectedSha: SHA })).toEqual([]);
  });

  it('fails closed for stale SHA, incomplete protection, or untrusted provenance', () => {
    expect(validateGeneratedBranchProtectionEvidence(
      passingEvidence({ currentMainSha: 'b'.repeat(40) }),
      { expectedSha: SHA },
    )).toContain('targetSha must equal the current main head');

    expect(validateGeneratedBranchProtectionEvidence(passingEvidence({
      branch_protection: {
        ...completeProtection,
        require_code_owner_review: false,
      },
    }), { expectedSha: SHA })).toContain('branch_protection.require_code_owner_review must be true');

    expect(validateGeneratedBranchProtectionEvidence(passingEvidence({
      provenance: {
        ...trustedProvenance,
        githubActions: false,
      },
    }), { expectedSha: SHA })).toContain('GitHub Actions provenance is required');
  });

  it('rejects evidence that stores sensitive or raw API material', () => {
    const failures = validateGeneratedBranchProtectionEvidence(passingEvidence({
      evidenceIntegrity: {
        ...safeIntegrity,
        containsSensitiveValues: true,
        rawApiPayloadStored: true,
        accessTokensStored: true,
      },
    }), { expectedSha: SHA });

    expect(failures).toContain('sensitive-value integrity flag is invalid');
    expect(failures).toContain('raw GitHub API payloads must not be stored');
    expect(failures).toContain('access tokens must not be stored');
  });

  it('keeps the protected workflow manual, exact-SHA-bound, and fail closed', () => {
    const workflow = readFileSync('.github/workflows/p0-branch-protection-evidence.yml', 'utf8');

    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('release_sha:');
    expect(workflow).toContain('push:');
    expect(workflow).toContain('branches: [main]');
    expect(workflow).toContain('RELEASE_SHA: ${{ inputs.release_sha || github.sha }}');
    expect(workflow).toContain('ref: ${{ env.RELEASE_SHA }}');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('actions: read');
    expect(workflow).toContain('node scripts/enterprise/fetch-branch-protection-runtime-evidence.mjs');
    expect(workflow).toContain("BRANCH_PROTECTION_RUNTIME_EVIDENCE_REQUIRED: 'true'");
    expect(workflow).toContain('waiting for branch-proof producer');
    expect(workflow).toContain('for attempt in $(seq 1 30)');
    expect(workflow).toContain('No valid exact-SHA Branch Protection runtime artifact is available after bounded producer wait.');
    expect(workflow).toContain('branch-protection-required-checks.json');
    expect(workflow).toContain('validateBranchProtectionFreshness');
    expect(workflow).toContain('GITHUB_TOKEN: ${{ github.token }}');

    const fetcher = readFileSync('scripts/enterprise/fetch-branch-protection-runtime-evidence.mjs', 'utf8');
    expect(fetcher).toContain("const WORKFLOW_NAME = 'Branch Protection Runtime Proof'");
    expect(fetcher).toContain('selectLatestExactShaArtifact');
    expect(fetcher).toContain('validateDownloadedEvidence');
    expect(fetcher).toContain('rawApiPayloadStored: false');
    expect(fetcher).toContain('accessTokensStored: false');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('rawApiPayload:');
  });
});
