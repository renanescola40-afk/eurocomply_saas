import { describe, expect, it } from 'vitest';

import { requiredBranchProtectionChecks } from './validate-branch-protection-freshness.mjs';
import { validateRequiredStatusChecksRuntimeEvidence } from './validate-required-status-checks-runtime-evidence.mjs';

const SHA = 'a'.repeat(40);
const NOW = new Date('2026-08-12T12:00:00.000Z');

function fixture() {
  const matchedRequiredChecks = Object.fromEntries(
    requiredBranchProtectionChecks.map((check) => [check, [check]]),
  );
  return {
    schema: 'risck-comply.required-status-checks-runtime-evidence.v1',
    evidenceItem: 'required-status-checks',
    evidence_type: 'required-status-checks-configuration',
    status: 'Complete',
    outcome: 'passed',
    repository: 'renanescola40-afk/eurocomply_saas',
    branch: 'main',
    targetSha: SHA,
    checkedOutSha: SHA,
    currentMainSha: SHA,
    captured_at: '2026-08-12T11:59:00.000Z',
    generatedAt: '2026-08-12T11:59:00.000Z',
    reviewedAt: '2026-08-12T11:59:00.000Z',
    reviewer: 'RISCK COMPLY exact-SHA repository-control automation',
    summary: 'GitHub enforces the complete canonical required status-check set for the exact current main SHA and requires the branch to be up to date before merge.',
    failures: [],
    required_status_checks: [...requiredBranchProtectionChecks],
    configuredRequiredChecks: [...requiredBranchProtectionChecks],
    matchedRequiredChecks,
    branch_protection: {
      require_status_checks: true,
      require_up_to_date_branch: true,
    },
    controlsVerified: [
      'Required status checks are enforced for everyone',
      'Branches must be up to date before merge',
      'All documented required checks are configured',
    ],
    sourceWorkflow: {
      name: 'P0 Runtime Evidence',
      file: '.github/workflows/p0-runtime-evidence.yml',
      runId: '123456789',
      exactShaBound: true,
    },
    verification_provenance: {
      method: 'github_api',
      reference: 'github-actions-run:123456789',
      verifiedAt: '2026-08-12T11:59:00.000Z',
    },
    provenance: {
      githubActions: true,
      runId: '123456789',
      exactShaBound: true,
      mainHeadMatched: true,
    },
    broaderBranchProtectionSatisfied: false,
    evidenceBoundary: 'This evidence proves only required status-check configuration and strict up-to-date enforcement. It does not prove approving-review count, stale-review dismissal, CODEOWNERS policy, bypass-actor absence, deployment security, provider configuration or external review.',
    evidenceLocations: ['GitHub branches/main protection summary'],
    redactionConfirmation: 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.',
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawApiPayloadStored: false,
      accessTokensStored: false,
      exactShaBound: true,
      sourceRunBound: true,
    },
  };
}

describe('required status checks runtime evidence validator', () => {
  it('accepts fresh exact-SHA strict status-check evidence', () => {
    expect(validateRequiredStatusChecksRuntimeEvidence(fixture(), {
      now: NOW,
      expectedCommitSha: SHA,
    })).toEqual([]);
  });

  it('fails closed for a missing required context', () => {
    const evidence = fixture();
    const missing = requiredBranchProtectionChecks[0];
    evidence.required_status_checks = evidence.required_status_checks.filter((check) => check !== missing);
    delete evidence.matchedRequiredChecks[missing];
    expect(validateRequiredStatusChecksRuntimeEvidence(evidence, {
      now: NOW,
      expectedCommitSha: SHA,
    })).toEqual(expect.arrayContaining([
      `missing required status check: ${missing}`,
      `required status check has no matched GitHub context: ${missing}`,
    ]));
  });

  it('fails closed for non-strict, stale, wrong-SHA or unsafe evidence', () => {
    const nonStrict = fixture();
    nonStrict.branch_protection.require_up_to_date_branch = false;
    expect(validateRequiredStatusChecksRuntimeEvidence(nonStrict, {
      now: NOW,
      expectedCommitSha: SHA,
    })).toContain('branch_protection.require_up_to_date_branch must be true');

    const stale = fixture();
    stale.captured_at = '2026-07-01T00:00:00.000Z';
    expect(validateRequiredStatusChecksRuntimeEvidence(stale, {
      now: NOW,
      expectedCommitSha: SHA,
    })).toContain('captured_at is older than 7 days');

    const wrongSha = fixture();
    wrongSha.currentMainSha = 'b'.repeat(40);
    expect(validateRequiredStatusChecksRuntimeEvidence(wrongSha, {
      now: NOW,
      expectedCommitSha: SHA,
    })).toContain('targetSha and currentMainSha must match');

    const unsafe = fixture();
    unsafe.evidenceIntegrity.accessTokensStored = true;
    expect(validateRequiredStatusChecksRuntimeEvidence(unsafe, {
      now: NOW,
      expectedCommitSha: SHA,
    })).toContain('evidenceIntegrity.accessTokensStored must be false');
  });

  it('cannot promote broader branch protection through the decomposed proof', () => {
    const evidence = fixture();
    evidence.broaderBranchProtectionSatisfied = true;
    expect(validateRequiredStatusChecksRuntimeEvidence(evidence, {
      now: NOW,
      expectedCommitSha: SHA,
    })).toContain('broaderBranchProtectionSatisfied must remain false for decomposed evidence');
  });
});
