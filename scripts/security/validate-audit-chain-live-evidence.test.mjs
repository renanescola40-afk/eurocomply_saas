import { describe, expect, it } from 'vitest';

import {
  requiredAuditChainChecks,
  validateAuditChainLiveEvidence,
} from './validate-audit-chain-live-evidence.mjs';

const now = new Date('2026-07-11T10:00:00Z');

function completeEvidence(overrides = {}) {
  return {
    evidenceItem: 'audit-chain-live-validation',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: '2026-07-11T09:00:00Z',
    acceptanceCriteria: Object.fromEntries(
      requiredAuditChainChecks.map((check) => [check, true]),
    ),
    targetLiveValidation: { status: 'Complete' },
    verification_provenance: {
      method: 'github_actions',
      reference: 'actions/run/123',
      verifiedAt: '2026-07-11T09:30:00Z',
    },
    ...overrides,
  };
}

describe('validateAuditChainLiveEvidence', () => {
  it('accepts current complete evidence with all live checks and provenance', () => {
    expect(validateAuditChainLiveEvidence(completeEvidence(), { now })).toEqual([]);
  });

  it('rejects stale evidence', () => {
    expect(
      validateAuditChainLiveEvidence(
        completeEvidence({ generatedAt: '2026-07-01T09:00:00Z' }),
        { now },
      ),
    ).toContain('generatedAt is older than 7 days');
  });

  it('rejects expired exception evidence', () => {
    expect(
      validateAuditChainLiveEvidence(
        {
          evidenceItem: 'audit-chain-live-validation',
          status: 'Exception',
          generatedAt: '2026-07-10T09:00:00Z',
          exception: { expiresAt: '2026-07-10T23:59:59Z' },
        },
        { now },
      ),
    ).toContain('audit-chain exception has expired');
  });

  it('rejects complete evidence when concurrent append proof is absent', () => {
    const evidence = completeEvidence();
    evidence.acceptanceCriteria.appendConcurrent = false;

    expect(validateAuditChainLiveEvidence(evidence, { now })).toContain(
      'acceptanceCriteria.appendConcurrent must be true',
    );
  });

  it('rejects complete evidence without runtime provenance', () => {
    expect(
      validateAuditChainLiveEvidence(
        completeEvidence({ verification_provenance: undefined }),
        { now },
      ),
    ).toContain('Complete evidence requires verification_provenance');
  });
});
