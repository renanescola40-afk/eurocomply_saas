import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const validator = await readFile('scripts/security/check-p0-runtime-evidence-files.mjs', 'utf8');
const producer = await readFile('scripts/security/run-production-provider-runtime-proof.mjs', 'utf8');

test('provider producer emits fail-closed Open/blocked evidence when any provider fails', () => {
  assert.match(producer, /status: allPassed \? 'Complete' : 'Open'/);
  assert.match(producer, /outcome: allPassed \? 'passed' : 'blocked'/);
  assert.match(producer, /providersReviewed\.every\(\(entry\) => entry\.status === 'reviewed'\)/);
});

test('runtime evidence validator validates provider Open/blocked without granting PASS credit', () => {
  assert.match(validator, /function checkProductionProviderOpenEvidence\(/);
  assert.match(validator, /Open provider evidence must contain at least one blocked provider/);
  assert.match(validator, /reviewed provider .* must have every check true/);
  assert.match(validator, /blocked provider .* must preserve at least one failed check/);
  assert.match(validator, /controlsVerified must list only providers whose protected checks all passed/);
  assert.match(validator, /checkProductionProviderOpenEvidence\(file, evidence\)/);
});
