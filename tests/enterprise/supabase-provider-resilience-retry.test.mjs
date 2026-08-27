import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { isRetryableManagementApiStatus } from '../../scripts/security/check-supabase-provider-resilience.mjs';

const producer = readFileSync('scripts/security/check-supabase-provider-resilience.mjs', 'utf8');

test('retries only transient Supabase Management API status classes', () => {
  for (const status of [408, 429, 500, 502, 503, 504, 599]) {
    assert.equal(isRetryableManagementApiStatus(status), true, `${status} must be retryable`);
  }

  for (const status of [200, 201, 400, 401, 403, 404, 409, 422]) {
    assert.equal(isRetryableManagementApiStatus(status), false, `${status} must fail without retry`);
  }
});

test('bounds retries and preserves per-attempt request timeout', () => {
  assert.match(producer, /const API_TIMEOUT_MS = 8_000;/);
  assert.match(producer, /const API_MAX_ATTEMPTS = 3;/);
  assert.match(producer, /const API_RETRY_BASE_DELAY_MS = 250;/);
  assert.match(producer, /attempt <= API_MAX_ATTEMPTS/);
  assert.match(producer, /AbortSignal\.timeout\(API_TIMEOUT_MS\)/);
});

test('network and retryable HTTP failures remain fail closed after the final attempt', () => {
  assert.match(producer, /if \(attempt < API_MAX_ATTEMPTS\) \{\s*await sleep\(API_RETRY_BASE_DELAY_MS \* attempt\);\s*continue;/);
  assert.match(producer, /attempt < API_MAX_ATTEMPTS && isRetryableManagementApiStatus\(status\)/);
  assert.match(producer, /return \{ reachable: false, status, body: null \};/);
  assert.match(producer, /return \{ reachable: false, status: null, body: null \};/);
});
