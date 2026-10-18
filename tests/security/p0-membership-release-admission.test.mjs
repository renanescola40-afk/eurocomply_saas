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

test('P0 admission requires manual legacy cutover and audited-only caller ACL', () => {
  for (const name of [
    'legacy_removal_retired', 'legacy_role_retired',
    'audited_removal_service_only', 'audited_role_service_only',
  ]) {
    assert.ok(sql.includes(`x.${name}`), `Missing fail-closed admission check: ${name}`);
  }
  assert.match(sql, /rpc_id_gate\s+as\s*\(/i);
  assert.match(sql, /rpc_cutover_gate\s+as\s*\(/i);
  assert.match(sql, /not has_function_privilege\('service_role', legacy_removal, 'EXECUTE'\)/);
  assert.match(sql, /not has_function_privilege\('service_role', legacy_role, 'EXECUTE'\)/);
  assert.match(sql, /has_function_privilege\('service_role', audited_removal, 'EXECUTE'\)/);
  assert.match(sql, /has_function_privilege\('service_role', audited_role, 'EXECUTE'\)/);
  for (const role of ['anon', 'authenticated']) {
    for (const rpc of ['audited_removal', 'audited_role']) {
      assert.ok(sql.includes(`not has_function_privilege('${role}', ${rpc}, 'EXECUTE')`));
    }
  }
  assert.match(sql, /cross join rpc_cutover_gate x/i);
  for (const name of [
    'legacy_removal_retired', 'legacy_role_retired',
    'audited_removal_service_only', 'audited_role_service_only',
  ]) {
    assert.match(sql, new RegExp(`\\band x\\.${name}\\b`));
  }
});

test('Admission cannot claim production release permission', () => {
  assert.ok(sql.includes('SCHEMA_CANDIDATE_REQUIRES_RUNTIME_ACCEPTANCE'));
  assert.ok(sql.includes('BLOCKED_SOURCE_DB_DRIFT'));
  assert.doesNotMatch(sql, /\bENTERPRISE_100\s*=\s*PASS\b/i);
});

test('CircleCI executes the native Node P0 contracts excluded by Vitest TS-only discovery', () => {
  const ci = readFileSync('.circleci/config.yml', 'utf8');
  assert.match(ci, /command: npm run test/);
  assert.match(ci, /node --test tests\/security\/p0-membership-release-admission\.test\.mjs/);
  for (const path of [
    'tests/security/membership-usage-counter-drift.test.mjs',
    'tests/security/p0f-manual-counter-reconciliation.test.mjs',
  ]) {
    assert.ok(ci.includes(path), `Native Node CI missing contract: ${path}`);
  }
});
