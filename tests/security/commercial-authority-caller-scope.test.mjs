import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const migration=readFileSync('supabase/migrations/20261105225000_scope_commercial_authority_to_active_membership.sql','utf8');
const qa=readFileSync('tests/security/commercial-authority-caller-scope-qa-rollback.sql','utf8');
test('keeps security definer and trusted server-side commercial authority',()=>{
  assert.equal((migration.match(/language sql stable security definer/gi)||[]).length,2);
  assert.match(migration,/current_setting\('role',true\)='authenticated'/);
  assert.match(migration,/session_user='authenticated'/);
  assert.match(migration,/current_setting\('role',true\)='service_role'/);
  assert.match(migration,/app_private\.resolve_commercial_plan\(target_organization_id\)/);
});
test('requires membership in both caller-scoped commercial helpers',()=>{
  assert.ok((migration.match(/app_private\.is_org_member\(target_organization_id\)/g)||[]).length>=2);
  assert.match(migration,/tenant_mfa_satisfied/);
  assert.match(migration,/when 'business' then 3/);
  assert.match(migration,/when 'enterprise' then 4/);
});
test('preserves strict helper grants without exposing anonymous RPC execution',()=>{
  for(const signature of ['has_commercial_authority\(uuid\)','has_minimum_commercial_plan\(uuid,text\)']){
    assert.ok(migration.includes('revoke all on function app_private.'+signature+' from public, anon;'));
    assert.ok(migration.includes('grant execute on function app_private.'+signature+' to authenticated,service_role;'));
  }
  assert.doesNotMatch(migration,/disable row level security|drop policy|grant .* to anon;|auth\.role\(\)/i);
});
test('requires separate isolated QA fixture, MFA/cross-tenant/negative regressions and rollback',()=>{
  assert.match(qa,/where clerk_user_id like 'qa-%'/);
  assert.match(qa,/status='active'/);
  assert.match(qa,/where require_mfa_for_all_users/);
  assert.match(qa,/SEC-04 outsider inferred another tenant license/);
  assert.match(qa,/SEC-04 AAL1 MFA bypass/);
  assert.match(qa,/SEC-04 backend service_role entitlement regression/);
  assert.match(qa,/\nrollback;\s*select/);
});
