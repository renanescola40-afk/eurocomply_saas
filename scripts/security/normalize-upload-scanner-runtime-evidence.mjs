#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { validateUploadScannerRuntimeEvidence } from '../release/validate-upload-scanner-runtime-evidence.mjs';

const DEFAULT_PATH = 'docs/security/evidence/runtime/upload-malware-scan-validation.json';
const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const WORKFLOW_NAME = 'RISCK COMPLY Upload Security CI';
const WORKFLOW_FILE = 'upload-security-ci.yml';
const FULL_SHA = /^[a-f0-9]{40}$/;
const NUMERIC = /^\d+$/;

function clean(value) {
  return String(value ?? '').trim();
}

function normalizeSha(value) {
  return clean(value).toLowerCase();
}

function runtimeUrl({ serverUrl, repository, runId }) {
  if (!serverUrl || !repository || !runId) return null;
  return `${serverUrl.replace(/\/$/, '')}/${repository}/actions/runs/${runId}`;
}

export function normalizeUploadScannerEvidence(
  source,
  {
    expectedSha,
    repository = CANONICAL_REPOSITORY,
    branch = 'main',
    runId,
    runAttempt = '1',
    eventName = 'push',
    serverUrl = 'https://github.com',
    generatedAt = new Date().toISOString(),
  } = {},
) {
  const targetSha = normalizeSha(expectedSha);
  const normalizedRunId = clean(runId);
  const normalizedAttempt = clean(runAttempt);
  const normalizedRepository = clean(repository);
  const normalizedBranch = clean(branch);
  const failures = [];

  if (!FULL_SHA.test(targetSha)) failures.push('expected_sha_invalid');
  if (normalizedRepository !== CANONICAL_REPOSITORY) failures.push('repository_not_canonical');
  if (!normalizedBranch) failures.push('branch_missing');
  if (!NUMERIC.test(normalizedRunId)) failures.push('run_id_invalid');
  if (!NUMERIC.test(normalizedAttempt)) failures.push('run_attempt_invalid');
  if (!['push', 'pull_request', 'workflow_dispatch'].includes(clean(eventName))) {
    failures.push('event_name_not_allowed');
  }
  if (source?.evidenceItem !== 'upload-malware-scan-validation') {
    failures.push('source_evidence_item_invalid');
  }
  if (source?.status !== 'Complete' || source?.outcome !== 'passed') {
    failures.push('source_not_complete');
  }
  if (source?.liveProviderProof?.status !== 'passed') failures.push('source_provider_proof_failed');
  if (source?.liveProviderProof?.providerIsReal !== true) failures.push('source_provider_not_real');
  if (source?.liveProviderProof?.scanStatus !== 'clean') failures.push('source_scan_not_clean');
  if (source?.liveProviderProof?.scanRequired !== true) failures.push('source_scan_not_required');
  if (source?.liveProviderProof?.providerResponseBodyPersisted !== false) {
    failures.push('source_response_body_boundary_failed');
  }
  if (source?.liveProviderProof?.providerResponseMessagePersisted !== false) {
    failures.push('source_response_message_boundary_failed');
  }
  if (source?.liveProviderProof?.fixtureBytesCommitted !== false) {
    failures.push('source_fixture_boundary_failed');
  }

  const normalized = {
    ...source,
    generatedAt,
    reviewedAt: generatedAt,
    reviewer: 'RISCK COMPLY protected upload security automation',
    runtimeContext: {
      ...(source?.runtimeContext ?? {}),
      commandUsed: 'npm run security:upload-scanner:runtime',
      generatedByGithubActions: true,
      repository: normalizedRepository,
      branch: normalizedBranch,
      commitSha: FULL_SHA.test(targetSha) ? targetSha : null,
      githubWorkflow: WORKFLOW_NAME,
      githubWorkflowFile: WORKFLOW_FILE,
      githubRunId: normalizedRunId || null,
      githubRunAttempt: normalizedAttempt || null,
      githubEventName: clean(eventName) || null,
      workflowRunUrl: runtimeUrl({
        serverUrl,
        repository: normalizedRepository,
        runId: normalizedRunId,
      }),
    },
    sourceWorkflow: {
      name: WORKFLOW_NAME,
      file: `.github/workflows/${WORKFLOW_FILE}`,
      runId: normalizedRunId || null,
      runAttempt: normalizedAttempt || null,
      event: clean(eventName) || null,
      artifact: FULL_SHA.test(targetSha)
        ? `upload-security-runtime-proof-${targetSha}`
        : null,
      exactShaBound: FULL_SHA.test(targetSha),
    },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      credentialsStored: false,
      rawProviderResponseStored: false,
      providerResponseBodyStored: false,
      providerResponseMessageStored: false,
      fixtureBytesCommitted: false,
      exactShaBound: FULL_SHA.test(targetSha),
      sourceRunBound: NUMERIC.test(normalizedRunId),
    },
  };

  failures.push(
    ...validateUploadScannerRuntimeEvidence(normalized, {
      now: new Date(generatedAt),
      expectedRepository: CANONICAL_REPOSITORY,
      expectedBranch: normalizedBranch,
      expectedCommitSha: targetSha,
    }),
  );

  return {
    passed: failures.length === 0,
    failures: [...new Set(failures)],
    evidence: normalized,
  };
}

export function normalizeUploadScannerEvidenceFile({
  path = process.env.UPLOAD_SCANNER_RUNTIME_EVIDENCE_PATH || DEFAULT_PATH,
  expectedSha = process.env.TARGET_SHA || process.env.GITHUB_SHA || '',
  repository = process.env.GITHUB_REPOSITORY || CANONICAL_REPOSITORY,
  branch = process.env.TARGET_BRANCH || process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || '',
  runId = process.env.GITHUB_RUN_ID || '',
  runAttempt = process.env.GITHUB_RUN_ATTEMPT || '1',
  eventName = process.env.GITHUB_EVENT_NAME || 'push',
  serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com',
  generatedAt = new Date().toISOString(),
} = {}) {
  const source = JSON.parse(readFileSync(path, 'utf8'));
  const result = normalizeUploadScannerEvidence(source, {
    expectedSha,
    repository,
    branch,
    runId,
    runAttempt,
    eventName,
    serverUrl,
    generatedAt,
  });

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(result.evidence, null, 2)}\n`, { mode: 0o600 });

  if (!result.passed) {
    throw new Error(`upload_scanner_evidence_normalization_failed:${result.failures.join(',')}`);
  }

  console.log(`Normalized exact-SHA upload scanner evidence for ${result.evidence.runtimeContext.commitSha}.`);
  return result.evidence;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    normalizeUploadScannerEvidenceFile();
  } catch (error) {
    console.error(error instanceof Error ? error.message.split(':')[0] : 'unknown_error');
    process.exitCode = 1;
  }
}
