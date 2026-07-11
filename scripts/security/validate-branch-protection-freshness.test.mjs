import { describe, expect, it } from 'vitest';

import {
  requiredBranchProtectionChecks,
  requiredBranchProtectionFlags,
  requiredBranchProtectionReleaseBlockers,
  validateBranchProtectionFreshness,
} from './validate-branch-protection-freshness.mjs';

const now = new Date('2026-07-11T10:00:00Z');

function evidence(overrides = {}) {
  return {
    evidenceItem: 'required-status-checks',
    evidence_type: 'branch-protection-required-checks',
    status: 'Exception',
    repository: 'renanescola40-afk/eurocomply_saas',
    branch: 'main',
    captured_at: '2026-07-07T08:00:00Z',
    exception: { expiresAt: '2026-07-14T23:59:59Z' },
    ...overrides,
  };
}

function completeEvidence(overrides = {}) {
  return evidence({
    status: 'Complete',
    exception: undefined,
    captured_at: '2026-07-11T09:00:00Z',
    verification_provenance: {
      method: 'github_api',
      reference: 'actions/run/123/artifact/branch-protection',
      verifiedAt: '2026-07-11T09:30:00Z',
    },
    branch_protection: {
      ...Object.fromEntries(requiredBranchProtectionFlags.map((flag) => [flag, true])),
      required_approving_reviews: 1,
    },
    required_status_checks: [...requiredBranchProtectionChecks],
    release_blockers: Object.fromEntries(requiredBranchProtectionReleaseBlockers.map((blocker) => [blocker, true])),
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
    ...overrides,
  });
}

describe('validateBranchProtectionFreshness', () => {
  it('accepts current unexpired exception evidence outside the enterprise completion check', () => {
    expect(validateBranchProtectionFreshness(evidence(), { now })).toEqual([]);
  });

  it('rejects stale evidence', () => {
    expect(validateBranchProtectionFreshness(evidence({ captured_at: '2026-07-01T08:00:00Z' }), { now }))
      .toContain('captured_at is older than 7 days');
  });

  it('rejects expired exceptions', () => {
    expect(validateBranchProtectionFreshness(evidence({ exception: { expiresAt: '2026-07-10T23:59:59Z' } }), { now }))
      .toContain('branch protection exception has expired');
  });

  it('accepts complete repository policy evidence with provenance and all controls', () => {
    expect(validateBranchProtectionFreshness(completeEvidence(), { now })).toEqual([]);
  });

  it('rejects Complete evidence without provenance', () => {
    expect(validateBranchProtectionFreshness(completeEvidence({ verification_provenance: undefined }), { now }))
      .toContain('Complete evidence requires verification_provenance');
  });

  it('rejects Complete evidence when direct pushes are not restricted', () => {
    const complete = completeEvidence();
    complete.branch_protection.restrict_direct_pushes = false;
    expect(validateBranchProtectionFreshness(complete, { now }))
      .toContain('branch_protection.restrict_direct_pushes must be true');
  });

  it('rejects Complete evidence when a required status check is absent', () => {
    const complete = completeEvidence();
    complete.required_status_checks = complete.required_status_checks.slice(1);
    expect(validateBranchProtectionFreshness(complete, { now }))
      .toContain(`missing required status check: ${requiredBranchProtectionChecks[0]}`);
  });

  it('rejects Complete evidence when checkout credentials persist', () => {
    const complete = completeEvidence();
    complete.workflow_secret_log_policy.checkout_persist_credentials_disabled = false;
    expect(validateBranchProtectionFreshness(complete, { now }))
      .toContain('workflow_secret_log_policy.checkout_persist_credentials_disabled must be true');
  });
});
