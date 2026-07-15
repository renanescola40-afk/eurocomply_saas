#!/usr/bin/env node

import {
  closeSync,
  fsyncSync,
  ftruncateSync,
  openSync,
  readFileSync,
  writeSync,
} from 'node:fs';

const DEFAULT_FINAL_EVIDENCE_PATHS = [
  'docs/security/evidence/runtime/production-final-validation.json',
  'docs/security/evidence/runtime/final-validation-runner.json',
];
const RESPONSE_EVIDENCE_PATHS = [
  'docs/security/evidence/runtime/security-headers-validation.json',
  'docs/security/evidence/runtime/no-store-validation.json',
];
const FAILURE_SUMMARY =
  'Runtime security response evidence is missing, stale, SHA-mismatched, runtime-unbound, or failed.';

function appendUnique(items, value) {
  return [...new Set([...(Array.isArray(items) ? items : []), value])];
}

function mutateEvidenceDocument(path, transform) {
  let fileDescriptor;

  try {
    fileDescriptor = openSync(path, 'r+');
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }

  try {
    const document = JSON.parse(readFileSync(fileDescriptor, 'utf8'));
    const serialized = `${JSON.stringify(transform(document), null, 2)}\n`;

    ftruncateSync(fileDescriptor, 0);
    writeSync(fileDescriptor, serialized, 0, 'utf8');
    fsyncSync(fileDescriptor);
    return true;
  } finally {
    closeSync(fileDescriptor);
  }
}

export function applySecurityResponseStatus(document, { passed, generatedAt }) {
  const next = structuredClone(document);
  const isFinalValidationRunner = next?.evidenceItem === 'final-validation-runner';

  next.securityResponseEvidence = {
    status: passed ? 'Complete' : 'Open',
    outcome: passed ? 'passed' : 'failed',
    generatedAt,
    evidencePaths: RESPONSE_EVIDENCE_PATHS,
  };

  if (!passed) {
    next.status = 'Open';
    next.summary =
      'Release validation is blocked because final runtime security response evidence was not complete and exact-SHA bound.';

    if (isFinalValidationRunner) {
      next.outcome = 'blocked';
      next.releaseDecision = 'No-Go';
      next.failures = appendUnique(next.failures, FAILURE_SUMMARY);
      next.productionGate =
        'No-Go: runtime security headers and no-store evidence did not pass on the exact deployed SHA.';
    } else {
      next.outcome = 'failed';
      next.overallResult = 'failed';
      next.metadataFailures = appendUnique(next.metadataFailures, FAILURE_SUMMARY);
      next.releaseGate =
        'No-Go: runtime security headers and no-store evidence did not pass on the exact deployed SHA.';
    }
  }

  return next;
}

export function recordSecurityResponseFinalEvidence({
  passed,
  generatedAt = new Date().toISOString(),
  paths = DEFAULT_FINAL_EVIDENCE_PATHS,
} = {}) {
  let patched = 0;

  for (const path of paths) {
    const mutated = mutateEvidenceDocument(path, (document) =>
      applySecurityResponseStatus(document, { passed: passed === true, generatedAt }),
    );

    if (mutated) patched += 1;
  }

  if (patched === 0) {
    throw new Error('No final validation evidence document was available to record security response status.');
  }

  return { patched, passed: passed === true };
}
