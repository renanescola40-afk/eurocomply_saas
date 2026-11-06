import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const source = readFileSync(
  fileURLToPath(new URL('../../supabase/reconciliation/20261106_p0e_seat_release_actor_authority_candidate.sql', import.meta.url)),
  'utf8',
);

test('candidate is never silently promoted as an unapplied historical migration', () => {
  assert.match(source, /forward SQL CANDIDATE, NOT AUTOMATIC MIGRATION OR RELEASE/);
  assert.match(source, /P0E_SOURCE_FINGERPRINT_DRIFT_REVIEW_REQUIRED/);
  assert.match(source, /d4714bb9382ae0322376ed433e859162/);
  assert.match(source, /P0E_RPC_PRIVILEGE_DRIFT_REVIEW_REQUIRED/);
});

test('every seat release checks a current, active, same-tenant owner or admin before reading target', () => {
  const targetLookup = source.indexOf('select member.* into v_membership');
  const roleLookup = source.indexOf('select actor.role into v_actor_role');
  assert.ok(targetLookup > roleLookup && roleLookup >= 0);
  const guard = source.slice(roleLookup, targetLookup);
  assert.match(guard, /actor.organization_id=p_organization_id/);
  assert.match(guard, /actor.user_id=p_actor_user_id/);
  assert.match(guard, /actor.status='active'/);
  assert.match(guard, /in \('owner','admin'\)/);
  assert.match(guard, /delete from public.enterprise_seat_operations where id=v_operation_id/);
  assert.match(guard, /'permission_denied'/);
});

test('owner-only guard, last-owner count, lock order, auditing, and counters remain', () => {
  assert.match(source, /if lower\(coalesce\(v_membership.role,''\)\)='owner' then/);
  assert.match(source, /v_active_owner_count<=1/);
  assert.ok(source.indexOf('from public.organization_usage as usage') <
    source.indexOf('order by member.id for update'));
  assert.match(source, /update public.organization_usage set active_members=/);
  assert.match(source, /insert into public.audit_logs/);
  assert.match(source, /return query select 'released'/);
});

test('service-only RPC grants and restricted security definer remain', () => {
  assert.match(source, /SECURITY DEFINER/i);
  assert.match(source, /SET search_path TO 'pg_catalog'/i);
  assert.match(source, /revoke execute on function public.release_organization_seat_atomic\(uuid,uuid,uuid,text,text\) from public,anon,authenticated/);
  assert.match(source, /grant execute on function public.release_organization_seat_atomic\(uuid,uuid,uuid,text,text\) to service_role/);
  assert.doesNotMatch(source, /ALTER ROLE|DISABLE ROW LEVEL SECURITY|DISABLE TRIGGER|http_post|sendEmail|service_role_key/i);
});
