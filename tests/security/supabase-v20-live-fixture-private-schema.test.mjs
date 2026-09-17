import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const path = 'scripts/security/supabase-v20-live-fixtures.mjs';
const source = readFileSync(path, 'utf8');

test('live commercial fixture keeps app_private off PostgREST', () => {
  assert.equal(source.includes(".schema('app_private')"), false);
  assert.match(source, /enterprise_entitlement_sources/);
  assert.match(source, /enterprise_entitlement_snapshots/);
  assert.match(source, /persisted_authority_then_quota_trigger/);
  assert.match(source, /downstream quota-protected fixture writes exercise/);
});
