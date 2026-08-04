#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createConnection } from 'node:net';
import { pathToFileURL } from 'node:url';

const DEFAULT_OUTPUT = 'artifacts/upload-security/clamav-blocking-runtime-proof.json';
const FULL_SHA = /^[a-f0-9]{40}$/i;
const NUMERIC = /^\d+$/;
const CHUNK_SIZE = 64 * 1024;

function eicarFixture() {
  // Deliberately assembled from fragments so the standard test signature is never
  // committed as one contiguous scanner-triggering string.
  return Buffer.from(
    [
      'X5O!P%@AP[4\\PZX54(P^)7CC)7}$',
      'EICAR-STANDARD-ANTIVIRUS-TEST-FILE!',
      '$H+H*',
    ].join(''),
    'ascii',
  );
}

function sanitizeResponse(value) {
  return String(value ?? '')
    .replace(/[\r\n\u0000-\u001f\u007f]+/g, ' ')
    .slice(0, 500);
}

export function classifyClamAvBlockingResponse(response) {
  const sanitized = sanitizeResponse(response);
  if (/\bFOUND\b/i.test(sanitized)) return 'blocked';
  if (/\bOK\b/i.test(sanitized)) return 'unexpected_clean';
  if (/\bERROR\b/i.test(sanitized)) return 'scanner_error';
  return 'unrecognized';
}

function scanFixture({ host, port, timeoutMs, fixture }) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    let response = '';
    let settled = false;

    const settle = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.destroy();
      resolve(result);
    };

    const timeout = setTimeout(
      () => settle({ classification: 'timeout', responseReceived: false }),
      timeoutMs,
    );

    socket.on('connect', () => {
      socket.write('zINSTREAM\0', 'binary');
      for (let offset = 0; offset < fixture.length; offset += CHUNK_SIZE) {
        const chunk = fixture.subarray(offset, offset + CHUNK_SIZE);
        const size = Buffer.alloc(4);
        size.writeUInt32BE(chunk.length, 0);
        socket.write(size);
        socket.write(chunk);
      }
      socket.end(Buffer.alloc(4));
    });
    socket.on('data', (chunk) => {
      response += chunk.toString('utf8');
    });
    socket.on('end', () =>
      settle({
        classification: classifyClamAvBlockingResponse(response),
        responseReceived: response.length > 0,
      }),
    );
    socket.on('error', () =>
      settle({ classification: 'scanner_unavailable', responseReceived: false }),
    );
  });
}

export async function runUploadScannerBlockingProof({
  host = process.env.MALWARE_SCANNER_CLAMAV_HOST || '127.0.0.1',
  port = Number(process.env.MALWARE_SCANNER_CLAMAV_PORT || 3310),
  timeoutMs = Number(process.env.MALWARE_SCANNER_TIMEOUT_MS || 30_000),
  targetSha = process.env.TARGET_SHA || process.env.GITHUB_SHA || '',
  repository = process.env.GITHUB_REPOSITORY || '',
  branch = process.env.TARGET_BRANCH || process.env.GITHUB_REF_NAME || '',
  runId = process.env.GITHUB_RUN_ID || '',
  runAttempt = process.env.GITHUB_RUN_ATTEMPT || '1',
  outputPath = process.env.UPLOAD_SCANNER_BLOCKING_PROOF_PATH || DEFAULT_OUTPUT,
  generatedAt = new Date().toISOString(),
} = {}) {
  const normalizedSha = String(targetSha).trim().toLowerCase();
  const fixture = eicarFixture();
  const configurationValid =
    FULL_SHA.test(normalizedSha) &&
    repository === 'renanescola40-afk/eurocomply_saas' &&
    Boolean(branch) &&
    NUMERIC.test(String(runId)) &&
    NUMERIC.test(String(runAttempt)) &&
    Number.isInteger(port) &&
    port > 0 &&
    Number.isFinite(timeoutMs) &&
    timeoutMs > 0;

  const result = configurationValid
    ? await scanFixture({ host, port, timeoutMs, fixture })
    : { classification: 'configuration_invalid', responseReceived: false };
  const passed = configurationValid && result.classification === 'blocked';

  const evidence = {
    schema: 'risck-comply.upload-scanner-blocking-proof.v1',
    evidenceItem: 'upload-malware-blocking-runtime-proof',
    status: passed ? 'Complete' : 'Open',
    outcome: passed ? 'passed' : 'failed',
    generatedAt,
    repository,
    branch,
    targetSha: FULL_SHA.test(normalizedSha) ? normalizedSha : null,
    sourceWorkflow: {
      name: 'RISCK COMPLY Upload Security CI',
      file: '.github/workflows/upload-security-ci.yml',
      runId: String(runId || '') || null,
      runAttempt: String(runAttempt || '') || null,
      exactShaBound: FULL_SHA.test(normalizedSha),
    },
    fixture: {
      type: 'industry-standard antivirus test signature',
      sha256: createHash('sha256').update(fixture).digest('hex'),
      sizeBytes: fixture.length,
      generatedInMemory: true,
      bytesPersisted: false,
    },
    scanner: {
      provider: 'clamav',
      transport: 'clamd-instream',
      hostStored: false,
      portStored: false,
      classification: result.classification,
      responseReceived: result.responseReceived,
      responseBodyStored: false,
      signatureNameStored: false,
    },
    checks: [
      { name: 'exactSha', critical: true, passed: FULL_SHA.test(normalizedSha) },
      { name: 'sourceRunBound', critical: true, passed: NUMERIC.test(String(runId)) },
      { name: 'maliciousFixtureBlocked', critical: true, passed },
      { name: 'fixtureNotPersisted', critical: true, passed: true },
      { name: 'providerResponseNotPersisted', critical: true, passed: true },
    ],
    failures: passed ? [] : [result.classification],
    evidenceBoundary:
      'This proves that the live ClamAV service used by the workflow blocks an industry-standard antivirus test fixture. It does not prove every malware family is detectable or replace production-provider monitoring.',
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawScannerResponseStored: false,
      scannerSignatureStored: false,
      fixtureBytesStored: false,
      credentialsStored: false,
      exactShaBound: FULL_SHA.test(normalizedSha),
    },
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  console.log(`ClamAV blocking runtime proof: ${evidence.status}.`);
  if (!passed) process.exitCode = 1;
  return evidence;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runUploadScannerBlockingProof().catch((error) => {
    console.error(error instanceof Error ? error.message : 'upload_scanner_blocking_proof_failed');
    process.exitCode = 1;
  });
}
