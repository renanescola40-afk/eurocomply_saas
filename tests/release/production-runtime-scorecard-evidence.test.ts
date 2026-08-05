import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildProductionRuntimeScorecardEvidence } from '../../scripts/security/write-production-runtime-scorecard-evidence.mjs';
import {
  isOptionalWorkflowUnavailable,
  removeStaleProductionRuntimeEvidence,
  selectExactShaRun,
  validateDownloadedEvidence,
} from '../../scripts/enterprise/fetch-production-runtime-evidence.mjs';

const SHA = 'a'.repeat(40);
const CANONICAL_PRODUCTION_URL = 'https://www.risckcomply.com';
const CANONICAL_PRODUCTION_HOST = 'www.risckcomply.com';

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
        baseUrl: CANONICAL_PRODUCTION_URL,
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
      targetHost: CANONICAL_PRODUCTION_HOST,
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

  it('treats only an optional unregistered workflow as absent before merge', () => {
    const missing = Object.assign(new Error('github_api_404'), { status: 404 });
    const unauthorized = Object.assign(new Error('github_api_401'), { status: 401 });

    expect(isOptionalWorkflowUnavailable(missing)).toBe(true);
    expect(isOptionalWorkflowUnavailable(missing, { required: true })).toBe(false);
    expect(isOptionalWorkflowUnavailable(missing, { sourceRunId: '123' })).toBe(false);
    expect(isOptionalWorkflowUnavailable(unauthorized)).toBe(false);
  });

  it('clears only production-owned evidence before runtime discovery', () => {
    const root = mkdtempSync(join(tmpdir(), 'production-runtime-evidence-'));
    try {
      const directory = join(root, 'docs/security/evidence/runtime');
      mkdirSync(directory, { recursive: true });
      const production = join(directory, 'production-runtime-validation.json');
      const headers = join(directory, 'security-headers-validation.json');
      const noStore = join(directory, 'no-store-validation.json');
      writeFileSync(production, '{}\n');
      writeFileSync(headers, '{"source":"repository"}\n');
      writeFileSync(noStore, '{"source":"repository"}\n');

      removeStaleProductionRuntimeEvidence(root);

      expect(existsSync(production)).toBe(false);
      expect(readFileSync(headers, 'utf8')).toContain('repository');
      expect(readFileSync(noStore, 'utf8')).toContain('repository');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('uses a protected read-only runtime workflow and maps only the intended controls', () => {
    const workflow = readFileSync('.github/workflows/production-runtime-proof.yml', 'utf8');
    const smokeProof = readFileSync('scripts/release/run-production-runtime-response-proof.mjs', 'utf8');
    const overrides = JSON.parse(readFileSync('docs/enterprise/evidence-overrides.json', 'utf8'));
    const mapped = Object.fromEntries(overrides.overrides.map((entry: { controlId: string; evidence: unknown }) => [entry.controlId, entry.evidence]));

    expect(workflow).toContain('environment: Production');
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).toContain('test "$MAIN_SHA" = "$TARGET_SHA"');
    expect(workflow).toContain(CANONICAL_PRODUCTION_URL);
    expect(smokeProof).toContain("const CANONICAL_HOST = 'www.risckcomply.com'");
    expect(smokeProof).toContain("parsedBaseUrl.protocol !== 'https:'");
    expect(smokeProof).toContain("parsedBaseUrl.hostname.toLowerCase() !== CANONICAL_HOST");
    expect(workflow).not.toContain('pull_request_target');
    expect(Object.keys(mapped).filter((id) => id.startsWith('SEC-') || id.startsWith('REL-'))).toEqual([
      'SEC-05', 'SEC-06', 'REL-02', 'REL-03', 'REL-04', 'REL-05', 'REL-06',
    ]);
  });
});
