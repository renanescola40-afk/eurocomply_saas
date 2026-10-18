import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const sql = readFileSync('scripts/supabase/p0-membership-release-admission.sql', 'utf8');

test('P0 admission is read-only: catalog and aggregate integrity without tenant details', () => {
  assert.match(sql, /with\s+migration_gate\s+as\s*\(/i);
  assert.match(sql, /select\s+m\.applied_count/i);
  assert.doesNotMatch(sql, /\b(create|alter|drop|truncate|insert|update|delete|grant|revoke)\s+(?:table|function|into|on|from|public\.)/i);
  const emitted = sql.split(/\)\s*select\s+m\.applied_count\s*,/i)[1];
  assert.ok(emitted, 'Missing final select');
  assert.doesNotMatch(emitted, /organization_id|member_id|user_id|email|full_name/i);
});

test('P0 admission requires all six migration ledger versions including counter reconciliation', () => {
  for (const version of ['20261015235500','20261018023000','20261018113000','20261018160000','20261018183000','20261018190000']) {
    assert.ok(sql.includes(version), 'Missing migration ' + version);
  }
  for (const gate of ['mfa_read','mfa_manage','owner_removal','removal_audited','role_audited','owner_suspension', 'removal_usage_reconciled', 'role_usage_reconciled']) {
    assert.ok(sql.includes(gate), 'Missing functional verification ' + gate);
  }
  assert.match(sql,/\bm\.applied_count\s*=\s*6\b/);
  assert.match(sql,/\bu\.drifted_usage_organizations\s*=\s*0\b/);
  assert.match(sql,/\bu\.organizations_missing_usage\s*=\s*0\b/);
  assert.ok(sql.includes('public_tables = r.public_rls_force'));
  assert.ok(sql.includes('public_definer_exposed = 0'));
});

test('P0 admission compares member, seat and admin counters and catches missing usage rows', () => {
  for (const field of ['active_members','full_users','participants','viewers','active_admins']) {
    assert.match(sql,new RegExp(`usage\\.${field} is distinct from coalesce\\(actual\\.${field},0\\)`,'i'));
  }
  assert.match(sql,/from\s+membership_totals\s+as\s+missing[\s\S]*left join\s+public\.organization_usage\s+as\s+existing/i);
  assert.match(sql,/count\(\*\)::integer as usage_organizations_checked/i);
  assert.match(sql,/count\(\*\) filter\s*\(where/i);
});

test('Admission cannot claim production release permission', () => {
  assert.ok(sql.includes('SCHEMA_CANDIDATE_REQUIRES_RUNTIME_ACCEPTANCE'));
  assert.ok(sql.includes('BLOCKED_SOURCE_DB_DRIFT'));
  assert.doesNotMatch(sql, /\bENTERPRISE_100\s*=\s*PASS\b/i);
});
