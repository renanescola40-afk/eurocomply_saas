import { describe, expect, it } from 'vitest';

import {
  buildProductionDeploymentEvidence,
  findExactShaVercelProductionDeployment,
} from '../../scripts/release/write-github-vercel-production-deployment-evidence.mjs';

const SHA = '8059a007670dca287297f47e2e70ca2d3171af2d';
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const API = 'https://api.github.test';
const DEPLOYMENT_URL = 'https://eurocomply-saas-gdhajd6uu-renanescola40-afks-projects.vercel.app';

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
} = {}) {
  const {
    actor = 'vercel[bot]',
    deploymentSha = SHA,
    deploymentRef = 'main',
    environment = 'Production',
    healthStatus = 200,
    healthBodyStatus = 'ok',
    healthNoStore = true,
  } = options;

  return async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url === `${API}/repos/${REPOSITORY}/commits/main`) {
      return jsonResponse({ sha: SHA });
    }

    if (url.startsWith(`${API}/repos/${REPOSITORY}/deployments?sha=`)) {
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
        { status: healthBodyStatus },
        healthStatus,
        { 'cache-control': healthNoStore ? 'no-store, private' : 'public, max-age=60' },
      );
    }

    return jsonResponse({ error: 'unexpected request', url }, 404);
  };
}

describe('exact-SHA Vercel production deployment proof', () => {
  it('accepts only a Vercel success deployment bound to current main and live no-store health', async () => {
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
    expect(evidence.commitSha).toBe(SHA);
    expect(evidence.deployment).toMatchObject({
      id: 5870665773,
      statusId: 16718722050,
      actor: 'vercel[bot]',
      status: 'success',
    });
    expect(evidence.health).toEqual({
      path: '/api/health',
      status: 200,
      bodyStatus: 'ok',
      noStore: true,
    });
    expect(evidence.evidenceIntegrity).toMatchObject({
      containsSensitiveValues: false,
      exactShaBound: true,
      githubDeploymentBound: true,
      liveHealthVerified: true,
      tokenPersisted: false,
    });
    expect(JSON.stringify(evidence)).not.toContain('test-token');
    expect(JSON.stringify(evidence)).not.toContain('https://');
  });

  it('rejects a success status not created by the Vercel GitHub integration', async () => {
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
      fetchImpl: fixtureFetch({ deploymentSha: '1111111111111111111111111111111111111111' }),
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
      fetchImpl: fixtureFetch({ healthNoStore: false }),
      sleepImpl: async () => undefined,
      apiUrl: API,
      maxAttempts: 1,
      pollMs: 0,
    });

    expect(evidence.status).toBe('OPEN');
    expect(evidence.outcome).toBe('failed');
    expect(evidence.blockers).toContain('exact_deployment_health_unproven');
    expect(evidence.checks?.exactDeploymentHealthNoStore).toBe(false);
  });
});
