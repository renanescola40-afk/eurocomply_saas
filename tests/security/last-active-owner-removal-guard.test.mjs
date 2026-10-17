// Source/design assertions. PostgreSQL integration and concurrent tenant A/B
// tests are separate required release gates; this suite does NOT certify them.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync('supabase/migrations/20261018023000_guard_last_active_owner_removal.sql', 'utf8');
const workflow = readFileSync('.github/workflows/supabase-production-rls-reconciliation.yml', 'utf8');
const historicalSql = readFileSync('supabase/reconciliation/20260922203500_team_membership_runtime_rpcs_hotfix.sql', 'utf8');

function expectedDecision(rows, memberId) {
  const target = rows.find((member) => member.id === memberId);
  if (!target) return 'not_found';
  if (target.role !== 'owner' || target.status !== 'active') return 'removed';
  const activeOwners = rows.filter((member) => member.role === 'owner' && member.status === 'active');
  return activeOwners.length <= 1 ? 'last_owner' : 'removed';
}

for (const [label, rows, memberId, expected] of [
  ['one active owner', [{ id: 'a', role: 'owner', status: 'active' }], 'a', 'last_owner'],
  ['active plus suspended owner', [
    { id: 'a', role: 'owner', status: 'active' },
    { id: 'b', role: 'owner', status: 'suspended' },
  ], 'a', 'last_owner'],
  ['active plus deprovisioned owner', [
    { id: 'a', role: 'owner', status: 'active' },
    { id: 'b', role: 'owner', status: 'deprovisioned' },
  ], 'a', 'last_owner'],
  ['two active owners', [
    { id: 'a', role: 'owner', status: 'active' },
    { id: 'b', role: 'owner', status: 'active' },
  ], 'a', 'removed'],
  ['suspended owner removal', [
    { id: 'a', role: 'owner', status: 'suspended' },
    { id: 'b', role: 'owner', status: 'active' },
  ], 'a', 'removed'],
  ['ordinary member removal', [
    { id: 'a', role: 'member', status: 'active' },
    { id: 'b', role: 'owner', status: 'active' },
  ], 'a', 'removed'],
  ['missing target', [{ id: 'a', role: 'owner', status: 'active' }], 'b', 'not_found'],
]) {
  test(`DESIGN_ONLY: ${label}`, () => {
    assert.equal(expectedDecision(rows, memberId), expected);
  });
}

test('STATIC_ONLY: keep legacy signature, outcomes and protected execution', () => {
  assert.match(source, /create or replace function public\.remove_organization_member_atomic\(\s*p_organization_id uuid,\s*p_member_id uuid,\s*p_expected_user_id uuid,\s*p_expected_role text\s*\)/i);
  assert.match(source, /returns table\s*\(\s*outcome text,\s*affected_member_id uuid,\s*affected_user_id uuid,\s*previous_role text/i);
  assert.match(source, /security definer\s+set search_path = pg_catalog/i);
  assert.match(source, /revoke all on function public\.remove_organization_member_atomic[\s\S]*?from public, anon, authenticated/i);
  assert.match(source, /grant execute on function public\.remove_organization_member_atomic[\s\S]*?to service_role/i);
});

test('STATIC_ONLY: only active owner count blocks last owner', () => {
  assert.match(source, /v_member\.status\s*=\s*'active'/i);
  assert.match(source, /om\.status\s*=\s*'active'/i);
  assert.match(source, /v_active_owner_count\s*<=\s*1/i);
  assert.match(source, /'last_owner'::text/i);
});

test('STATIC_ONLY: tenant row locks and CAS reject stale role/user/status', () => {
  assert.match(source, /where om\.organization_id = p_organization_id\s+order by om\.id for update/i);
  assert.match(source, /v_member\.user_id is distinct from p_expected_user_id/i);
  assert.match(source, /v_member\.role is distinct from p_expected_role/i);
  assert.match(source, /om\.status is not distinct from v_member\.status/i);
  assert.match(source, /'state_changed'::text/i);
});

test('STATIC_ONLY: cannot apply old workflow package after guard rollout', () => {
  assert.match(workflow, /\$PACKAGE" == 'team_membership_rpcs' && "\$MODE" == 'apply'/);
  assert.match(workflow, /Legacy team membership hotfix is retired/);
});

test('STATIC_ONLY: direct historical SQL refuses guarded/audited runtime', () => {
  assert.match(historicalSql, /Retired team membership hotfix cannot overwrite audited atomic member removal/);
  assert.match(historicalSql, /pg_get_functiondef\(v_legacy\) ilike '%v_active_owner_count%'/);
  assert.match(historicalSql, /Retired team membership hotfix cannot overwrite last-active-owner guard/);
});
