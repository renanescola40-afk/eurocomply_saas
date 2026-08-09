import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildProductionRuntimeScorecardEvidence } from '../../scripts/security/write-production-runtime-scorecard-evidence.mjs';
import {
  isOptionalWorkflowUnavailable,
  normalizeDeploymentSmokeEvidence,
  removeStaleProductionRuntimeEvidence,
  selectExactShaRun,
  validateDownloadedEvidence,
} from '../../scripts/enterprise/fetch-production-runtime-evidence.mjs';
import { p0EvidenceCatalog } from '../../scripts/security/p0-runtime-evidence-catalog.mjs';

const SHA = 'a'.repeat(40);
const RUN_ID = '123';
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const CANONICAL_PRODUCTION_URL = 'https://www.risckcomply.com';
const CANONICAL_PRODUCTION_HOST = 'www.risckcomply.com';
const WORKFLOW_PATH = '.github/workflows/production-runtime-proof.yml';

function source() {
  return {
    smoke: {
      evidenceItem: 'deployment-smoke-validation',
      status: 'Complete',
      outcome: 'passed',
      generatedAt: '2026-08-09T13:00:00.000Z',
      reviewedAt: '2026-08-09T13:00:00.000Z',
      reviewer: 'RISCK COMPLY protected runtime automation',
      failures: [],
      globalChecks: [
        { name: 'lastCommitValidated', passed: true, details: { sha: SHA } },
        { name: 'buildShaRegistered', passed: true, details: { sha: SHA } },
      ],
      targets: [{
        baseUrl: CANONICAL_PRODUCTION_URL,
        passed: true,
        detailedChecks: [
          { name: 'securityHeadersPresent', passed: true },
          { name: 'sensitiveApisHaveNoStore', passed: true },
          { name: 'privateRoutesHaveNoStore', passed: true },
          { name: 'healthEndpointOk', passed: true },
          { name: 'readyEndpointRejectsAnonymous', passed: true },
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
    const evidence = buildProductionRuntimeScorecardEvidence(smoke, sha, SHA, '2026-08-09T13:00:00.000Z');

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

  it('normalizes a successful focused production proof into the canonical P0 deployment contract', () => {
    const { smoke } = source();
    const normalized = normalizeDeploymentSmokeEvidence(smoke, {
      targetSha: SHA,
      repository: REPOSITORY,
      runId: RUN_ID,
    });

    expect(normalized.runtimeContext).toEqual({
      generatedByGithubActions: true,
      repository: REPOSITORY,
      branch: 'main',
      commitSha: SHA,
      githubRunId: RUN_ID,
    });
    expect(normalized.targets[0].checks).toEqual({
      healthOk: true,
      readyProtected: true,
      readyOk: true,
      securityHeadersOk: true,
      sensitiveNoStoreOk: true,
    });
    expect(normalized.smokeTargets).toEqual({ passed: [CANONICAL_PRODUCTION_HOST], failed: [] });

    const entry = p0EvidenceCatalog.find((candidate) => candidate.item === 'Deployment URL functional verification');
    const validator = entry?.validator;
    expect(validator).toBeDefined();
    if (!validator) throw new Error('Deployment P0 validator missing');
    expect(validator(normalized, {
      now: new Date('2026-08-09T13:05:00.000Z'),
      expectedRepository: REPOSITORY,
      expectedBranch: 'main',
      expectedCommitSha: SHA,
    })).toEqual([]);
  });

  it('fails closed for stale SHA, wrong host, incomplete readiness or sensitive evidence', () => {
    const { smoke, sha } = source();
    expect(buildProductionRuntimeScorecardEvidence(smoke, sha, 'b'.repeat(40)).outcome).toBe('not_verified');
    expect(buildProductionRuntimeScorecardEvidence({ ...smoke, targets: [{ ...smoke.targets[0], baseUrl: 'https://preview.example.com' }] }, sha, SHA).outcome).toBe('not_verified');
    expect(buildProductionRuntimeScorecardEvidence({ ...smoke, targets: [{ ...smoke.targets[0], detailedChecks: smoke.targets[0].detailedChecks.map((check) => check.name === 'readyEndpointOkWithToken' ? { ...check, passed: false } : check) }] }, sha, SHA).outcome).toBe('not_verified');
    expect(buildProductionRuntimeScorecardEvidence({ ...smoke, evidenceIntegrity: { ...smoke.evidenceIntegrity, containsSensitiveValues: true } }, sha, SHA).outcome).toBe('not_verified');

    expect(() => normalizeDeploymentSmokeEvidence({
      ...smoke,
      targets: [{ ...smoke.targets[0], detailedChecks: smoke.targets[0].detailedChecks.map((check) => check.name === 'readyEndpointOkWithToken' ? { ...check, passed: false } : check) }],
    }, { targetSha: SHA, repository: REPOSITORY, runId: RUN_ID })).toThrow('deployment_smoke_normalization_failed');
  });

  it('selects only successful exact-main-SHA runs from the production workflow path', () => {
    const run = { id: Number(RUN_ID), name: `Production runtime proof for ${SHA}`, path: WORKFLOW_PATH, head_sha: SHA, head_branch: 'main', status: 'completed', conclusion: 'success', updated_at: '2026-08-09T13:00:00Z' };
    expect(selectExactShaRun([
      { ...run, id: 1, conclusion: 'failure' },
      { ...run, id: 2, head_branch: 'feature' },
      { ...run, id: 3, path: '.github/workflows/other.yml' },
      run,
    ], SHA)).toEqual(run);
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

  it('clears only production-owned aggregate, smoke and release lineage before runtime discovery', () => {
    const root = mkdtempSync(join(tmpdir(), 'production-runtime-evidence-'));
    try {
      const directory = join(root, 'docs/security/evidence/runtime');
      mkdirSync(directory, { recursive: true });
      const production = join(directory, 'production-runtime-validation.json');
      const smoke = join(directory, 'deployment-smoke-validation.json');
      const releaseSha = join(directory, 'runtime-release-sha-validation.json');
      const headers = join(directory, 'security-headers-validation.json');
      const noStore = join(directory, 'no-store-validation.json');
      for (const path of [production, smoke, releaseSha]) writeFileSync(path, '{}\n');
      writeFileSync(headers, '{"source":"repository"}\n');
      writeFileSync(noStore, '{"source":"repository"}\n');

      removeStaleProductionRuntimeEvidence(root);

      expect(existsSync(production)).toBe(false);
      expect(existsSync(smoke)).toBe(false);
      expect(existsSync(releaseSha)).toBe(false);
      expect(readFileSync(headers, 'utf8')).toContain('repository');
      expect(readFileSync(noStore, 'utf8')).toContain('repository');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('does not dump producer-specific contracts into the global P0 evidence directory', () => {
    const fetcher = readFileSync('scripts/enterprise/fetch-production-runtime-evidence.mjs', 'utf8');
    expect(fetcher).toContain('normalizeDeploymentSmokeEvidence');
    expect(fetcher).toContain('writeFileSync(output, `${JSON.stringify(normalizedDeploymentEvidence, null, 2)}\\n`');
    expect(fetcher).not.toContain('for (const [path, evidence] of Object.entries(bundle))');
  });

  it('uses a protected read-only runtime workflow and maps only the intended controls', () => {
    const workflow = readFileSync('.github/workflows/production-runtime-proof.yml', 'utf8');
    const smokeProof = readFileSync('scripts/release/run-production-runtime-response-proof.mjs', 'utf8');
    const fetcher = readFileSync('scripts/enterprise/fetch-production-runtime-evidence.mjs', 'utf8');
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
    expect(fetcher).toContain("const WORKFLOW_PATH = `.github/workflows/${WORKFLOW_FILE}`");
    expect(fetcher).toContain('run?.path === WORKFLOW_PATH');
    expect(workflow).not.toContain('pull_request_target');
    expect(Object.keys(mapped).filter((id) => id.startsWith('SEC-') || id.startsWith('REL-'))).toEqual([
      'SEC-05', 'SEC-06', 'REL-02', 'REL-03', 'REL-04', 'REL-05', 'REL-06',
    ]);
  });
});
