import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { buildProductionRuntimeScorecardEvidence } from '../../scripts/security/write-production-runtime-scorecard-evidence.mjs';
import { selectExactShaRun, validateDownloadedEvidence } from '../../scripts/enterprise/fetch-production-runtime-evidence.mjs';

const SHA = 'a'.repeat(40);

function source() {
  return {
    smoke: {
      evidenceItem: 'deployment-smoke-validation',
      status: 'Complete',
      outcome: 'passed',
      failures: [],
      globalChecks: [
        { name: 'lastCommitValidated', passed: true, details: { sha: SHA } },
        { name: 'buildShaRegistered', passed: true, details: { sha: SHA } },
      ],
      targets: [{
        baseUrl: 'https://risckcomply.com',
        detailedChecks: [
          { name: 'securityHeadersPresent', passed: true },
          { name: 'sensitiveApisHaveNoStore', passed: true },
          { name: 'privateRoutesHaveNoStore', passed: true },
          { name: 'healthEndpointOk', passed: true },
          { name: 'readyEndpointOkWithToken', passed: true },
          { name: 'readyEndpointDoesNotExposeSecrets', passed: true },
          { name: 'publicLaunchPagesLoad', passed: true },
          { name: 'dashboardRequiresAuthentication', passed: true },
        ],
      }],
      evidenceIntegrity: {
        containsSensitiveValues: false,
        valuesRedacted: true,
        authorizationHeaderStored: false,
        cookiesStored: false,
      },
    },
    sha: {
      schema: 'risck-comply.runtime-release-sha-validation.v1',
      evidenceItem: 'runtime-release-sha-validation',
      status: 'Complete',
      outcome: 'passed',
      targetHost: 'risckcomply.com',
      expectedCommitSha: SHA,
      expectedBuildSha: SHA,
      observedCommitSha: SHA,
      observedCommitShaMatchedExpected: true,
      checks: [{ name: 'all', passed: true }],
      failures: [],
      evidenceIntegrity: {
        containsSensitiveValues: false,
        valuesRedacted: true,
        authorizationHeaderStored: false,
        cookiesStored: false,
        rawNetworkPayloadStored: false,
        mismatchedObservedShaStored: false,
      },
    },
  };
}

describe('production runtime scorecard evidence', () => {
  it('promotes exactly the five release checks from an exact production SHA', () => {
    const { smoke, sha } = source();
    const evidence = buildProductionRuntimeScorecardEvidence(smoke, sha, SHA, '2026-07-18T22:00:00.000Z');

    expect(evidence.status).toBe('Complete');
    expect(evidence.outcome).toBe('passed');
    expect(evidence.checks.map((check) => check.name)).toEqual([
      'deploymentShaMatch',
      'productionHostname',
      'health',
      'readiness',
      'deploymentSmoke',
    ]);
    expect(validateDownloadedEvidence(evidence, { targetSha: SHA })).toEqual({ passed: true, failures: [] });
  });

  it('fails closed for stale SHA, wrong host, incomplete readiness or sensitive evidence', () => {
    const { smoke, sha } = source();
    expect(buildProductionRuntimeScorecardEvidence(smoke, sha, 'b'.repeat(40)).outcome).toBe('not_verified');
    expect(buildProductionRuntimeScorecardEvidence({ ...smoke, targets: [{ ...smoke.targets[0], baseUrl: 'https://preview.example.com' }] }, sha, SHA).outcome).toBe('not_verified');
    expect(buildProductionRuntimeScorecardEvidence({ ...smoke, targets: [{ ...smoke.targets[0], detailedChecks: smoke.targets[0].detailedChecks.map((check) => check.name === 'readyEndpointOkWithToken' ? { ...check, passed: false } : check) }] }, sha, SHA).outcome).toBe('not_verified');
    expect(buildProductionRuntimeScorecardEvidence({ ...smoke, evidenceIntegrity: { ...smoke.evidenceIntegrity, containsSensitiveValues: true } }, sha, SHA).outcome).toBe('not_verified');
  });

  it('selects only successful exact-main-SHA workflow runs', () => {
    const run = { id: 123, name: 'Production Runtime Proof', head_sha: SHA, head_branch: 'main', status: 'completed', conclusion: 'success', updated_at: '2026-07-18T22:00:00Z' };
    expect(selectExactShaRun([{ ...run, id: 1, conclusion: 'failure' }, { ...run, id: 2, head_branch: 'feature' }, run], SHA)).toEqual(run);
    expect(selectExactShaRun([run], SHA, '999')).toBeNull();
  });

  it('uses a protected read-only runtime workflow and maps only the intended controls', () => {
    const workflow = readFileSync('.github/workflows/production-runtime-proof.yml', 'utf8');
    const overrides = JSON.parse(readFileSync('docs/enterprise/evidence-overrides.json', 'utf8'));
    const mapped = Object.fromEntries(overrides.overrides.map((entry: { controlId: string; evidence: unknown }) => [entry.controlId, entry.evidence]));

    expect(workflow).toContain('environment: Production');
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).toContain('test "$MAIN_SHA" = "$TARGET_SHA"');
    expect(workflow).toContain('https://risckcomply.com');
    expect(workflow).not.toContain('pull_request_target');
    expect(Object.keys(mapped).filter((id) => id.startsWith('SEC-') || id.startsWith('REL-'))).toEqual([
      'SEC-05', 'SEC-06', 'REL-02', 'REL-03', 'REL-04', 'REL-05', 'REL-06',
    ]);
  });
});
