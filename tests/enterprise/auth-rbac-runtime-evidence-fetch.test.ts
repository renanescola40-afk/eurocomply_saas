import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  selectExactShaRun,
  validateDownloadedEvidence,
} from '../../scripts/enterprise/fetch-auth-rbac-evidence.mjs';
import { p0EvidenceCatalog } from '../../scripts/security/p0-runtime-evidence-catalog.mjs';

const SHA = 'a'.repeat(40);
const RUN_ID = '123456789';
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';

const run = {
  id: Number(RUN_ID),
  name: `Auth/RBAC tenant proof for ${SHA}`,
  path: '.github/workflows/auth-rbac-runtime-proof.yml',
  head_sha: SHA,
  head_branch: 'main',
  status: 'completed',
  conclusion: 'success',
  updated_at: '2026-08-09T13:00:00Z',
};

const evidence = {
  schema: 'risck-comply.auth-rbac-runtime-evidence.v2',
  evidenceItem: 'auth-rbac-final-validation',
  status: 'Complete',
  outcome: 'passed',
  generatedAt: '2026-08-09T13:00:00.000Z',
  reviewedAt: '2026-08-09T13:00:00.000Z',
  reviewer: 'RISCK COMPLY protected runtime automation',
  repository: REPOSITORY,
  branch: 'main',
  targetSha: SHA,
  checkedOutSha: SHA,
  environment: 'production-auth-rbac-validation',
  summary: 'Protected live validation proved disposable signup and cleanup, authentication lifecycle, RBAC roles, same-tenant access and cross-tenant mutation denial for synthetic fixtures.',
  productionGate: 'eligible for downstream enterprise gates',
  checks: {
    fixtureConfigurationPresent: true,
    disposableSignup: true,
    disposableSignupCleanup: true,
    ownerRoleObserved: true,
    memberRoleObserved: true,
    ownerCanReadOwnTenant: true,
    memberCanReadOwnTenant: true,
    outsiderCannotReadTenantA: true,
    ownerCannotReadTenantB: true,
    outsiderCanReadOwnTenant: true,
    crossTenantMembershipHidden: true,
    crossTenantMembershipInsertDenied: true,
    crossTenantMembershipUpdateDenied: true,
    crossTenantMembershipDeleteDenied: true,
    crossTenantOrganizationUpdateDenied: true,
    crossTenantOrganizationDeleteDenied: true,
    sessionRefresh: true,
    sessionsRevoked: true,
  },
  provenance: {
    githubActions: true,
    repository: REPOSITORY,
    branch: 'main',
    runId: RUN_ID,
    expectedSha: SHA,
    checkedOutSha: SHA,
    exactShaBound: true,
  },
  failures: [],
  evidenceLocations: [
    'scripts/security/run-auth-rbac-live-validation.mjs',
    '.github/workflows/auth-rbac-runtime-proof.yml',
    'docs/security/evidence/runtime/auth-rbac-final-validation.json',
  ],
  controlsVerified: [
    'Disposable signup and cleanup passed.',
    'Synthetic authentication lifecycle passed.',
    'Expected tenant RBAC roles were observed.',
    'Cross-tenant reads were denied.',
    'Cross-tenant mutations were denied.',
    'Sessions were revoked after validation.',
  ],
  redactionConfirmation: 'Redaction confirmed for runtime evidence.',
  evidenceIntegrity: {
    placeholderOnly: false,
    runtimeProofInvented: false,
    customerFacingProof: false,
    rawCredentialsStored: false,
    serviceRoleKeyStored: false,
    disposablePasswordStored: false,
    accessTokensStored: false,
    userIdentifiersStored: false,
    organizationIdentifiersStored: false,
    rawProviderResponsesStored: false,
    cleanupRequired: true,
    cleanupVerified: true,
  },
};

describe('Auth RBAC exact-SHA evidence retrieval', () => {
  it('selects only a successful current-main run from the canonical workflow path', () => {
    expect(selectExactShaRun([
      { ...run, id: 1, head_sha: 'b'.repeat(40) },
      { ...run, id: 2, head_branch: 'feature' },
      { ...run, id: 3, conclusion: 'failure' },
      { ...run, id: 4, path: '.github/workflows/other.yml' },
      run,
    ], SHA)).toEqual(run);

    expect(selectExactShaRun([run], SHA, '999')).toBeNull();
    expect(selectExactShaRun([run], SHA, RUN_ID)).toEqual(run);
  });

  it('accepts the emitted v2 contract and rejects stale, partial or sensitive evidence', () => {
    expect(validateDownloadedEvidence(evidence, {
      targetSha: SHA,
      repository: REPOSITORY,
      runId: RUN_ID,
    })).toEqual({ passed: true, failures: [] });

    expect(validateDownloadedEvidence({ ...evidence, targetSha: 'b'.repeat(40) }, {
      targetSha: SHA,
      repository: REPOSITORY,
      runId: RUN_ID,
    }).passed).toBe(false);

    expect(validateDownloadedEvidence({ ...evidence, status: 'Open' }, {
      targetSha: SHA,
      repository: REPOSITORY,
      runId: RUN_ID,
    }).failures).toContain('evidence_not_complete');

    expect(validateDownloadedEvidence({
      ...evidence,
      evidenceIntegrity: { ...evidence.evidenceIntegrity, cleanupVerified: false },
    }, {
      targetSha: SHA,
      repository: REPOSITORY,
      runId: RUN_ID,
    }).failures).toContain('cleanup_verification_invalid');
  });

  it('passes the authoritative P0 catalog after retrieval without legacy translation', () => {
    const entry = p0EvidenceCatalog.find((candidate) => candidate.item === 'Auth/RBAC final runtime validation');
    expect(entry).toBeDefined();
    expect(entry?.validator(evidence, {
      now: new Date('2026-08-09T13:05:00.000Z'),
      expectedRepository: REPOSITORY,
      expectedBranch: 'main',
      expectedCommitSha: SHA,
    })).toEqual([]);
  });

  it('automates protected main proof and exact-SHA scorecard consumption without widening permissions', () => {
    const runtimeWorkflow = readFileSync('.github/workflows/auth-rbac-runtime-proof.yml', 'utf8');
    const scorecardWorkflow = readFileSync('.github/workflows/enterprise-readiness-scorecard.yml', 'utf8');
    const fetcher = readFileSync('scripts/enterprise/fetch-auth-rbac-evidence.mjs', 'utf8');
    const setValidator = readFileSync('scripts/security/check-p0-runtime-evidence-files.mjs', 'utf8');

    expect(runtimeWorkflow).toContain('push:\n    branches: [main]');
    expect(runtimeWorkflow).toContain('Verify exact current main checkout');
    expect(runtimeWorkflow).toContain('/commits/main');
    expect(runtimeWorkflow).toContain('environment: production');
    expect(runtimeWorkflow).toContain('persist-credentials: false');
    expect(runtimeWorkflow).not.toContain('pull_request_target');
    expect(runtimeWorkflow).not.toContain('contents: write');

    expect(scorecardWorkflow).toContain('Distributed Rate Limit Runtime Proof');
    expect(scorecardWorkflow).toContain('Auth RBAC Tenant Proof');
    expect(scorecardWorkflow).toContain('AUTH_RBAC_RUNTIME_SOURCE_RUN_ID');
    expect(scorecardWorkflow).toContain('node scripts/enterprise/fetch-auth-rbac-evidence.mjs');

    expect(fetcher).toContain("const WORKFLOW_PATH = `.github/workflows/${WORKFLOW_FILE}`");
    expect(fetcher).toContain('run?.path === WORKFLOW_PATH');
    expect(fetcher).toContain('risck-comply.auth-rbac-runtime-evidence.v2');
    expect(fetcher).toContain('cleanupVerified');
    expect(setValidator).toContain("'auth-rbac-final-validation'");
  });
});
