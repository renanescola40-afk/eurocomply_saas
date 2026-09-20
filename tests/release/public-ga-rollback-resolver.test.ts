import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getGitHubActionsOidcToken,
  normalizeDeploymentUrl,
  protectedHealthProbe,
  runResolver,
  selectRollbackCandidate,
} from '../../scripts/release/resolve-public-production-rollback.mjs';

const releaseSha = 'b'.repeat(40);
const priorSha = 'a'.repeat(40);

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  delete process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  delete process.env.VERCEL_TOKEN;
  delete process.env.VERCEL_ORG_ID;
  delete process.env.VERCEL_PROJECT_ID;
  delete process.env.RELEASE_SHA;
  delete process.env.CURRENT_VERCEL_DEPLOYMENT_ID;
  delete process.env.GITHUB_REPOSITORY;
  delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
});

describe('Public GA rollback resolver contract', () => {
  it('selects only an older READY production deployment from main in the same repository', () => {
    const selected = selectRollbackCandidate([
      {
        uid: 'dpl_current123',
        url: 'current.example.vercel.app',
        created: 300,
        state: 'READY',
        target: 'production',
        meta: {
          githubCommitSha: releaseSha,
          githubCommitRef: 'main',
          githubRepo: 'eurocomply_saas',
          githubOrg: 'renanescola40-afk',
        },
      },
      {
        uid: 'dpl_preview123',
        url: 'preview.example.vercel.app',
        created: 250,
        state: 'READY',
        target: null,
        meta: {
          githubCommitSha: 'c'.repeat(40),
          githubCommitRef: 'feature',
          githubRepo: 'eurocomply_saas',
          githubOrg: 'renanescola40-afk',
        },
      },
      {
        uid: 'dpl_previous123',
        url: 'previous.example.vercel.app',
        created: 200,
        state: 'READY',
        target: 'production',
        meta: {
          githubCommitSha: priorSha,
          githubCommitRef: 'main',
          githubRepo: 'eurocomply_saas',
          githubOrg: 'renanescola40-afk',
        },
      },
    ], {
      releaseSha,
      currentDeploymentId: 'dpl_current123',
      currentCreatedAt: 300,
      repository: 'renanescola40-afk/eurocomply_saas',
    });

    expect(selected).toEqual({
      id: 'dpl_previous123',
      sha: priorSha,
      url: 'https://previous.example.vercel.app',
      createdAt: 200,
    });
  });

  it('rejects future, non-production, non-ready and wrong-repository deployments', () => {
    const selected = selectRollbackCandidate([
      {
        uid: 'dpl_future123',
        url: 'future.example.vercel.app',
        created: 400,
        state: 'READY',
        target: 'production',
        meta: {
          githubCommitSha: priorSha,
          githubCommitRef: 'main',
          githubRepo: 'eurocomply_saas',
          githubOrg: 'renanescola40-afk',
        },
      },
      {
        uid: 'dpl_wrongrepo123',
        url: 'wrong.example.vercel.app',
        created: 200,
        state: 'READY',
        target: 'production',
        meta: {
          githubCommitSha: priorSha,
          githubCommitRef: 'main',
          githubRepo: 'other_repo',
          githubOrg: 'renanescola40-afk',
        },
      },
      {
        uid: 'dpl_error123',
        url: 'error.example.vercel.app',
        created: 150,
        state: 'ERROR',
        target: 'production',
        meta: {
          githubCommitSha: priorSha,
          githubCommitRef: 'main',
          githubRepo: 'eurocomply_saas',
          githubOrg: 'renanescola40-afk',
        },
      },
    ], {
      releaseSha,
      currentDeploymentId: 'dpl_current123',
      currentCreatedAt: 300,
      repository: 'renanescola40-afk/eurocomply_saas',
    });

    expect(selected).toBeNull();
  });

  it('retrieves a GitHub Actions OIDC token only from the runner OIDC endpoint', async () => {
    process.env.ACTIONS_ID_TOKEN_REQUEST_URL = 'https://oidc.actions.githubusercontent.com/token';
    process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN = 'runner-request-token';
    const jwt = 'header.payload.signature';

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ value: jwt }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(getGitHubActionsOidcToken(5000)).resolves.toBe(jwt);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0].toString()).toBe(
      'https://oidc.actions.githubusercontent.com/token',
    );
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer runner-request-token',
    });
  });

  it('uses the trusted OIDC header for protected Vercel health checks', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(
      protectedHealthProbe(
        'https://previous.example.vercel.app',
        'header.payload.signature',
        5000,
      ),
    ).resolves.toEqual({ passed: true });

    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      'x-vercel-trusted-oidc-idp-token': 'header.payload.signature',
    });
  });

  it('executes the full resolver path with provider fetches and a healthy direct rollback probe', async () => {
    process.env.VERCEL_TOKEN = 'test-vercel-token';
    process.env.VERCEL_ORG_ID = 'team_test123';
    process.env.VERCEL_PROJECT_ID = 'prj_test123';
    process.env.RELEASE_SHA = releaseSha;
    process.env.CURRENT_VERCEL_DEPLOYMENT_ID = 'dpl_current123';
    process.env.GITHUB_REPOSITORY = 'renanescola40-afk/eurocomply_saas';

    const currentDeployment = {
      uid: 'dpl_current123',
      projectId: 'prj_test123',
      createdAt: 300,
      state: 'READY',
      target: 'production',
      meta: { githubCommitSha: releaseSha },
    };
    const rollbackDeployment = {
      uid: 'dpl_previous123',
      projectId: 'prj_test123',
      createdAt: 200,
      state: 'READY',
      target: 'production',
      url: 'previous.example.vercel.app',
      meta: {
        githubCommitSha: priorSha,
        githubCommitRef: 'main',
        githubRepo: 'eurocomply_saas',
        githubOrg: 'renanescola40-afk',
      },
    };

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = input.toString();

      if (url.includes('/v13/deployments/dpl_current123')) {
        return new Response(JSON.stringify(currentDeployment), { status: 200 });
      }
      if (url.includes('/v7/deployments')) {
        return new Response(JSON.stringify({ deployments: [rollbackDeployment] }), { status: 200 });
      }
      if (url.includes('/v13/deployments/dpl_previous123')) {
        return new Response(JSON.stringify(rollbackDeployment), { status: 200 });
      }
      if (url === 'https://previous.example.vercel.app/api/health') {
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
      }

      return new Response('unexpected request', { status: 500 });
    });

    await expect(runResolver()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('accepts only HTTPS Vercel deployment origins', () => {
    expect(normalizeDeploymentUrl('previous.example.vercel.app'))
      .toBe('https://previous.example.vercel.app');
    expect(normalizeDeploymentUrl('http://previous.example.vercel.app')).toBeNull();
    expect(normalizeDeploymentUrl('https://example.com')).toBeNull();
  });
});
