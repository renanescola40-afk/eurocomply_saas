import { describe, expect, it } from 'vitest';

import { validateUploadScannerRuntimeEvidence } from './validate-upload-scanner-runtime-evidence.mjs';

const now = new Date('2026-07-11T12:00:00Z');
const commitSha = 'a'.repeat(40);

function completeEvidence(overrides = {}) {
  return {
    evidenceItem: 'upload-malware-scan-validation',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: '2026-07-11T11:00:00Z',
    runtimeContext: {
      generatedByGithubActions: true,
      githubWorkflow: 'RISCK COMPLY Upload Security CI',
      githubWorkflowFile: 'upload-security-ci.yml',
      githubRunId: '123',
      githubRunAttempt: '1',
      githubEventName: 'push',
      repository: 'renanescola40-afk/eurocomply_saas',
      branch: 'main',
      commitSha,
    },
    sourceWorkflow: {
      name: 'RISCK COMPLY Upload Security CI',
      file: '.github/workflows/upload-security-ci.yml',
      runId: '123',
      runAttempt: '1',
      event: 'push',
      artifact: `upload-security-runtime-proof-${commitSha}`,
      exactShaBound: true,
    },
    liveProviderProof: {
      status: 'passed',
      provider: 'clamav',
      providerIsReal: true,
      scanStatus: 'clean',
      scanRequired: true,
      blockedIfNotClean: false,
      providerResponseBodyPersisted: false,
      providerResponseMessagePersisted: false,
      fixtureBytesCommitted: false,
      fileHash: 'b'.repeat(64),
    },
    acceptanceCriteria: {
      enterpriseUploadRequiresCleanScan: true,
      scannerUnavailableBlocksUpload: true,
      scannerTimeoutBlocksUpload: true,
      scannerMalwareOrSuspiciousBlocksUpload: true,
      cleanScanAllowsUpload: true,
    },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      credentialsStored: false,
      rawProviderResponseStored: false,
      providerResponseBodyStored: false,
      providerResponseMessageStored: false,
      fixtureBytesCommitted: false,
      exactShaBound: true,
      sourceRunBound: true,
    },
    ...overrides,
  };
}

describe('validateUploadScannerRuntimeEvidence', () => {
  it('accepts fresh complete exact-SHA live scanner proof for main', () => {
    expect(
      validateUploadScannerRuntimeEvidence(completeEvidence(), {
        now,
        expectedCommitSha: commitSha,
      }),
    ).toEqual([]);
  });

  it('rejects stale evidence', () => {
    expect(
      validateUploadScannerRuntimeEvidence(
        completeEvidence({ generatedAt: '2026-07-01T11:00:00Z' }),
        { now, expectedCommitSha: commitSha },
      ),
    ).toContain('generatedAt is older than 7 days');
  });

  it('rejects proof from a non-main branch', () => {
    const evidence = completeEvidence();
    evidence.runtimeContext.branch = 'feature/upload-proof';
    expect(
      validateUploadScannerRuntimeEvidence(evidence, { now, expectedCommitSha: commitSha }),
    ).toContain('runtimeContext.branch must be main');
  });

  it('rejects proof from a different commit', () => {
    expect(
      validateUploadScannerRuntimeEvidence(completeEvidence(), {
        now,
        expectedCommitSha: 'c'.repeat(40),
      }),
    ).toContain('runtimeContext.commitSha must match expectedCommitSha');
  });

  it('rejects mismatched run provenance', () => {
    const evidence = completeEvidence();
    evidence.sourceWorkflow.runId = '456';
    expect(
      validateUploadScannerRuntimeEvidence(evidence, { now, expectedCommitSha: commitSha }),
    ).toContain('sourceWorkflow.runId must match runtimeContext.githubRunId');
  });

  it('rejects mock or non-real providers', () => {
    const evidence = completeEvidence();
    evidence.liveProviderProof.provider = 'mock';
    evidence.liveProviderProof.providerIsReal = false;
    const failures = validateUploadScannerRuntimeEvidence(evidence, {
      now,
      expectedCommitSha: commitSha,
    });
    expect(failures).toContain('liveProviderProof.providerIsReal must be true');
    expect(failures).toContain('liveProviderProof.provider must be a supported real provider');
  });

  it('rejects non-clean scanner verdicts', () => {
    const evidence = completeEvidence();
    evidence.liveProviderProof.scanStatus = 'suspicious';
    expect(
      validateUploadScannerRuntimeEvidence(evidence, { now, expectedCommitSha: commitSha }),
    ).toContain('liveProviderProof.scanStatus must be clean');
  });

  it('rejects evidence that persists provider response data', () => {
    const evidence = completeEvidence();
    evidence.liveProviderProof.providerResponseBodyPersisted = true;
    evidence.liveProviderProof.providerResponseMessagePersisted = true;
    const failures = validateUploadScannerRuntimeEvidence(evidence, {
      now,
      expectedCommitSha: commitSha,
    });
    expect(failures).toContain('liveProviderProof.providerResponseBodyPersisted must be false');
    expect(failures).toContain('liveProviderProof.providerResponseMessagePersisted must be false');
  });

  it('rejects incomplete evidence-integrity boundaries', () => {
    const evidence = completeEvidence();
    evidence.evidenceIntegrity.exactShaBound = false;
    evidence.evidenceIntegrity.sourceRunBound = false;
    const failures = validateUploadScannerRuntimeEvidence(evidence, {
      now,
      expectedCommitSha: commitSha,
    });
    expect(failures).toContain('evidenceIntegrity.exactShaBound must be true');
    expect(failures).toContain('evidenceIntegrity.sourceRunBound must be true');
  });
});
