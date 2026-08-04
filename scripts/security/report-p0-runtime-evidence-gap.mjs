#!/usr/bin/env node
import { evaluateP0RuntimeEvidence } from './evaluate-p0-runtime-evidence.mjs';

const requestedStrict = process.argv.includes('--strict');
const finalValidationInProgress = process.env.FINAL_VALIDATION_IN_PROGRESS === 'true';
const ciFinalRun = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
const finalReleaseGateRun = process.env.GITHUB_WORKFLOW === 'P0 Final Release Gate';
const refName = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || '';
const releaseReadyRef = /(?:final-evidence|release-ready)/.test(refName);
const strict = requestedStrict;

function fail(message) {
  console.error(`P0 runtime evidence gap report failed: ${message}`);
  process.exit(1);
}

let evaluation;
try {
  evaluation = evaluateP0RuntimeEvidence({
    finalValidationInProgress,
    requireRegisterStatus: false,
  });
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

const { results, missing, registerDrift } = evaluation;
const report = {
  p0RuntimeEvidenceGap: {
    satisfied: results.length - missing.length,
    total: results.length,
    percentSatisfied: Math.round(((results.length - missing.length) / results.length) * 100),
    percentMissing: Math.round((missing.length / results.length) * 100),
    strictRequested: requestedStrict,
    strictEnforced: strict,
    finalValidationInProgress,
    ciFinalRun,
    finalReleaseGateRun,
    releaseReadyRef,
    expectedRepository: evaluation.expectedRepository,
    expectedBranch: evaluation.expectedBranch,
    expectedCommitSha: evaluation.expectedCommitSha,
    validationClock: evaluation.validationClock,
    registerStatusRequired: evaluation.registerStatusRequired,
    registerAdvisoryOnly: true,
    registerDriftCount: registerDrift.length,
    catalogSource: 'scripts/security/p0-runtime-evidence-catalog.mjs',
    evaluatorSource: 'scripts/security/evaluate-p0-runtime-evidence.mjs',
    generatedRegisterSource: 'scripts/security/generate-p0-runtime-evidence-register.mjs',
  },
  registerDrift,
  missing,
  results,
};

console.log(JSON.stringify(report, null, 2));
if (strict && missing.length > 0) {
  console.error('Strict P0 runtime evidence gap enforcement failed. Complete real runtime evidence is required; legacy Markdown status, exceptions and placeholders do not pass.');
  process.exit(1);
}
