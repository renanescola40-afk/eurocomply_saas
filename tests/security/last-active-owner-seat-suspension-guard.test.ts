import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/20261018183000_guard_last_active_owner_seat_release.sql', 'utf8');
const api = readFileSync('src/app/api/team/members/seat/route.ts', 'utf8');
const adapter = readFileSync('src/server/enterprise/provisioning.ts', 'utf8');
const scim = readFileSync('src/server/enterprise/scim.ts', 'utf8');

describe('P0-E: suspend/deprovision ACTIVE owner guard (source only)', () => {
  it('locks all tenant member rows before owner count and any seat suspension', () => {
    const lock = sql.indexOf('order by member.id for update;');
    const count = sql.indexOf('select count(*)::integer into v_active_owner_count');
    const update = sql.indexOf('update public.organization_members set status=case');
    expect(lock).toBeGreaterThan(-1);
    expect(count).toBeGreaterThan(lock);
    expect(update).toBeGreaterThan(count);
    expect(sql).toContain("owner_member.status='active'");
    expect(sql).toContain("lower(coalesce(owner_member.role,''))='owner'");
    expect(sql).toContain('v_active_owner_count<=1');
  });

  it('denies suspending an owner unless the actor is an active same-tenant owner', () => {
    expect(sql).toContain("lower(coalesce(v_membership.role,''))='owner'");
    expect(sql).toContain('actor.organization_id=p_organization_id');
    expect(sql).toContain('actor.user_id=p_actor_user_id');
    expect(sql).toContain("actor.status='active'");
    expect(sql).toContain("lower(coalesce(actor.role,''))='owner'");
    expect(sql).toContain("'permission_denied'::text");
    expect(sql).toContain("'last_owner'::text");
    expect(sql).toContain('delete from public.enterprise_seat_operations where id=v_operation_id');
  });

  it('retains existing usage, idempotency and legacy audit behavior, and service-only execution', () => {
    expect(sql).toContain("pg_catalog.md5(v_def) <> 'e0ce571735e2f003c8bbc51f5edfa97d'");
    expect(sql).toContain('P0-E seat release implementation drift: manual review required');
    expect(sql).toContain('enterprise_seat_operations');
    expect(sql).toContain('organization_usage');
    expect(sql).toContain("'enterprise.seat_released'");
    expect(sql).toContain('revoke all on function public.release_organization_seat_atomic');
    expect(sql).toContain('from public, anon, authenticated');
    expect(sql).toContain('to service_role');
  });

  it('routes last-owner and denied-actor outcomes safely through API and SCIM', () => {
    expect(api).toContain("error: 'last_active_owner_suspension_blocked'");
    expect(api).toContain("error: 'owner_seat_change_requires_owner'");
    expect(api).toContain("permission: 'manage_team'");
    expect(api).toContain('requireStepUpForRequest({');
    expect(adapter).toContain("'last_owner'");
    expect(adapter).toContain("'permission_denied'");
    expect(scim).toContain("new ScimError('scim_last_active_owner_blocked', 409)");
    expect(scim).toContain("new ScimError('scim_owner_suspension_forbidden', 403)");
  });
});
