import { describe, expect, it } from 'vitest';

import {
  buildCredentialCandidates,
  githubJsonWithCredentialFallback,
} from '../../scripts/enterprise/build-platform-controls-runtime-evidence.mjs';

const SHA = 'd'.repeat(40);

describe('platform controls credential completeness fallback', () => {
  it('tries the next credential when a successful response lacks required visibility', async () => {
    const candidates = buildCredentialCandidates(
      'dedicated-read-token',
      'github-actions-token',
    );
    const authorizations: string[] = [];

    const response = await githubJsonWithCredentialFallback(
      'https://api.github.com/repos/renanescola40-afk/eurocomply_saas/rulesets/7001',
      candidates,
      {
        acceptData: (data: unknown) => Array.isArray(
          (data as { bypass_actors?: unknown } | null)?.bypass_actors,
        ),
        fetchImpl: async (_url: string | URL | Request, init?: RequestInit) => {
          const authorization = String(
            (init?.headers as Record<string, string> | undefined)?.Authorization || '',
          );
          authorizations.push(authorization);

          const common = {
            id: 7001,
            target: 'branch',
            enforcement: 'active',
            conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } },
            rules: [],
            commit: { sha: SHA },
          };

          if (authorization.endsWith('dedicated-read-token')) {
            return new Response(JSON.stringify(common), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            });
          }

          return new Response(JSON.stringify({ ...common, bypass_actors: [] }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        },
      },
    );

    expect(response.authMode).toBe('github-token');
    expect(response.data).toEqual(expect.objectContaining({ bypass_actors: [] }));
    expect(authorizations).toEqual([
      'Bearer dedicated-read-token',
      'Bearer github-actions-token',
    ]);
  });

  it('returns the last successful incomplete response so callers remain fail-closed', async () => {
    const candidates = buildCredentialCandidates('first-token', 'second-token');

    const response = await githubJsonWithCredentialFallback(
      'https://api.github.com/repos/renanescola40-afk/eurocomply_saas/rulesets/7001',
      candidates,
      {
        acceptData: (data: unknown) => Array.isArray(
          (data as { bypass_actors?: unknown } | null)?.bypass_actors,
        ),
        fetchImpl: async (_url: string | URL | Request, init?: RequestInit) => {
          const authorization = String(
            (init?.headers as Record<string, string> | undefined)?.Authorization || '',
          );
          return new Response(JSON.stringify({
            id: authorization.endsWith('first-token') ? 7001 : 7002,
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        },
      },
    );

    expect(response.authMode).toBe('github-token');
    expect(response.data).toEqual({ id: 7002 });
  });
});
