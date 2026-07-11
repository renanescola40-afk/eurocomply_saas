import { describe, expect, it } from 'vitest';

import { validateUploadScannerRuntimeEvidence } from './validate-upload-scanner-runtime-evidence.mjs';

const now = new Date('2026-07-11T12:00:00Z');

function completeEvidence(overrides = {}) {
  return {
    evidenceItem: 'upload-malware-scan-validation',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: '2026-07-11T11:00:00Z',
    runtimeContext: {
      generatedByGithubActions: true,
      githubRunId: '123',
      repository: 'renanescola40-afk/eurocomply_saas',
      branch: 'main',
      commitSha: 'a'.repeat(40),
    },
    liveProviderProof: {
      status: 'passed',
      providerIsReal: true,
      scanStatus: 'clean',
      scanRequired: true,
      providerResponseBodyPersisted: false,
      fixtureBytesCommitted: false,
      fileHash: 'b'.repeat(64),
    },
    acceptanceCriteria: {
      scannerUnavailableBlocksUpload: true,
      scannerMalwareOrSuspiciousBlocksUpload: true,
      cleanScanAllowsUpload: true,
    },
    ...overrides,
  };
}

describe('validateUploadScannerRuntimeEvidence', () => {
  it('accepts fresh complete live scanner proof for main', () => {
    expect(validateUploadScannerRuntimeEvidence(completeEvidence(), { now })).toEqual([]);
  });

  it('rejects stale evidence', () => {
    expect(
      validateUploadScannerRuntimeEvidence(
        completeEvidence({ generatedAt: '2026-07-01T11:00:00Z' }),
        { now },
      ),
    ).toContain('generatedAt is older than 7 days');
  });

  it('rejects proof from a non-main branch', () => {
    const evidence = completeEvidence();
    evidence.runtimeContext.branch = 'feature/upload-proof';
    expect(validateUploadScannerRuntimeEvidence(evidence, { now })).toContain(
      'runtimeContext.branch must be main',
    );
  });

  it('rejects mock or non-real providers', () => {
    const evidence = completeEvidence();
    evidence.liveProviderProof.providerIsReal = false;
    expect(validateUploadScannerRuntimeEvidence(evidence, { now })).toContain(
      'liveProviderProof.providerIsReal must be true',
    );
  });

  it('rejects non-clean scanner verdicts', () => {
    const evidence = completeEvidence();
    evidence.liveProviderProof.scanStatus = 'suspicious';
    expect(validateUploadScannerRuntimeEvidence(evidence, { now })).toContain(
      'liveProviderProof.scanStatus must be clean',
    );
  });

  it('rejects evidence that persists provider response bodies', () => {
    const evidence = completeEvidence();
    evidence.liveProviderProof.providerResponseBodyPersisted = true;
    expect(validateUploadScannerRuntimeEvidence(evidence, { now })).toContain(
      'liveProviderProof.providerResponseBodyPersisted must be false',
    );
  });
});
