import { describe, expect, it } from 'vitest';

import {
  getGitHubEnvironment,
  validateGitHubEnvironmentGovernance,
} from '../../scripts/security/check-github-environment-governance.mjs';

function protectedEnvironment(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Production',
    can_admins_bypass: false,
    protection_rules: [
      {
        type: 'required_reviewers',
        prevent_self_review: false,
        reviewers: [{ type: 'User', reviewer: { login: 'release-owner', id: 1 } }],
      },
      { type: 'branch_policy' },
    ],
    deployment_branch_policy: {
      protected_branches: true,
      custom_branch_policies: false,
    },
    ...overrides,
  };
}

describe('GitHub deployment environment governance', () => {
  it('accepts a protected environment with reviewer, no admin bypass and protected-branch deployment policy', () => {
    expect(validateGitHubEnvironmentGovernance(protectedEnvironment(), {
      expectedName: 'Production',
    })).toEqual([]);
  });

  it('fails closed for the currently unsafe shape: admin bypass, no reviewers and no branch policy', () => {
    const failures = validateGitHubEnvironmentGovernance({
      name: 'Production',
      can_admins_bypass: true,
      protection_rules: [],
      deployment_branch_policy: null,
    }, { expectedName: 'Production' });

    expect(failures).toContain('administrator bypass must be disabled');
    expect(failures).toContain('at least one required deployment reviewer must be configured');
    expect(failures).toContain('deployment branch policy must allow protected branches only');
  });

  it('rejects missing reviewers even when other controls are configured', () => {
    const failures = validateGitHubEnvironmentGovernance(protectedEnvironment({
      protection_rules: [{ type: 'branch_policy' }],
    }), { expectedName: 'Production' });

    expect(failures).toEqual(['at least one required deployment reviewer must be configured']);
  });

  it('rejects custom/all-branch deployment policies when protected branches are required', () => {
    expect(validateGitHubEnvironmentGovernance(protectedEnvironment({
      deployment_branch_policy: {
        protected_branches: false,
        custom_branch_policies: true,
      },
    }), { expectedName: 'Production' })).toContain(
      'deployment branch policy must allow protected branches only',
    );

    expect(validateGitHubEnvironmentGovernance(protectedEnvironment({
      deployment_branch_policy: null,
    }), { expectedName: 'Production' })).toContain(
      'deployment branch policy must allow protected branches only',
    );
  });

  it('uses the environment endpoint without placing the token in the URL', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const payload = protectedEnvironment();
    const fetchImpl = async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    await expect(getGitHubEnvironment({
      repository: 'owner/repo',
      environmentName: 'Production',
      token: 'synthetic-test-token',
      fetchImpl: fetchImpl as typeof fetch,
    })).resolves.toEqual(payload);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('https://api.github.com/repos/owner/repo/environments/Production');
    expect(calls[0]?.url).not.toContain('synthetic-test-token');
    expect(new Headers(calls[0]?.init.headers).get('authorization')).toBe('Bearer synthetic-test-token');
  });

  it('reports a missing environment before any protected job could load secrets', async () => {
    const fetchImpl = async () => new Response('', { status: 404 });

    await expect(getGitHubEnvironment({
      repository: 'owner/repo',
      environmentName: 'enterprise-production-closeout',
      token: 'synthetic-test-token',
      fetchImpl: fetchImpl as typeof fetch,
    })).rejects.toThrow('GitHub deployment environment enterprise-production-closeout does not exist');
  });
});
