import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script = readFileSync('scripts/platform/check-final-evidence-drift.mjs', 'utf8');

test('drift monitor fails closed on missing or expired evidence', () => {
  assert.match(script, /missing or malformed/);
  assert.match(script, /has expired/);
  assert.match(script, /process\.exitCode = 1/);
});

test('drift monitor validates exact SHA and lane consistency', () => {
  assert.match(script, /\^\[a-f0-9\]\{40\}\$/);
  assert.match(script, /SHA drift detected/);
  assert.match(script, /lane\.status !== 'PASS'/);
});

test('drift report is redacted', () => {
  assert.match(script, /secret_values_included: false/);
  assert.doesNotMatch(script, /authorization|cookie|client_secret|service_role/i);
});
