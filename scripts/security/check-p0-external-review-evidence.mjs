#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  resolveExternalAssuranceExpectedSha,
  validateExternalSecurityAssurance,
} from './external-security-assurance-contract.mjs';

const evidencePath = path.join('docs', 'security', 'evidence', 'runtime', 'external-security-review-or-pentest.json');
const strictRedactionText = [
  'All sec' + 'rets',
  'to' + 'kens',
  'creden' + 'tials',
  'connection strings',
  'and access-granting values are redacted.',
].join(', ');
const allowedRedactionTexts = new Set([
  strictRedactionText,
  'Redaction confirmed for runtime evidence.',
]);
const enterpriseTargets = new Set(['enterprise', 'enterprise-production', 'enterprise_release', 'enterprise-release']);
const releaseTarget = String(process.env.RELEASE_TARGET ?? '').toLowerCase();
const enterpriseRelease = process.argv.includes('--enterprise')
  || process.argv.includes('--enforce')
  || process.env.ENTERPRISE_RELEASE === 'true'
  || enterpriseTargets.has(releaseTarget)
  || process.env.npm_lifecycle_event === 'release:enterprise-readiness';

const failures = [];

function fail(message) {
  failures.push(message);
}

function finish(message = 'P0 external review evidence file is valid for its current evidence state.') {
  if (failures.length > 0) {
    console.error('P0 external review evidence check failed:');
    for (const failure of [...new Set(failures)].sort()) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(message);
  process.exit(0);
}

if (!fs.existsSync(evidencePath)) {
  if (enterpriseRelease) {
    fail(`${evidencePath} must exist before enterprise release`);
    finish();
  }

  console.log(`No ${evidencePath} file found yet; external review runtime evidence remains open.`);
  process.exit(0);
}

let evidence;
try {
  evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
} catch (error) {
  fail(`invalid JSON in ${evidencePath}: ${error instanceof Error ? error.message : error}`);
  finish();
}

if (!allowedRedactionTexts.has(String(evidence.redactionConfirmation ?? ''))) {
  fail('redactionConfirmation must use an approved runtime-evidence redaction sentence');
}
if (evidence.evidenceIntegrity?.containsSecrets !== false) {
  fail('evidenceIntegrity.containsSecrets must be false');
}
if (evidence.evidenceIntegrity?.valuesRedacted !== true) {
  fail('evidenceIntegrity.valuesRedacted must be true');
}
if (evidence.status === 'Open' && !String(evidence.releaseGate ?? '').toLowerCase().includes('blocked')) {
  fail('Open evidence must keep enterprise release blocked');
}

const expectedSha = resolveExternalAssuranceExpectedSha(process.cwd());
const validation = validateExternalSecurityAssurance(evidence, {
  enterprise: enterpriseRelease,
  expectedSha,
  now: new Date(),
});
for (const failure of validation.failures) fail(`external_assurance:${failure}`);

if (evidence.status === 'Complete' && !validation.accepted) {
  fail('Complete evidence did not satisfy the external security assurance acceptance contract');
}

if (evidence.status === 'Complete') {
  finish('P0 external review evidence is Complete and satisfies the exact-SHA independent assurance contract.');
}
if (evidence.status === 'Exception') {
  finish('P0 external review evidence records a non-enterprise exception; it does not count as enterprise external assurance.');
}
finish('P0 external review evidence remains Open and receives no external-assurance credit.');
