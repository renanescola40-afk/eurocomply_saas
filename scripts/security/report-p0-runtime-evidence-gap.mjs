#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { activeP0RuntimeEvidenceItems } from './p0-runtime-evidence-catalog.mjs';

const requestedStrict = process.argv.includes('--strict');
const finalValidationInProgress = process.env.FINAL_VALIDATION_IN_PROGRESS === 'true';
const ciFinalRun = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
const finalReleaseGateRun = process.env.GITHUB_WORKFLOW === 'P0 Final Release Gate';
const refName = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || '';
const releaseReadyRef = /(?:final-evidence|release-ready)/.test(refName);
const strict = requestedStrict;
const registerPath = path.join('docs', 'security', 'P0_RUNTIME_EVIDENCE_REGISTER.md');
const runtimeDir = path.join('docs', 'security', 'evidence', 'runtime');
const satisfiedStatuses = new Set(['Complete']);
const expectedRepository = 'renanescola40-afk/eurocomply_saas';
const expectedBranch = 'main';
const expectedCommitSha = [
  process.env.RELEASE_COMMIT_SHA,
  process.env.GITHUB_SHA,
].map((value) => String(value ?? '').trim().toLowerCase())
  .find((value) => /^[a-f0-9]{40}$/.test(value));
const validationClock = new Date();

const requiredRuntimeItems = activeP0RuntimeEvidenceItems({
  finalValidationInProgress,
});

function fail(message) {
  console.error(`P0 runtime evidence gap report failed: ${message}`);
  process.exit(1);
}

function normalizeItem(item) {
  return String(item ?? '').replace(/`/g, '').trim();
}

function validatorFailuresFor(validator, evidence) {
  if (typeof validator !== 'function') {
    return ['canonical validator is missing'];
  }

  try {
    const result = validator(evidence, {
      now: validationClock,
      expectedBranch,
      expectedRepository,
      expectedCommitSha,
    });
    return Array.isArray(result) ? result : ['canonical validator returned a non-array result'];
  } catch (error) {
    return [
      `canonical validator threw: ${error instanceof Error ? error.message : String(error)}`,
    ];
  }
}

function readEvidence(file, validator) {
  const evidencePath = path.join(runtimeDir, file);
  if (!fs.existsSync(evidencePath)) {
    return {
      evidencePath,
      evidenceFileExists: false,
      evidenceStatus: 'missing',
      evidenceOutcome: 'missing',
      evidenceSatisfied: false,
      validatorFailures: ['evidence file is missing'],
    };
  }

  try {
    const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    const evidenceStatus = String(evidence.status ?? 'missing');
    const evidenceOutcome = evidence.outcome === undefined
      ? 'not_recorded'
      : String(evidence.outcome);
    const placeholderOnly = evidence.placeholderOnly === true
      || evidence.evidenceIntegrity?.placeholderOnly === true;
    const validatorFailures = validatorFailuresFor(validator, evidence);
    const evidenceSatisfied = evidenceStatus === 'Complete'
      && (evidence.outcome === undefined || evidenceOutcome === 'passed')
      && !placeholderOnly
      && validatorFailures.length === 0;

    return {
      evidencePath,
      evidenceFileExists: true,
      evidenceStatus,
      evidenceOutcome,
      placeholderOnly,
      validatorFailures,
      evidenceSatisfied,
    };
  } catch (error) {
    return {
      evidencePath,
      evidenceFileExists: true,
      evidenceStatus: 'invalid_json',
      evidenceOutcome: 'invalid_json',
      evidenceSatisfied: false,
      validatorFailures: ['evidence JSON could not be parsed'],
      parseError: error instanceof Error ? error.message : String(error),
    };
  }
}

if (!fs.existsSync(registerPath)) fail(`missing register: ${registerPath}`);

const rows = fs.readFileSync(registerPath, 'utf8')
  .split('\n')
  .filter((line) => line.startsWith('|') && !line.includes('---'))
  .map((line) => line.split('|').map((cell) => cell.trim()).filter(Boolean));
const statusByItem = new Map(
  rows
    .filter(([item]) => item && item !== 'Evidence item')
    .map(([item, status]) => [normalizeItem(item), status.replace(/`/g, '')]),
);

function statusFor(entry) {
  const names = [entry.item, ...(entry.aliases ?? [])].map(normalizeItem);
  for (const name of names) {
    const status = statusByItem.get(name);
    if (status) return status;
  }
  return 'Missing from register';
}

const results = requiredRuntimeItems.map((entry) => {
  const status = statusFor(entry);
  const evidence = readEvidence(entry.file, entry.validator);
  const satisfiedStatus = satisfiedStatuses.has(status);
  return {
    item: entry.item,
    registerStatus: status,
    evidenceFile: evidence.evidencePath,
    evidenceFileExists: evidence.evidenceFileExists,
    evidenceStatus: evidence.evidenceStatus,
    evidenceOutcome: evidence.evidenceOutcome,
    placeholderOnly: evidence.placeholderOnly === true,
    validatorFailures: evidence.validatorFailures,
    parseError: evidence.parseError,
    satisfiedStatus,
    satisfied: satisfiedStatus && evidence.evidenceSatisfied,
  };
});
const missing = results.filter((entry) => !entry.satisfied);
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
    expectedRepository,
    expectedBranch,
    expectedCommitSha: expectedCommitSha ?? null,
    catalogSource: 'scripts/security/p0-runtime-evidence-catalog.mjs',
  },
  missing,
  results,
};
console.log(JSON.stringify(report, null, 2));
if (strict && missing.length > 0) {
  console.error('Strict P0 runtime evidence gap enforcement failed. Complete real runtime evidence is required; exceptions/open placeholders do not pass.');
  process.exit(1);
}
