import { describe, expect, it } from 'vitest';

import { validateBranchProtectionFreshness } from './validate-branch-protection-freshness.mjs';

const now = new Date('2026-07-11T10:00:00Z');

function evidence(overrides = {}) {
  return {
    status: 'Exception',
    repository: 'renanescola40-afk/eurocomply_saas',
    branch: 'main',
    captured_at: '2026-07-07T08:00:00Z',
    exception: { expiresAt: '2026-07-14T23:59:59Z' },
    ...overrides,
  };
}

describe('validateBranchProtectionFreshness', () => {
  it('accepts current unexpired exception evidence for the expected repository and branch', () => {
    expect(validateBranchProtectionFreshness(evidence(), { now })).toEqual([]);
  });

  it('rejects stale evidence', () => {
    expect(
      validateBranchProtectionFreshness(
        evidence({ captured_at: '2026-07-01T08:00:00Z' }),
        { now },
      ),
    ).toContain('captured_at is older than 7 days');
  });

  it('rejects expired exceptions', () => {
    expect(
      validateBranchProtectionFreshness(
        evidence({ exception: { expiresAt: '2026-07-10T23:59:59Z' } }),
        { now },
      ),
    ).toContain('branch protection exception has expired');
  });

  it('requires API or screenshot provenance before Complete evidence is accepted', () => {
    expect(
      validateBranchProtectionFreshness(
        evidence({ status: 'Complete', exception: undefined }),
        { now },
      ),
    ).toContain('Complete evidence requires verification_provenance');
  });

  it('accepts Complete evidence with current screenshot provenance', () => {
    expect(
      validateBranchProtectionFreshness(
        evidence({
          status: 'Complete',
          exception: undefined,
          verification_provenance: {
            method: 'screenshot',
            reference: 'artifact:branch-protection-settings',
            verifiedAt: '2026-07-11T09:30:00Z',
          },
        }),
        { now },
      ),
    ).toEqual([]);
  });
});
