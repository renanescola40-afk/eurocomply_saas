import { describe, expect, it } from 'vitest';
import { evaluateVercelDeploymentMetadata } from '../../scripts/release/protected-rollback-contract.mjs';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

function metadata(overrides: Record<string, unknown> = {}) {
  return {
    url: 'risck-comply-target.vercel.app',
    projectId: 'prj_expected',
    ownerId: 'team_expected',
    readyState: 'READY',
    target: 'production',
    gitSource: { type: 'github', sha: SHA_A },
    ...overrides,
  };
}

function evaluate(value: unknown) {
  return evaluateVercelDeploymentMetadata({
    metadata: value,
    expectedHostname: 'risck-comply-target.vercel.app',
    expectedProjectId: 'prj_expected',
    expectedOwnerId: 'team_expected',
    expectedSha: SHA_A,
  });
}

describe('protected rollback provider contract', () => {
  it('accepts only a ready production deployment bound to the expected project, owner, URL and SHA', () => {
    expect(evaluate(metadata())).toMatchObject({ passed: true, failures: [] });
  });

  it.each([
    ['wrong project', { projectId: 'prj_other' }, 'projectIdMatches'],
    ['wrong owner', { ownerId: 'team_other' }, 'ownerIdMatches'],
    ['wrong URL', { url: 'other.vercel.app' }, 'deploymentHostnameMatches'],
    ['not ready', { readyState: 'ERROR' }, 'deploymentReady'],
    ['preview target', { target: null }, 'deploymentTargetsProduction'],
    ['wrong source', { gitSource: { type: 'gitlab', sha: SHA_A } }, 'gitSourceIsGitHub'],
    ['wrong SHA', { gitSource: { type: 'github', sha: SHA_B } }, 'gitSourceShaMatches'],
  ])('rejects %s metadata before mutation', (_name, override, failure) => {
    const result = evaluate(metadata(override));
    expect(result.passed).toBe(false);
    expect(result.failures).toContain(failure);
  });

  it('fails closed for missing or untrusted provider responses', () => {
    expect(evaluate(null).passed).toBe(false);
    expect(evaluate('not-an-object').passed).toBe(false);
  });
});
