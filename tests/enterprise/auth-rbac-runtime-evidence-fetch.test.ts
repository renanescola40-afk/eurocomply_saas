import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  selectExactShaRun,
  validateDownloadedEvidence,
} from '../../scripts/enterprise/fetch-auth-rbac-evidence.mjs';

const SHA = 'a'.repeat(40);
const RUN_ID = '123456789';

const run = {
  id: Number(RUN_ID),
  name: 'Auth RBAC Tenant Proof',
  head_sha: SHA,
  head_branch: 'main',
  status: 'completed',
  conclusion: 'success',
  updated_at: '2026-07-17T17:00:00Z',
};

const evidence = {
  schema: 'risck-comply.auth-rbac-runtime-evidence.v1',
  evidenceItem: 'auth-rbac-final-validation',
  status: 'Complete',
  outcome: 'passed',
  repository: 'renanescola40-afk/eurocomply_saas',
  branch: 'main',
  targetSha: SHA,
  checkedOutSha: SHA,
  environment: 'production-auth-rbac-validation',
  productionGate: 'eligible for downstream enterprise gates',
  checks: {
    fixtureConfigurationPresent: true,
    ownerRoleObserved: true,
    memberRoleObserved: true,
    ownerCanReadOwnTenant: true,
    memberCanReadOwnTenant: true,
    outsiderCannotReadTenantA: true,
    ownerCannotReadTenantB: true,
    outsiderCanReadOwnTenant: true,
    crossTenantMembershipHidden: true,
    sessionRefresh: true,
    sessionsRevoked: true,
  },
  provenance: {
    githubActions: true,
    runId: RUN_ID,
    exactShaBound: true,
  },
  failures: [],
  evidenceIntegrity: {
    placeholderOnly: false,
    runtimeProofInvented: false,
    rawCredentialsStored: false,
    accessTokensStored: false,
    userIdentifiersStored: false,
    organizationIdentifiersStored: false,
    rawProviderResponsesStored: false,
  },
};

describe('Auth RBAC exact-SHA evidence retrieval', () => {
  it('selects only a successful current-main run for the exact assessed SHA', () => {
    expect(selectExactShaRun([
      { ...run, id: 1, head_sha: 'b'.repeat(40) },
      { ...run, id: 2, head_branch: 'feature' },
      { ...run, id: 3, conclusion: 'failure' },
      run,
    ], SHA)).toEqual(run);

    expect(selectExactShaRun([run], SHA, '999')).toBeNull();
    expect(selectExactShaRun([run], SHA, RUN_ID)).toEqual(run);
  });

  it('accepts complete redacted evidence and rejects stale, partial or sensitive evidence', () => {
    expect(validateDownloadedEvidence(evidence, {
      targetSha: SHA,
      repository: 'renanescola40-afk/eurocomply_saas',
      runId: RUN_ID,
    })).toEqual({ passed: true, failures: [] });

    expect(validateDownloadedEvidence({ ...evidence, targetSha: 'b'.repeat(40) }, {
      targetSha: SHA,
      repository: 'renanescola40-afk/eurocomply_saas',
      runId: RUN_ID,
    }).passed).toBe(false);

    expect(validateDownloadedEvidence({ ...evidence, status: 'Open' }, {
      targetSha: SHA,
      repository: 'renanescola40-afk/eurocomply_saas',
      runId: RUN_ID,
    }).failures).toContain('evidence_not_complete');

    expect(validateDownloadedEvidence({
      ...evidence,
      evidenceIntegrity: { ...evidence.evidenceIntegrity, accessTokensStored: true },
    }, {
      targetSha: SHA,
      repository: 'renanescola40-afk/eurocomply_saas',
      runId: RUN_ID,
    }).failures).toContain('tokens_integrity_invalid');
  });

  it('automates protected main proof and exact-SHA scorecard consumption without widening permissions', () => {
    const runtimeWorkflow = readFileSync('.github/workflows/auth-rbac-runtime-proof.yml', 'utf8');
    const scorecardWorkflow = readFileSync('.github/workflows/enterprise-readiness-scorecard.yml', 'utf8');
    const fetcher = readFileSync('scripts/enterprise/fetch-auth-rbac-evidence.mjs', 'utf8');
    const workflowRunSources = scorecardWorkflow
      .split('\n')
      .find((line) => line.trim().startsWith('workflows:'));

    expect(runtimeWorkflow).toContain('push:\n    branches: [main]');
    expect(runtimeWorkflow).toContain('Verify exact current main checkout');
    expect(runtimeWorkflow).toContain('/commits/main');
    expect(runtimeWorkflow).toContain('environment: production');
    expect(runtimeWorkflow).toContain('persist-credentials: false');
    expect(runtimeWorkflow).not.toContain('pull_request_target');
    expect(runtimeWorkflow).not.toContain('contents: write');

    expect(workflowRunSources).toBeDefined();
    expect(workflowRunSources).toContain('Distributed Rate Limit Runtime Proof');
    expect(workflowRunSources).toContain('Auth RBAC Tenant Proof');
    expect(scorecardWorkflow).toContain('AUTH_RBAC_RUNTIME_SOURCE_RUN_ID');
    expect(scorecardWorkflow).toContain('node scripts/enterprise/fetch-auth-rbac-evidence.mjs');
    expect(scorecardWorkflow).toContain('node scripts/security/write-auth-rbac-scorecard-evidence.mjs');
    expect(scorecardWorkflow).toContain('node scripts/security/check-auth-rbac-scorecard-evidence.mjs');

    expect(fetcher).toContain("const WORKFLOW_NAME = 'Auth RBAC Tenant Proof'");
    expect(fetcher).toContain('auth-rbac-runtime-proof-${targetSha}');
    expect(fetcher).toContain("run?.head_branch === 'main'");
    expect(fetcher).toContain('removeStaleEvidence(root)');
  });
});
