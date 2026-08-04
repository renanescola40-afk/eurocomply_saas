import { describe, expect, it } from 'vitest';

import {
  selectExactShaUploadScannerRun,
  selectUploadScannerEvidenceEntry,
  validateDownloadedUploadScannerEvidence,
} from '../../scripts/enterprise/fetch-upload-scanner-runtime-evidence.mjs';
import { normalizeUploadScannerEvidence } from '../../scripts/security/normalize-upload-scanner-runtime-evidence.mjs';

const SHA = 'a'.repeat(40);
const RUN_ID = '123456789';
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';

const run = {
  id: Number(RUN_ID),
  name: 'RISCK COMPLY Upload Security CI',
  head_sha: SHA,
  head_branch: 'main',
  event: 'push',
  status: 'completed',
  conclusion: 'success',
  run_attempt: 1,
  updated_at: '2026-08-04T12:00:00Z',
};

function sourceEvidence() {
  return {
    evidenceItem: 'upload-malware-scan-validation',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: new Date().toISOString(),
    runtimeContext: {},
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
  };
}

function normalizedEvidence() {
  const result = normalizeUploadScannerEvidence(sourceEvidence(), {
    expectedSha: SHA,
    repository: REPOSITORY,
    branch: 'main',
    runId: RUN_ID,
    runAttempt: '1',
    eventName: 'push',
    generatedAt: new Date().toISOString(),
  });
  expect(result.passed).toBe(true);
  return result.evidence;
}

describe('upload scanner exact-SHA evidence recovery', () => {
  it('selects only a successful exact-SHA main run from an allowed event', () => {
    expect(
      selectExactShaUploadScannerRun(
        [
          { ...run, id: 1, head_sha: 'b'.repeat(40) },
          { ...run, id: 2, head_branch: 'feature/upload-proof' },
          { ...run, id: 3, event: 'pull_request' },
          { ...run, id: 4, conclusion: 'failure' },
          { ...run, id: 5, name: 'Different workflow' },
          run,
        ],
        SHA,
      ),
    ).toEqual(run);

    expect(selectExactShaUploadScannerRun([run], SHA, '999')).toBeNull();
    expect(selectExactShaUploadScannerRun([run], SHA, RUN_ID)).toEqual(run);
  });

  it('normalizes and accepts a clean ClamAV proof bound to the source run', () => {
    const evidence = normalizedEvidence();
    expect(
      validateDownloadedUploadScannerEvidence(evidence, {
        targetSha: SHA,
        repository: REPOSITORY,
        runId: RUN_ID,
        runAttempt: '1',
      }),
    ).toEqual({ passed: true, failures: [] });
  });

  it('rejects a proof from another SHA or workflow attempt', () => {
    const evidence = normalizedEvidence();
    expect(
      validateDownloadedUploadScannerEvidence(evidence, {
        targetSha: 'c'.repeat(40),
        repository: REPOSITORY,
        runId: RUN_ID,
        runAttempt: '1',
      }).passed,
    ).toBe(false);

    expect(
      validateDownloadedUploadScannerEvidence(evidence, {
        targetSha: SHA,
        repository: REPOSITORY,
        runId: RUN_ID,
        runAttempt: '2',
      }).failures,
    ).toContain('source_workflow_attempt_mismatch');
  });

  it('rejects duplicate, traversal and absolute ZIP entries', () => {
    expect(
      selectUploadScannerEvidenceEntry([
        'docs/security/evidence/runtime/upload-malware-scan-validation.json',
      ]),
    ).toBe('docs/security/evidence/runtime/upload-malware-scan-validation.json');

    expect(() =>
      selectUploadScannerEvidenceEntry([
        'upload-malware-scan-validation.json',
        'nested/upload-malware-scan-validation.json',
      ]),
    ).toThrow('artifact_evidence_entry_not_unique');

    expect(() =>
      selectUploadScannerEvidenceEntry(['../upload-malware-scan-validation.json']),
    ).toThrow('artifact_zip_unsafe_entry');

    expect(() =>
      selectUploadScannerEvidenceEntry(['/tmp/upload-malware-scan-validation.json']),
    ).toThrow('artifact_zip_unsafe_entry');
  });

  it('rejects sensitive or non-clean provider evidence', () => {
    const evidence = normalizedEvidence();
    evidence.liveProviderProof.scanStatus = 'infected';
    evidence.evidenceIntegrity.credentialsStored = true;

    const validation = validateDownloadedUploadScannerEvidence(evidence, {
      targetSha: SHA,
      repository: REPOSITORY,
      runId: RUN_ID,
      runAttempt: '1',
    });
    expect(validation.failures).toContain('liveProviderProof.scanStatus must be clean');
    expect(validation.failures).toContain('credentials_boundary_invalid');
  });
});
