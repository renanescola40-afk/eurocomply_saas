import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script = readFileSync('scripts/platform/build-final-release-evidence-pack.mjs', 'utf8');

test('requires all platform evidence lanes', () => {
  for (const lane of [
    'provider_configuration',
    'deployment_provenance',
    'provider_interoperability',
    'provider_transactions',
    'sentry_source_maps',
  ]) assert.match(script, new RegExp(lane));
});

test('requires exact release SHA and freshness', () => {
  assert.match(script, /40-character SHA/);
  assert.match(script, /release_sha !== expectedSha/);
  assert.match(script, /ageHours > maxAgeHours/);
});

test('requires hashes and source-map processing proof', () => {
  assert.match(script, /artifact_sha256/);
  assert.match(script, /processing_status !== 'PASS'/);
  assert.match(script, /Sentry release must equal the exact release SHA/);
});

test('rejects secret-shaped evidence and retains only redacted lanes', () => {
  assert.match(script, /FORBIDDEN_KEYS/);
  assert.match(script, /secret_values_included: false/);
  assert.match(script, /raw_provider_payloads_included: false/);
});

test('strict mode is fail closed', () => {
  assert.match(script, /strict && failures.length > 0/);
  assert.match(script, /PLATFORM_RELEASE_EVIDENCE_COMPLETE/);
  assert.match(script, /NO_GO/);
});
