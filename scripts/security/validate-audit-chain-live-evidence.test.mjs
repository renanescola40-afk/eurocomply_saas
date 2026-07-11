import { describe, expect, it } from 'vitest';

import {
  requiredAuditChainChecks,
  validateAuditChainLiveEvidence,
} from './validate-audit-chain-live-evidence.mjs';

const now = new Date('2026-07-11T17:00:00Z');

function completeEvidence(overrides = {}) {
  return {
    evidenceItem: 'audit-chain-live-validation',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: '2026-07-11T16:00:00Z',
    acceptanceCriteria: Object.fromEntries(
      requiredAuditChainChecks.map((check) => [check, true]),
    ),
    targetLiveValidation: { status: 'Complete' },
    verification_provenance: {
      method: 'github_actions',
      reference: 'actions/run/123',
      verifiedAt: '2026-07-11T16:30:00Z',
      repository: 'renanescola40-afk/eurocomply_saas',
      branch: 'main',
      githubRunId: '29190000000',
      commitSha: 'a'.repeat(40),
    },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      credentialsStored: false,
      rawAuditPayloadsStored: false,
    },
    ...overrides,
  };
}

describe('validateAuditChainLiveEvidence', () => {
  it('accepts fresh commit-bound live proof from main', () => {
    expect(validateAuditChainLiveEvidence(completeEvidence(), { now })).toEqual([]);
  });

  it('rejects stale evidence', () => {
    expect(
      validateAuditChainLiveEvidence(
        completeEvidence({ generatedAt: '2026-07-01T16:00:00Z' }),
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
          generatedAt: '2026-07-10T16:00:00Z',
          exception: { expiresAt: '2026-07-10T23:59:59Z' },
        },
        { now },
      ),
    ).toContain('audit-chain exception has expired');
  });

  it('rejects missing concurrent append proof', () => {
    const evidence = completeEvidence();
    evidence.acceptanceCriteria.appendConcurrent = false;
    expect(validateAuditChainLiveEvidence(evidence, { now })).toContain(
      'acceptanceCriteria.appendConcurrent must be true',
    );
  });

  it('rejects feature-branch provenance', () => {
    const evidence = completeEvidence();
    evidence.verification_provenance.branch = 'feature/example';
    expect(validateAuditChainLiveEvidence(evidence, { now })).toContain(
      'verification_provenance.branch must be main',
    );
  });

  it('rejects evidence for a different promoted commit', () => {
    expect(
      validateAuditChainLiveEvidence(completeEvidence(), {
        now,
        expectedCommitSha: 'b'.repeat(40),
      }),
    ).toContain(`verification provenance commit SHA must match ${'b'.repeat(40)}`);
  });

  it('rejects stored raw audit payloads', () => {
    const evidence = completeEvidence();
    evidence.evidenceIntegrity.rawAuditPayloadsStored = true;
    expect(validateAuditChainLiveEvidence(evidence, { now })).toContain(
      'evidenceIntegrity.rawAuditPayloadsStored must be false',
    );
  });
});
