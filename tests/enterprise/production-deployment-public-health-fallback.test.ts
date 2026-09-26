import { describe, expect, it } from 'vitest';

import { buildProductionDeploymentEvidence } from '../../scripts/release/write-github-vercel-production-deployment-evidence.mjs';

const SHA = '0c8fab0b1016ab9ffe3ecb21f9158858f5ed069d';
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const API = 'https://api.github.test';
const DEPLOYMENT_URL = 'https://eurocomply-saas-r7ny100el-renanescola40-afks-projects.vercel.app';
const CANONICAL_URL = 'https://www.risckcomply.com';

function json(value: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function protectedDeploymentFetch(canonicalStatus = 200, canonicalNoStore = true) {
  return async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url === `${API}/repos/${REPOSITORY}/commits/main`) return json({ sha: SHA });

    if (url.startsWith(`${API}/repos/${REPOSITORY}/deployments?sha=`)) {
      return json([{
        id: 101,
        sha: SHA,
        ref: 'main',
        task: 'deploy',
        environment: 'Production',
        created_at: '2026-09-26T18:04:59Z',
        updated_at: '2026-09-26T18:05:30Z',
      }]);
    }

    if (url === `${API}/repos/${REPOSITORY}/deployments/101/statuses?per_page=100`) {
      return json([{
        id: 202,
        state: 'success',
        creator: { login: 'vercel[bot]' },
        environment: 'Production',
        environment_url: DEPLOYMENT_URL,
        created_at: '2026-09-26T18:05:30Z',
        updated_at: '2026-09-26T18:05:30Z',
      }]);
    }

    if (url === `${DEPLOYMENT_URL}/api/health`) {
      return json(
        { status: 'protected' },
        302,
        {
          'cache-control': 'no-store, max-age=0',
          server: 'Vercel',
          'x-vercel-id': 'arn1::test',
          location: 'https://vercel.com/sso-api?url=https%3A%2F%2Feurocomply-saas-r7ny100el-renanescola40-afks-projects.vercel.app%2Fapi%2Fhealth',
        },
      );
    }

    if (url === `${CANONICAL_URL}/api/health`) {
      return json(
        { status: canonicalStatus === 200 ? 'ok' : 'failed' },
        canonicalStatus,
        { 'cache-control': canonicalNoStore ? 'no-store, private' : 'public, max-age=60' },
      );
    }

    throw new Error(`unexpected request: ${url}`);
  };
}

describe('canonical public health fallback after exact-SHA Vercel protection', () => {
  it('passes without HEALTHCHECK_TOKEN only after exact-SHA Production authority and Vercel SSO protection are proven', async () => {
    const evidence = await buildProductionDeploymentEvidence({
      repository: REPOSITORY,
      targetSha: SHA,
      token: 'github-token',
      healthcheckToken: '',
      protectionBypassSecret: '',
      fetchImpl: protectedDeploymentFetch(),
      sleepImpl: async () => undefined,
      apiUrl: API,
      maxAttempts: 1,
      pollMs: 0,
    });

    expect(evidence.status).toBe('PASS');
    expect(evidence.outcome).toBe('passed');
    expect(evidence.checks).toMatchObject({
      currentMainShaBound: true,
      exactShaProductionDeploymentFound: true,
      immutableDeploymentProtectionObserved: true,
      canonicalProductionHealthFallbackUsed: true,
      productionHealthOk: true,
      productionHealthNoStore: true,
    });
    expect(evidence.health).toMatchObject({
      path: '/api/health',
      status: 200,
      bodyStatus: 'ok',
      noStore: true,
      targetClass: 'canonical_public_production',
    });
    expect(JSON.stringify(evidence)).not.toContain('github-token');
  });

  it('remains fail-closed when canonical public health is unhealthy', async () => {
    const evidence = await buildProductionDeploymentEvidence({
      repository: REPOSITORY,
      targetSha: SHA,
      token: 'github-token',
      healthcheckToken: '',
      protectionBypassSecret: '',
      fetchImpl: protectedDeploymentFetch(503),
      sleepImpl: async () => undefined,
      apiUrl: API,
      maxAttempts: 1,
      pollMs: 0,
    });

    expect(evidence.status).toBe('OPEN');
    expect(evidence.outcome).toBe('failed');
    expect(evidence.blockers).toContain('immutable_deployment_health_blocked_by_vercel_protection');
  });

  it('remains fail-closed when canonical health is cacheable', async () => {
    const evidence = await buildProductionDeploymentEvidence({
      repository: REPOSITORY,
      targetSha: SHA,
      token: 'github-token',
      healthcheckToken: '',
      protectionBypassSecret: '',
      fetchImpl: protectedDeploymentFetch(200, false),
      sleepImpl: async () => undefined,
      apiUrl: API,
      maxAttempts: 1,
      pollMs: 0,
    });

    expect(evidence.status).toBe('OPEN');
    expect(evidence.blockers).toContain('immutable_deployment_health_blocked_by_vercel_protection');
  });
});
