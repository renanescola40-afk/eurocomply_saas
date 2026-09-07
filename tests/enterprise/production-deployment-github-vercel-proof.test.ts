import { describe, expect, it } from 'vitest';

import {
  buildProductionDeploymentEvidence,
  findExactShaVercelProductionDeployment,
} from '../../scripts/release/write-github-vercel-production-deployment-evidence.mjs';

const SHA = '8059a007670dca287297f47e2e70ca2d3171af2d';
const NEWER_SHA = '1111111111111111111111111111111111111111';
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const API = 'https://api.github.test';
const DEPLOYMENT_URL = 'https://eurocomply-saas-gdhajd6uu-renanescola40-afks-projects.vercel.app';
const CANONICAL_URL = 'https://www.risckcomply.com';

function jsonResponse(value: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function fixtureFetch(options: {
  actor?: string;
  deploymentSha?: string;
  deploymentRef?: string;
  environment?: string;
  deploymentHealthStatus?: number;
  deploymentHealthBodyStatus?: string;
  deploymentHealthNoStore?: boolean;
  canonicalHealthStatus?: number;
  mainShas?: string[];
  noDeployments?: boolean;
  exposeSuccessfulCommitStatus?: boolean;
} = {}) {
  const {
    actor = 'vercel[bot]',
    deploymentSha = SHA,
    deploymentRef = 'main',
    environment = 'Production',
    deploymentHealthStatus = 200,
    deploymentHealthBodyStatus = 'ok',
    deploymentHealthNoStore = true,
    canonicalHealthStatus = 200,
    mainShas = [SHA],
    noDeployments = false,
    exposeSuccessfulCommitStatus = false,
  } = options;
  let mainReadCount = 0;

  return async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url === `${API}/repos/${REPOSITORY}/commits/main`) {
      const index = Math.min(mainReadCount, mainShas.length - 1);
      const sha = mainShas[index] ?? SHA;
      mainReadCount += 1;
      return jsonResponse({ sha });
    }

    if (url.startsWith(`${API}/repos/${REPOSITORY}/deployments?sha=`)) {
      if (noDeployments) return jsonResponse([]);
      return jsonResponse([
        {
          id: 5870665773,
          sha: deploymentSha,
          ref: deploymentRef,
          task: 'deploy',
          environment,
          created_at: '2026-08-12T13:57:57Z',
          updated_at: '2026-08-12T14:00:53Z',
        },
      ]);
    }

    if (url === `${API}/repos/${REPOSITORY}/deployments/5870665773/statuses?per_page=100`) {
      return jsonResponse([
        {
          id: 16718722050,
          state: 'success',
          creator: { login: actor },
          environment,
          environment_url: DEPLOYMENT_URL,
          created_at: '2026-08-12T14:00:53Z',
          updated_at: '2026-08-12T14:00:53Z',
        },
      ]);
    }

    if (url === `${DEPLOYMENT_URL}/api/health`) {
      return jsonResponse(
        { status: deploymentHealthBodyStatus },
        deploymentHealthStatus,
        { 'cache-control': deploymentHealthNoStore ? 'no-store, private' : 'public, max-age=60' },
      );
    }

    if (url === `${CANONICAL_URL}/api/health`) {
      return jsonResponse(
        { status: canonicalHealthStatus === 200 ? 'ok' : 'failed' },
        canonicalHealthStatus,
        { 'cache-control': 'no-store, private' },
      );
    }

    if (url === `${API}/repos/${REPOSITORY}/commits/${SHA}/status` && exposeSuccessfulCommitStatus) {
      throw new Error('commit status endpoint must never be used as Production authority');
    }

    return jsonResponse({ error: 'unexpected request', url }, 404);
  };
}

describe('exact-SHA Vercel production deployment proof', () => {
  it('accepts only an explicit Vercel Production deployment status bound to current main and immutable no-store health', async () => {
    const evidence = await buildProductionDeploymentEvidence({
      repository: REPOSITORY,
      targetSha: SHA,
      token: 'test-token',
      fetchImpl: fixtureFetch(),
      sleepImpl: async () => undefined,
      apiUrl: API,
      maxAttempts: 1,
      pollMs: 0,
    });

    expect(evidence.status).toBe('PASS');
    expect(evidence.outcome).toBe('passed');
    expect(evidence.targetSha).toBe(SHA);
    expect(evidence.deployment).toMatchObject({
      proofSource: 'github_deployment_status',
      id: 5870665773,
      statusId: 16718722050,
      actor: 'vercel[bot]',
      status: 'success',
    });
    expect(evidence.health).toMatchObject({
      path: '/api/health',
      status: 200,
      bodyStatus: 'ok',
      noStore: true,
      targetClass: 'immutable_vercel_deployment',
    });
    expect(evidence.evidenceIntegrity).toMatchObject({
      exactShaBound: true,
      githubDeploymentBound: true,
      githubCommitStatusBound: false,
      liveHealthVerified: true,
    });
    expect(evidence.truthBoundary).toContain('Preview deployments are never accepted');
    expect(JSON.stringify(evidence)).not.toContain('test-token');
    expect(JSON.stringify(evidence)).not.toContain('https://');
  });

  it('keeps Production OPEN when only a Vercel commit status exists, even if canonical Production health is green', async () => {
    const evidence = await buildProductionDeploymentEvidence({
      repository: REPOSITORY,
      targetSha: SHA,
      token: 'test-token',
      fetchImpl: fixtureFetch({
        noDeployments: true,
        exposeSuccessfulCommitStatus: true,
        canonicalHealthStatus: 200,
      }),
      sleepImpl: async () => undefined,
      apiUrl: API,
      maxAttempts: 1,
      pollMs: 0,
    });

    expect(evidence.status).toBe('OPEN');
    expect(evidence.blockers).toContain('exact_vercel_production_deployment_unproven');
    expect(evidence.evidenceIntegrity?.githubDeploymentBound).toBe(false);
    expect(evidence.evidenceIntegrity?.githubCommitStatusBound).toBe(false);
  });

  it('rejects an exact-SHA Preview deployment even when its status is green', async () => {
    const evidence = await buildProductionDeploymentEvidence({
      repository: REPOSITORY,
      targetSha: SHA,
      token: 'test-token',
      fetchImpl: fixtureFetch({ environment: 'Preview', canonicalHealthStatus: 200 }),
      sleepImpl: async () => undefined,
      apiUrl: API,
      maxAttempts: 1,
      pollMs: 0,
    });

    expect(evidence.status).toBe('OPEN');
    expect(evidence.blockers).toContain('exact_vercel_production_deployment_unproven');
  });

  it('does not substitute canonical Production health when the immutable exact-SHA Production deployment is protected or unhealthy', async () => {
    const evidence = await buildProductionDeploymentEvidence({
      repository: REPOSITORY,
      targetSha: SHA,
      token: 'test-token',
      fetchImpl: fixtureFetch({
        deploymentHealthStatus: 401,
        deploymentHealthBodyStatus: 'protected',
        deploymentHealthNoStore: true,
        canonicalHealthStatus: 200,
      }),
      sleepImpl: async () => undefined,
      apiUrl: API,
      maxAttempts: 1,
      pollMs: 0,
    });

    expect(evidence.status).toBe('OPEN');
    expect(evidence.blockers).toContain('production_deployment_health_unproven');
    expect(evidence.evidenceIntegrity?.githubDeploymentBound).toBe(true);
    expect(evidence.evidenceIntegrity?.githubCommitStatusBound).toBe(false);
  });

  it('fails closed if main advances after polling before PASS', async () => {
    const evidence = await buildProductionDeploymentEvidence({
      repository: REPOSITORY,
      targetSha: SHA,
      token: 'test-token',
      fetchImpl: fixtureFetch({ mainShas: [SHA, NEWER_SHA] }),
      sleepImpl: async () => undefined,
      apiUrl: API,
      maxAttempts: 1,
      pollMs: 0,
    });

    expect(evidence.status).toBe('OPEN');
    expect(evidence.blockers).toContain('target_sha_is_not_current_main');
    expect(evidence.checks?.currentMainShaBound).toBe(false);
  });

  it('rejects a deployment success not created by the Vercel GitHub integration', async () => {
    const deployment = await findExactShaVercelProductionDeployment({
      repository: REPOSITORY,
      targetSha: SHA,
      token: 'test-token',
      fetchImpl: fixtureFetch({ actor: 'github-actions[bot]' }),
      apiUrl: API,
    });

    expect(deployment).toBeNull();
  });

  it('rejects a deployment whose ref or SHA is not the exact current main target', async () => {
    const wrongRef = await findExactShaVercelProductionDeployment({
      repository: REPOSITORY,
      targetSha: SHA,
      token: 'test-token',
      fetchImpl: fixtureFetch({ deploymentRef: 'agent/preview' }),
      apiUrl: API,
    });
    const wrongSha = await findExactShaVercelProductionDeployment({
      repository: REPOSITORY,
      targetSha: SHA,
      token: 'test-token',
      fetchImpl: fixtureFetch({ deploymentSha: NEWER_SHA }),
      apiUrl: API,
    });

    expect(wrongRef).toBeNull();
    expect(wrongSha).toBeNull();
  });

  it('keeps the control open when immutable deployment health is not no-store', async () => {
    const evidence = await buildProductionDeploymentEvidence({
      repository: REPOSITORY,
      targetSha: SHA,
      token: 'test-token',
      fetchImpl: fixtureFetch({ deploymentHealthNoStore: false }),
      sleepImpl: async () => undefined,
      apiUrl: API,
      maxAttempts: 1,
      pollMs: 0,
    });

    expect(evidence.status).toBe('OPEN');
    expect(evidence.outcome).toBe('failed');
    expect(evidence.blockers).toContain('production_deployment_health_unproven');
    expect(evidence.checks?.productionHealthNoStore).toBe(false);
  });
});
