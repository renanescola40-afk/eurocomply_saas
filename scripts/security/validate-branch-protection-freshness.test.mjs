import { describe, expect, it } from 'vitest';

import {
  requiredBranchProtectionChecks,
  requiredBranchProtectionFlags,
  requiredBranchProtectionReleaseBlockers,
  validateBranchProtectionFreshness,
} from './validate-branch-protection-freshness.mjs';

const SHA = 'a'.repeat(40);
const now = new Date('2026-08-04T15:00:00Z');

function evidence(overrides = {}) {
  return {
    evidenceItem: 'required-status-checks',
    evidence_type: 'branch-protection-required-checks',
    status: 'Exception',
    repository: 'renanescola40-afk/eurocomply_saas',
    branch: 'main',
    captured_at: '2026-08-01T08:00:00Z',
    exception: { expiresAt: '2026-08-07T23:59:59Z' },
    ...overrides,
  };
}

function completeEvidence(overrides = {}) {
  return evidence({
    status: 'Complete',
    outcome: 'passed',
    exception: undefined,
    captured_at: '2026-08-04T14:00:00Z',
    generatedAt: '2026-08-04T14:00:00Z',
    targetSha: SHA,
    checkedOutSha: SHA,
    currentMainSha: SHA,
    verification_provenance: {
      method: 'github_api',
      reference: 'github-actions-run:123',
      verifiedAt: '2026-08-04T14:00:00Z',
    },
    sourceWorkflow: {
      name: 'Branch Protection Runtime Proof',
      file: '.github/workflows/branch-protection-runtime-proof.yml',
      runId: '123',
      artifact: `branch-protection-runtime-proof-${SHA}`,
      exactShaBound: true,
    },
    provenance: {
      githubActions: true,
      runId: '123',
      exactShaBound: true,
      mainHeadMatched: true,
    },
    branch_protection: {
      ...Object.fromEntries(requiredBranchProtectionFlags.map((flag) => [flag, true])),
      required_approving_reviews: 1,
    },
    required_status_checks: [...requiredBranchProtectionChecks],
    release_blockers: Object.fromEntries(
      requiredBranchProtectionReleaseBlockers.map((blocker) => [blocker, true]),
    ),
    workflow_secret_log_policy: {
      secrets_in_logs_prohibited: true,
      checkout_persist_credentials_disabled: true,
      strict_public_secret_scan_required: true,
    },
    sbom: {
      generated_by_ci: true,
      artifact_name: 'risck-comply-sbom',
      runtime_path: 'docs/security/evidence/runtime/sbom.cyclonedx.json',
    },
    controlsVerified: Array.from({ length: 10 }, (_, index) => `control-${index + 1}`),
    failures: [],
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawApiPayloadStored: false,
      accessTokensStored: false,
      exactShaBound: true,
      sourceRunBound: true,
    },
    ...overrides,
  });
}

describe('validateBranchProtectionFreshness', () => {
  it('accepts current unexpired exception evidence outside enterprise completion', () => {
    expect(validateBranchProtectionFreshness(evidence(), { now })).toEqual([]);
  });

  it('rejects stale evidence', () => {
    expect(validateBranchProtectionFreshness(evidence({ captured_at: '2026-07-01T08:00:00Z' }), { now }))
      .toContain('captured_at is older than 7 days');
  });

  it('rejects expired exceptions', () => {
    expect(validateBranchProtectionFreshness(
      evidence({ exception: { expiresAt: '2026-08-03T23:59:59Z' } }),
      { now },
    )).toContain('branch protection exception has expired');
  });

  it('accepts exact-SHA complete GitHub API evidence with every control', () => {
    expect(validateBranchProtectionFreshness(completeEvidence(), {
      now,
      expectedCommitSha: SHA,
    })).toEqual([]);
  });

  it('rejects Complete evidence from another assessed SHA', () => {
    expect(validateBranchProtectionFreshness(completeEvidence(), {
      now,
      expectedCommitSha: 'b'.repeat(40),
    })).toContain('targetSha must match the exact assessed SHA');
  });

  it('rejects Complete evidence without protected workflow provenance', () => {
    const complete = completeEvidence({ verification_provenance: undefined });
    expect(validateBranchProtectionFreshness(complete, { now, expectedCommitSha: SHA }))
      .toContain('Complete evidence requires verification_provenance');
  });

  it('rejects Complete evidence when direct pushes are not restricted', () => {
    const complete = completeEvidence();
    complete.branch_protection.restrict_direct_pushes = false;
    expect(validateBranchProtectionFreshness(complete, { now, expectedCommitSha: SHA }))
      .toContain('branch_protection.restrict_direct_pushes must be true');
  });

  it('rejects Complete evidence when a required status check is absent', () => {
    const complete = completeEvidence();
    complete.required_status_checks = complete.required_status_checks.slice(1);
    expect(validateBranchProtectionFreshness(complete, { now, expectedCommitSha: SHA }))
      .toContain(`missing required status check: ${requiredBranchProtectionChecks[0]}`);
  });

  it('rejects Complete evidence when source-run binding is absent', () => {
    const complete = completeEvidence();
    complete.evidenceIntegrity.sourceRunBound = false;
    expect(validateBranchProtectionFreshness(complete, { now, expectedCommitSha: SHA }))
      .toContain('evidenceIntegrity.sourceRunBound must be true');
  });

  it('rejects Complete evidence when checkout credentials persist', () => {
    const complete = completeEvidence();
    complete.workflow_secret_log_policy.checkout_persist_credentials_disabled = false;
    expect(validateBranchProtectionFreshness(complete, { now, expectedCommitSha: SHA }))
      .toContain('workflow_secret_log_policy.checkout_persist_credentials_disabled must be true');
  });
});
