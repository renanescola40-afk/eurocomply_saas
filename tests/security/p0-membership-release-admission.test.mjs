import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const sql = readFileSync('scripts/supabase/p0-membership-release-admission.sql', 'utf8');

test('P0 admission reads metadata only; it is not a migration', () => {
  assert.match(sql, /with\s+migration_gate\s+as\s*\(/i);
  assert.match(sql, /select\s+m\.applied_count/i);
  assert.doesNotMatch(sql, /\b(create|alter|drop|truncate|insert|update|delete|grant|revoke)\s+(?:table|function|into|on|from|public\.)/i);
});

test('P0 admission requires exactly five migration ledger versions and source guards', () => {
  for (const version of ['20261015235500','20261018023000','20261018113000','20261018160000','20261018183000']) {
    assert.ok(sql.includes(version), 'Missing migration '+version);
  }
  for (const gate of ['mfa_read','mfa_manage','owner_removal','removal_audited','role_audited','owner_suspension']) {
    assert.ok(sql.includes(gate), 'Missing functional verification '+gate);
  }
  assert.ok(sql.includes('m.applied_count=5'));
  assert.ok(sql.includes('public_tables = r.public_rls_force'));
  assert.ok(sql.includes('public_definer_exposed = 0'));
});

test('Admission cannot claim production release permission', () => {
  assert.ok(sql.includes('SCHEMA_CANDIDATE_REQUIRES_RUNTIME_ACCEPTANCE'));
  assert.ok(sql.includes('BLOCKED_SOURCE_DB_DRIFT'));
  assert.doesNotMatch(sql, /\bENTERPRISE_100\s*=\s*PASS\b/i);
});
