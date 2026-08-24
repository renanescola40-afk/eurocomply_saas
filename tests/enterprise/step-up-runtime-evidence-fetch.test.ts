import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  selectExactShaRun,
  validateDownloadedEvidence,
} from '../../scripts/enterprise/fetch-step-up-runtime-evidence.mjs';
import { p0EvidenceCatalog } from '../../scripts/security/p0-runtime-evidence-catalog.mjs';

const SHA = 'a'.repeat(40);
const RUN_ID = '123456789';
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const WORKFLOW_PATH = '.github/workflows/step-up-runtime-proof.yml';

function evidence() {
  return {
    schema: 'risck-comply.step-up-mfa-runtime-evidence.v2',
    evidenceItem: 'step-up-mfa-validation',
    id: 'step-up-mfa-validation',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: '2026-08-09T14:00:00.000Z',
    reviewedAt: '2026-08-09T14:00:00.000Z',
    repository: REPOSITORY,
    branch: 'main',
    targetSha: SHA,
    checkedOutSha: SHA,
    runtimeConfiguration: {
      providerConfigured: true,
    },
    runtimeValidation: {
      status: 'Complete',
      ephemeralFixtureCreated: true,
      signedIn: true,
      factorEnrolled: true,
      verifiedFactorAvailable: true,
      challengeCreated: true,
      verificationSucceeded: true,
      aal2Observed: true,
      sessionUserMatched: true,
      signedOut: true,
      fixtureCleanupVerified: true,
    },
    acceptanceCriteria: {
      dedicatedSigningSecretRequired: true,
      ephemeralFixtureCreated: true,
      syntheticFixtureSignedIn: true,
      totpFactorEnrolled: true,
      verifiedTotpFactorAvailable: true,
      providerChallengeCreated: true,
      totpVerificationSucceeded: true,
      aal2Observed: true,
      sessionUserMatched: true,
      fixtureSessionRevoked: true,
      fixtureCleanupVerified: true,
      exactReleaseSha: true,
      protectedMainBranch: true,
      protectedWorkflowProvenance: true,
    },
    provenance: {
      source: 'github_actions',
      repository: REPOSITORY,
      runId: RUN_ID,
      exactShaBound: true,
      branchBound: true,
      workflowProvenance: true,
    },
    evidenceIntegrity: {
      placeholderOnly: false,
      generatedFromLiveProvider: true,
      manualBooleanProofAccepted: false,
      rawSecretsStored: false,
      rawTokensStored: false,
      rawUserIdentifiersStored: false,
      factorIdentifiersStored: false,
      challengeIdentifiersStored: false,
      rawProviderPayloadStored: false,
      ephemeralUserRemoved: true,
    },
  };
}

describe('Step-Up exact-SHA runtime evidence handoff', () => {
  it('selects only a successful exact-main-SHA run from the canonical workflow path', () => {
    const run = {
      id: Number(RUN_ID),
      path: WORKFLOW_PATH,
      head_sha: SHA,
      head_branch: 'main',
      status: 'completed',
      conclusion: 'success',
      updated_at: '2026-08-09T14:01:00Z',
    };
    expect(selectExactShaRun([
      { ...run, id: 1, head_sha: 'b'.repeat(40) },
      { ...run, id: 2, head_branch: 'feature' },
      { ...run, id: 3, conclusion: 'failure' },
      { ...run, id: 4, path: '.github/workflows/other.yml' },
      run,
    ], SHA)).toEqual(run);
    expect(selectExactShaRun([run], SHA, '999')).toBeNull();
  });

  it('accepts the real v2 producer shape and closes the authoritative P0 catalog entry', () => {
    const proof = evidence();
    expect(validateDownloadedEvidence(proof, {
      targetSha: SHA,
      repository: REPOSITORY,
      runId: RUN_ID,
      now: new Date('2026-08-09T14:05:00.000Z'),
    })).toEqual({ passed: true, failures: [] });

    const entry = p0EvidenceCatalog.find((candidate) => candidate.item === 'Step-up MFA / IdP validation');
    expect(entry).toBeDefined();
    if (!entry?.validator) throw new Error('Step-up P0 catalog validator missing');
    expect(entry.validator(proof, {
      now: new Date('2026-08-09T14:05:00.000Z'),
      expectedRepository: REPOSITORY,
      expectedBranch: 'main',
      expectedCommitSha: SHA,
    })).toEqual([]);
  });

  it('rejects stale SHA, wrong source run, incomplete live verification or missing cleanup', () => {
    expect(validateDownloadedEvidence({ ...evidence(), targetSha: 'b'.repeat(40), checkedOutSha: 'b'.repeat(40) }, {
      targetSha: SHA,
      repository: REPOSITORY,
      runId: RUN_ID,
      now: new Date('2026-08-09T14:05:00.000Z'),
    }).passed).toBe(false);

    expect(validateDownloadedEvidence({ ...evidence(), provenance: { ...evidence().provenance, runId: '999' } }, {
      targetSha: SHA,
      repository: REPOSITORY,
      runId: RUN_ID,
      now: new Date('2026-08-09T14:05:00.000Z'),
    }).failures).toContain('source_run_provenance_mismatch');

    expect(validateDownloadedEvidence({ ...evidence(), runtimeValidation: { ...evidence().runtimeValidation, aal2Observed: false } }, {
      targetSha: SHA,
      repository: REPOSITORY,
      runId: RUN_ID,
      now: new Date('2026-08-09T14:05:00.000Z'),
    }).passed).toBe(false);

    expect(validateDownloadedEvidence({
      ...evidence(),
      runtimeValidation: { ...evidence().runtimeValidation, fixtureCleanupVerified: false },
      acceptanceCriteria: { ...evidence().acceptanceCriteria, fixtureCleanupVerified: false },
      evidenceIntegrity: { ...evidence().evidenceIntegrity, ephemeralUserRemoved: false },
    }, {
      targetSha: SHA,
      repository: REPOSITORY,
      runId: RUN_ID,
      now: new Date('2026-08-09T14:05:00.000Z'),
    }).passed).toBe(false);
  });

  it('wires the protected producer into P0 and uses the canonical signing secret with legacy fallback', () => {
    const p0 = readFileSync('.github/workflows/p0-runtime-evidence.yml', 'utf8');
    const workflow = readFileSync('.github/workflows/step-up-runtime-proof.yml', 'utf8');

    expect(p0).toContain('- Step-Up Runtime Proof');
    expect(p0).toContain("github.event.workflow_run.path == '.github/workflows/step-up-runtime-proof.yml'");
    expect(p0).not.toContain("github.event.workflow.path == '.github/workflows/step-up-runtime-proof.yml'");
    expect(p0).toContain('node scripts/enterprise/fetch-step-up-runtime-evidence.mjs');
    expect(p0).toContain('STEP_UP_RUNTIME_EVIDENCE_REQUIRED');
    expect(workflow).toContain('secrets.STEP_UP_ASSERTION_SIGNING_SECRET || secrets.STEP_UP_SIGNING_SECRET');
    expect(workflow).toContain('actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0');
    expect(workflow).toContain('actions/setup-node@820762786026740c76f36085b0efc47a31fe5020');
    expect(workflow).toContain('npm ci --ignore-scripts');
    expect(workflow).toContain('/commits/main');
  });
});
