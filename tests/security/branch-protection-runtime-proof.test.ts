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
    expect(workflow).toContain('generate-branch-protection-ruleset-evidence.mjs');
    expect(workflow).toContain('GITHUB_TOKEN: ${{ github.token }}');

    const generator = readFileSync('scripts/security/generate-branch-protection-ruleset-evidence.mjs', 'utf8');
    expect(generator).toContain("git', ['ls-remote', 'origin', 'refs/heads/main']");
    expect(generator).toContain('/rulesets');
    expect(generator).toContain("const githubToken = String(process.env.GITHUB_TOKEN || '').trim()");
    expect(generator).toContain("Authorization: \`Bearer \${githubToken}\`");
    expect(generator).toContain("if (![401, 403, 404].includes(authenticated.status))");
    expect(generator).toContain("source: 'github-api-repository-rulesets-fallback'");
    expect(generator).toContain("classicProtectionApiFailure:");
    expect(generator).toContain("rawApiPayloadStored: false");
    expect(generator).toContain("accessTokensStored: false");
    expect(generator).toContain("if (!complete) process.exitCode = 1");
    expect(workflow).toContain('check-generated-branch-protection-evidence.mjs');
    expect(workflow).toContain('if: always()');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('rawApiPayload:');
  });
});
