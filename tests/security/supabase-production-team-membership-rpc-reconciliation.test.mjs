import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/supabase-production-rls-reconciliation.yml', 'utf8');
const sql = readFileSync('supabase/reconciliation/20260922203500_team_membership_runtime_rpcs_hotfix.sql', 'utf8');

test('membership RPC production lane is explicit and non-generic', () => {
  assert.match(workflow, /- rls_catalog/);
  assert.match(workflow, /- team_membership_rpcs/);
  assert.match(workflow, /APPLY_TEAM_MEMBERSHIP_RPC_RECONCILIATION/);
  assert.match(workflow, /Unsupported reconciliation package/);
  assert.match(workflow, /20260922203500_team_membership_runtime_rpcs_hotfix\.sql/);
  assert.doesNotMatch(workflow, /inputs\.sql_file/);
  assert.doesNotMatch(workflow, /inputs\.migration_path/);
});

test('lane keeps exact-main and protected production governance', () => {
  assert.match(workflow, /git ls-remote origin refs\/heads\/main/);
  assert.match(workflow, /check-github-environment-governance\.mjs/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /SUPABASE_DB_POOLER_URL/);
  assert.doesNotMatch(workflow, /continue-on-error/);
});

test('membership reconciliation is service-role only and records exact ledger identity', () => {
  assert.match(sql, /revoke all on function public\.change_organization_member_role_atomic[\s\S]*from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.change_organization_member_role_atomic[\s\S]*to service_role/);
  assert.match(sql, /revoke all on function public\.remove_organization_member_atomic[\s\S]*from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.remove_organization_member_atomic[\s\S]*to service_role/);
  assert.match(sql, /'20260922203500'/);
  assert.match(sql, /'reconcile_team_membership_runtime_rpcs'/);
  assert.match(sql, /ACL mismatch/);
});

test('post-write proof checks both RPCs, search path, execute grants and ledger', () => {
  assert.match(workflow, /verify-team-membership-rpc-reconciliation\.mjs/);
  assert.match(workflow, /security_definer=/);
  assert.match(workflow, /service_role=/);
  assert.match(workflow, /history\|/);
});
