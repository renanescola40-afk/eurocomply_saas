import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script = readFileSync('scripts/platform/validate-provider-transaction-evidence.mjs', 'utf8');

test('transaction evidence is bound to an exact release SHA', () => {
  assert.match(script, /RELEASE_SHA/);
  assert.match(script, /full lowercase 40-character SHA/);
  assert.match(script, /Evidence SHA does not match expected/);
});

test('all required provider transactions are mandatory', () => {
  assert.match(script, /supabase_oauth/);
  assert.match(script, /stripe_webhook/);
  assert.match(script, /sentry_ingestion/);
  assert.match(script, /Required transaction evidence is missing/);
});

test('evidence rejects sensitive keys and stores only hashes', () => {
  assert.match(script, /forbiddenKeys/);
  assert.match(script, /correlation_id_hash/);
  assert.match(script, /receipt_sha256/);
  assert.match(script, /secret_values_included:\s*false/);
});

test('evidence freshness is fail closed', () => {
  assert.match(script, /PROVIDER_EVIDENCE_MAX_AGE_HOURS/);
  assert.match(script, /Evidence is older than/);
  assert.match(script, /process\.exitCode = 1/);
});

test('validator states transactional limitations explicitly', () => {
  assert.match(script, /does not itself perform OAuth login/);
  assert.match(script, /send a Stripe webhook/);
  assert.match(script, /ingest a Sentry event/);
});
