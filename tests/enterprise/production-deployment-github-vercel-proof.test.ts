import { describe, expect, it } from 'vitest';

import {
  buildProductionDeploymentEvidence,
  findExactShaVercelCommitStatus,
  findExactShaVercelProductionDeployment,
} from '../../scripts/release/write-github-vercel-production-deployment-evidence.mjs';

const SHA = '8059a007670dca287297f47e2e70ca2d3171af2d';
const NEWER_SHA = '1111111111111111111111111111111111111111';
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const API = 'https://api.github.test';
const DEPLOYMENT_URL = 'https://eurocomply-saas-gdhajd6uu-renanescola40-afks-projects.vercel.app';
const CANONICAL_URL = 'https://www.risckcomply.com';
const INSPECTOR_URL = 'https://vercel.com/renanescola40-afks-projects/eurocomply-saas/GNiVwyNHt5ocuy5BURnBkoP2SRUF';

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
  healthStatus?: number;
  healthBodyStatus?: string;
  healthNoStore?: boolean;
  mainShas?: string[];
  useCommitStatus?: boolean;
  commitStatusState?: string;
  commitStatusContext?: string;
  commitStatusTarget?: string;
  commitStatusSha?: string;
} = {}) {
  const {
    actor = 'vercel[bot]',
    deploymentSha = SHA,
    deploymentRef = 'main',
    environment = 'Production',
    healthStatus = 200,
    healthBodyStatus = 'ok',
    healthNoStore = true,
    mainShas = [SHA],
    useCommitStatus = false,
    commitStatusState = 'success',
    commitStatusContext = 'Vercel',
    commitStatusTarget = INSPECTOR_URL,
    commitStatusSha = SHA,
  } = options;
  let mainReadCount = 0;

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url === `${API}/repos/${REPOSITORY}/commits/main`) {
      const index = Math.min(mainReadCount, mainShas.length - 1);
      const sha = mainShas[index] ?? SHA;
      mainReadCount += 1;
      return jsonResponse({ sha });
    }

    if (url.startsWith(`${API}/repos/${REPOSITORY}/deployments?sha=`)) {
      if (useCommitStatus) return jsonResponse([]);
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

    if (url === `${API}/repos/${REPOSITORY}/commits/${SHA}/status`) {
      return jsonResponse({
        sha: commitStatusSha,
        statuses: [
          {
            id: 52109600867,
            state: commitStatusState,
            context: commitStatusContext,
            target_url: commitStatusTarget,
            created_at: '2026-08-12T15:17:40Z',
            updated_at: '2026-08-12T15:17:40Z',
          },
        ],
      });
    }

    if (url === `${DEPLOYMENT_URL}/api/health` || url === `${CANONICAL_URL}/api/health`) {
      return jsonResponse(
        { status: healthBodyStatus },
        healthStatus,
        { 'cache-control': healthNoStore ? 'no-store, private' : 'public, max-age=60' },
      );
    }

    return jsonResponse({ error: 'unexpected request', url }, 404);
  };
}

describe('exact-SHA Vercel production deployment proof', () => {
  it('accepts a Vercel deployment status bound to current main and immutable no-store health', async () => {
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
      tokenPersisted: false,
      protectionBypassSecretPersisted: false,
    });
    expect(JSON.stringify(evidence)).not.toContain('test-token');
    expect(JSON.stringify(evidence)).not.toContain('https://');
  });

  it('accepts the exact-SHA Vercel commit status when GitHub Deployment objects are not published', async () => {
    const evidence = await buildProductionDeploymentEvidence({
      repository: REPOSITORY,
      targetSha: SHA,
      token: 'test-token',
      fetchImpl: fixtureFetch({ useCommitStatus: true }),
      sleepImpl: async () => undefined,
      apiUrl: API,
      maxAttempts: 1,
      pollMs: 0,
    });

    expect(evidence.status).toBe('PASS');
    expect(evidence.deployment).toMatchObject({
      proofSource: 'github_commit_status',
      statusId: 52109600867,
      providerDeploymentId: 'GNiVwyNHt5ocuy5BURnBkoP2SRUF',
      targetHost: 'www.risckcomply.com',
      actor: 'Vercel',
    });
    expect(evidence.health).toMatchObject({
      targetClass: 'canonical_production_origin',
      status: 200,
      bodyStatus: 'ok',
      noStore: true,
    });
    expect(evidence.evidenceIntegrity).toMatchObject({
      exactShaBound: true,
      githubDeploymentBound: false,
      githubCommitStatusBound: true,
      uniqueProviderDeploymentIdBound: true,
      liveHealthVerified: true,
    });
    expect(evidence.truthBoundary).toContain('does not claim that the health probe itself was sent to the immutable deployment URL');
    expect(JSON.stringify(evidence)).not.toContain(INSPECTOR_URL);
    expect(JSON.stringify(evidence)).not.toContain(CANONICAL_URL);
  });

  it('rejects spoofed or non-success Vercel commit statuses', async () => {
    const wrongHost = await findExactShaVercelCommitStatus({
      repository: REPOSITORY,
      targetSha: SHA,
      token: 'test-token',
      fetchImpl: fixtureFetch({ useCommitStatus: true, commitStatusTarget: 'https://example.com/deploy/12345678' }),
      apiUrl: API,
    });
    const wrongContext = await findExactShaVercelCommitStatus({
      repository: REPOSITORY,
      targetSha: SHA,
      token: 'test-token',
      fetchImpl: fixtureFetch({ useCommitStatus: true, commitStatusContext: 'vercel-preview' }),
      apiUrl: API,
    });
    const failure = await findExactShaVercelCommitStatus({
      repository: REPOSITORY,
      targetSha: SHA,
      token: 'test-token',
      fetchImpl: fixtureFetch({ useCommitStatus: true, commitStatusState: 'failure' }),
      apiUrl: API,
    });
    const wrongSha = await findExactShaVercelCommitStatus({
      repository: REPOSITORY,
      targetSha: SHA,
      token: 'test-token',
      fetchImpl: fixtureFetch({ useCommitStatus: true, commitStatusSha: NEWER_SHA }),
      apiUrl: API,
    });

    expect(wrongHost).toBeNull();
    expect(wrongContext).toBeNull();
    expect(failure).toBeNull();
    expect(wrongSha).toBeNull();
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

  it('keeps the control open when deployment health is not no-store', async () => {
    const evidence = await buildProductionDeploymentEvidence({
      repository: REPOSITORY,
      targetSha: SHA,
      token: 'test-token',
      fetchImpl: fixtureFetch({ useCommitStatus: true, healthNoStore: false }),
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
