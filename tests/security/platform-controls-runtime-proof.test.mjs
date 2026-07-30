import { describe, expect, it } from 'vitest';
import {
  collectPlatformProof,
  evaluateClassicProtection,
  evaluateEffectiveRules,
} from '../../scripts/compliance/build-platform-controls-runtime-proof.mjs';

const SHA = 'a'.repeat(40);
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

describe('platform controls runtime proof', () => {
  it('accepts complete classic branch protection', () => {
    expect(evaluateClassicProtection({
      required_status_checks: { contexts: ['CI / quality'] },
      required_pull_request_reviews: { required_approving_review_count: 1 },
      allow_force_pushes: { enabled: false },
      allow_deletions: { enabled: false },
    }, true)).toEqual({
      apiReadable: true,
      requiredStatusChecks: true,
      approvingReview: true,
      forcePushBlocked: true,
      deletionBlocked: true,
    });
  });

  it('maps effective rulesets to equivalent controls', () => {
    expect(evaluateEffectiveRules([
      { type: 'required_status_checks', parameters: { required_status_checks: [{ context: 'CI' }] } },
      { type: 'pull_request', parameters: { required_approving_review_count: 1 } },
      { type: 'non_fast_forward' },
      { type: 'deletion' },
    ], true)).toEqual({
      apiReadable: true,
      requiredStatusChecks: true,
      approvingReview: true,
      forcePushBlocked: true,
      deletionBlocked: true,
    });
  });

  it('falls back from a protected-branch 403 to public effective rules', async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(url);
      if (url.endsWith('/protection')) return jsonResponse(403, { message: 'Resource not accessible' });
      return jsonResponse(200, [
        { type: 'required_status_checks', parameters: { required_status_checks: [{ context: 'CI' }] } },
        { type: 'pull_request', parameters: { required_approving_review_count: 2 } },
        { type: 'non_fast_forward' },
        { type: 'deletion' },
      ]);
    };

    const proof = await collectPlatformProof({
      targetSha: SHA,
      repository: REPOSITORY,
      token: 'redacted',
      fetchImpl,
    });

    expect(calls).toHaveLength(2);
    expect(proof.status).toBe('VERIFIED');
    expect(proof.selectedMode).toBe('effective_branch_rules');
    expect(proof.failedChecks).toEqual([]);
    expect(proof.limitations).toContain('classic_branch_protection returned HTTP 403');
  });

  it('fails closed when effective rules omit review or deletion protection', async () => {
    const fetchImpl = async (url) => {
      if (url.endsWith('/protection')) return jsonResponse(403, {});
      return jsonResponse(200, [
        { type: 'required_status_checks', parameters: { required_status_checks: [{ context: 'CI' }] } },
        { type: 'non_fast_forward' },
      ]);
    };

    const proof = await collectPlatformProof({
      targetSha: SHA,
      repository: REPOSITORY,
      fetchImpl,
    });

    expect(proof.status).toBe('BLOCKED');
    expect(proof.failedChecks).toEqual(['approvingReview', 'deletionBlocked']);
    expect(proof.truthBoundary.provesObservedRepositoryPolicy).toBe(false);
  });

  it('rejects non-exact SHA inputs before making network requests', async () => {
    let called = false;
    await expect(collectPlatformProof({
      targetSha: 'main',
      repository: REPOSITORY,
      fetchImpl: async () => {
        called = true;
        return jsonResponse(200, []);
      },
    })).rejects.toThrow('TARGET_SHA must be a full lowercase SHA');
    expect(called).toBe(false);
  });
});
