import { describe, expect, it } from 'vitest';
import {
  VERCEL_CLI_VERSION,
  buildVercelCurlArgs,
  normalizeDeploymentUrl,
  parseHealthBody,
  selectRollbackCandidate,
} from '../../scripts/release/resolve-public-production-rollback.mjs';

const releaseSha = 'b'.repeat(40);
const priorSha = 'a'.repeat(40);

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

  it('uses the documented protected-deployment Vercel curl syntax without a token argument', () => {
    expect(VERCEL_CLI_VERSION).toBe('56.3.2');
    expect(buildVercelCurlArgs('https://previous.example.vercel.app')).toEqual([
      '--yes',
      'vercel@56.3.2',
      'curl',
      '/api/health',
      '--deployment',
      'https://previous.example.vercel.app',
    ]);
    expect(buildVercelCurlArgs('https://previous.example.vercel.app')).not.toContain('--token');
  });

  it('parses a health response while tolerating harmless CLI prefix output', () => {
    expect(parseHealthBody('{"status":"ok"}')).toEqual({ status: 'ok' });
    expect(parseHealthBody('Vercel CLI 56.3.2\n{"status":"ok"}\n')).toEqual({ status: 'ok' });
    expect(parseHealthBody('not-json')).toBeNull();
  });

  it('accepts only HTTPS Vercel deployment origins', () => {
    expect(normalizeDeploymentUrl('previous.example.vercel.app'))
      .toBe('https://previous.example.vercel.app');
    expect(normalizeDeploymentUrl('http://previous.example.vercel.app')).toBeNull();
    expect(normalizeDeploymentUrl('https://example.com')).toBeNull();
  });
});
