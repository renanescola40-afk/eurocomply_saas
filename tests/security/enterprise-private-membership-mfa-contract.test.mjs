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


// The historical October migration is deliberately immutable. Guard the
// November forward correction separately so future changes cannot reintroduce
// auth.uid() UUID casting on Clerk text subjects or strip tenant MFA/role gates.
const forwardMigration = readFileSync(
  'supabase/migrations/20261103080000_enterprise_clerk_text_subject_mfa_reconciliation.sql',
  'utf8',
);

function forwardWrapperBody(source, helper) {
  const re = new RegExp('create or replace function app_private\\.' + helper +
    '\\(p_organization_id uuid\\)([\\s\\S]*?)\\$function\\$;', 'i');
  const match = source.match(re);
  assert.ok(match, 'Missing Clerk-safe forward wrapper: ' + helper);
  return match[1];
}

function assertForwardClerkWrapper(source, helper, delegated) {
  const sql = forwardWrapperBody(source, helper);
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = pg_catalog/i);
  assert.match(sql, /p_organization_id is not null/i);
  assert.match(sql, delegated);
  assert.doesNotMatch(sql, /auth\.uid\(\)/i);
  assert.doesNotMatch(sql, /\borganization_members\b/i);
  assert.doesNotMatch(sql, /current_setting\s*\(/i);
}

test('forward migration is ordered, transactional and refuses unsafe prerequisites', () => {
  assert.match(forwardMigration, /^\s*begin\s*;/i);
  assert.match(forwardMigration, /commit\s*;\s*$/i);
  for (const dependency of [
    'app_private.enterprise_member_can_read(uuid)',
    'app_private.enterprise_member_can_manage(uuid)',
    'app_private.is_org_member(uuid)',
    'app_private.has_org_role(uuid,text[])',
    'public.current_clerk_user_id()',
    'public.current_legacy_user_id()',
    'public.tenant_mfa_satisfied(uuid)',
  ]) {
    assert.ok(forwardMigration.includes("to_regprocedure('" + dependency + "')"),
      'Missing dependency preflight: ' + dependency);
  }
  assert.match(forwardMigration, /search_path=pg_catalog/);
  assert.match(forwardMigration, /current_clerk_user_id/);
  assert.match(forwardMigration, /current_legacy_user_id/);
  assert.match(forwardMigration, /tenant_mfa_satisfied/);
  assert.ok(forwardMigration.indexOf('do $preflight$') <
    forwardMigration.indexOf('create or replace function app_private.enterprise_member_can_read'));
});

test('forward read and manage wrappers preserve Clerk/UUID-safe membership and roles', () => {
  assertForwardClerkWrapper(forwardMigration, 'enterprise_member_can_read',
    /app_private\.is_org_member\(p_organization_id\)/);
  assertForwardClerkWrapper(forwardMigration, 'enterprise_member_can_manage',
    /app_private\.has_org_role\(\s*p_organization_id,\s*array\[/);
  const sql = forwardWrapperBody(forwardMigration, 'enterprise_member_can_manage');
  for (const role of ['owner', 'admin', 'editor', 'compliance_manager']) {
    assert.ok(sql.includes("'" + role + "'"), 'Missing manager role: ' + role);
  }
});

test('forward helpers stay private, deny anon, and retain authenticated/service grants', () => {
  for (const helper of ['enterprise_member_can_read', 'enterprise_member_can_manage']) {
    assert.ok(forwardMigration.includes(
      'revoke all on function app_private.' + helper + '(uuid) from public, anon;'));
    assert.ok(forwardMigration.includes(
      'grant execute on function app_private.' + helper + '(uuid) to authenticated, service_role;'));
  }
  assert.match(forwardMigration, /has_function_privilege\('anon', helper_oid, 'EXECUTE'\)/);
  assert.match(forwardMigration, /Enterprise Clerk-safe helper postcondition failed/);
  assert.match(forwardMigration, /to_regprocedure\('public\.enterprise_member_can_read\(uuid\)'\) is not null/);
  assert.match(forwardMigration, /to_regprocedure\('public\.enterprise_member_can_manage\(uuid\)'\) is not null/);
});

test('regression: removing either canonical membership/role delegation fails contract', () => {
  const readDelegation = 'and app_private.is_org_member(p_organization_id);';
  const manageDelegation = 'and app_private.has_org_role(';
  assert.ok(forwardMigration.includes(readDelegation));
  assert.ok(forwardMigration.includes(manageDelegation));
  assert.throws(() => assertForwardClerkWrapper(
    forwardMigration.replace(readDelegation, 'and true;'),
    'enterprise_member_can_read', /app_private\.is_org_member\(p_organization_id\)/),
    /app_private\.is_org_member/);
  assert.throws(() => assertForwardClerkWrapper(
    forwardMigration.replace(manageDelegation, 'and true /* intentionally invalid */('),
    'enterprise_member_can_manage', /app_private\.has_org_role\(/),
    /app_private\.has_org_role/);
});


test('metadata-only MFA audit accepts safe delegated Clerk/UUID guards but detects a removed guard', () => {
  // This catches a real false NO_GO observed with the November migration:
  // the historical audit required tenant_mfa_satisfied on the wrapper,
  // while the new wrappers enforce it through the canonical private helpers.
  assert.match(audit, /canonical_status as\s*\(/i);
  for (const expected of [
    'canonical_security_definer',
    'canonical_pinned_search_path',
    'canonical_mfa',
    'canonical_clerk',
    'canonical_uuid',
    'canonical_active_member',
    'canonical_authenticated_execution',
    'canonical_anonymous_execution',
    'app_private.is_org_member(p_organization_id)',
    'app_private.has_org_role(',
    'NO_GO_RUNTIME_MFA',
    'PASS_METADATA_ONLY',
  ]) assert.ok(audit.includes(expected), 'Missing fail-closed audit guard: ' + expected);
  assert.match(audit, /not c\.canonical_anonymous_execution/i);
  assert.match(audit, /and c\.canonical_mfa/i);
  assert.match(audit, /not anonymous_execution\)=2/i);
});
