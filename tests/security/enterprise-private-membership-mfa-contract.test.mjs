import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20261015235500_enterprise_private_membership_mfa_gate.sql', 'utf8');
const audit = readFileSync('scripts/security/audit-enterprise-member-mfa-runtime.sql', 'utf8');

function helperBody(source, helper) {
  const anchor = new RegExp('create or replace function app_private\\.' + helper +
    '\\(p_organization_id uuid\\)([\\s\\S]*?)(?=\\ncreate or replace function|\\n-- Preserve the documented)', 'i');
  const match = source.match(anchor);
  assert.ok(match, 'Missing function: ' + helper);
  return match[1];
}

function assertMfaGated(source, helper) {
  const sql = helperBody(source, helper);
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = pg_catalog/i);
  assert.match(sql, /p_organization_id is not null/);
  assert.match(sql, /auth\.uid\(\) is not null/);
  assert.match(sql, /public\.tenant_mfa_satisfied\(p_organization_id\)/);
  assert.match(sql, /lower\(coalesce\(om\.status,\s*''\)\) = 'active'/i);
  assert.match(sql, /om\.user_id = auth\.uid\(\)/);
}

test('migration is transactional and checks dependencies before editing private helpers', () => {
  assert.match(migration, /^\s*begin\s*;/i);
  assert.match(migration, /commit\s*;\s*$/i);
  assert.match(migration, /to_regprocedure\('public\.tenant_mfa_satisfied\(uuid\)'\)/);
  assert.match(migration, /to_regclass\('public\.organization_members'\)/);
  assert.ok(migration.indexOf('do $preflight$') <
    migration.indexOf('create or replace function app_private.enterprise_member_can_read'));
});

test('enterprise read helper requires active membership AND tenant MFA', () => {
  assertMfaGated(migration, 'enterprise_member_can_read');
});

test('enterprise manage helper requires tenant MFA and retains manager role boundaries', () => {
  assertMfaGated(migration, 'enterprise_member_can_manage');
  const sql = helperBody(migration, 'enterprise_member_can_manage');
  for (const role of ['owner', 'admin', 'editor', 'compliance_manager']) {
    assert.ok(sql.includes("'" + role + "'"));
  }
});

test('preserves authenticated access while rejecting anonymous invocation', () => {
  for (const helper of ['enterprise_member_can_read','enterprise_member_can_manage']) {
    assert.ok(migration.includes('revoke all on function app_private.' + helper +
      '(uuid) from public, anon;'));
    assert.ok(migration.includes('grant execute on function app_private.' + helper +
      '(uuid) to authenticated, service_role;'));
  }
  assert.match(migration, /raise exception 'Enterprise helper MFA or privilege postcondition failed/);
});

test('runtime audit explicitly treats catalog PASS as metadata-only', () => {
  for (const table of [
    'enterprise_evidence_pack_items','enterprise_evidence_packs',
    'enterprise_risk_reviews','enterprise_vendor_due_diligence',
  ]) assert.ok(audit.includes("'" + table + "'"));
  assert.ok(audit.includes('NO_GO_RUNTIME_MFA'));
  assert.ok(audit.includes('PASS_METADATA_ONLY'));
  assert.ok(!audit.includes('DATABASE_SECURITY_100_PASS'));
});

test('regression: removing tenant MFA from either helper fails the contract', () => {
  for (const helper of ['enterprise_member_can_read','enterprise_member_can_manage']) {
    const current = helperBody(migration, helper);
    const modified = migration.replace(current,
      current.replace('and public.tenant_mfa_satisfied(p_organization_id)', ''));
    assert.throws(() => assertMfaGated(modified, helper),
      /tenant_mfa_satisfied/);
  }
});
