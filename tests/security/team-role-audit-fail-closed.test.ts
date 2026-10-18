import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync('src/app/api/team/members/role/route.ts', 'utf8');
const adapter = readFileSync('src/server/queries/audit-events.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20261018160000_atomic_member_role_change_with_chained_audit.sql', 'utf8');

describe('team role change audited atomic source contract', () => {
  it('requires a successful audited transaction before responding changed=true', () => {
    expect(route).toContain('changeMemberRoleWithChainedAuditAtomic({');
    expect(route).toContain('if (transitionError || !transition)');
    expect(route).toContain("error: 'team_role_change_audit_unavailable'");
    expect(route).toContain("transition.outcome !== 'changed'");
    expect(route.indexOf('if (transitionError || !transition)')).toBeLessThan(route.indexOf('changed: true'));
    expect(route.indexOf("transition.outcome !== 'changed'")).toBeLessThan(route.indexOf('changed: true'));
  });

  it('never performs a split mutation, separate audit, or compensating rollback in the API', () => {
    expect(route).not.toContain('createAuditEvent(');
    expect(route).not.toContain('ATOMIC_ROLE_TRANSITION_RPC');
    expect(route).not.toContain('rollbackData');
    expect(adapter).toContain("admin.rpc('change_organization_member_role_audited_atomic'");
    expect(adapter).toContain("error: 'audit_signing_unavailable'");
    expect(adapter).toContain("error: 'atomic_audit_or_member_role_change_failed'");
    expect(migration).toContain('public.change_organization_member_role_atomic(');
    expect(migration).toContain('perform public.append_audit_event_chained(');
    expect(migration).toContain('insert into public.audit_logs');
  });

  it('preserves actor authority, expected target identity, last-owner and service-only ACL', () => {
    expect(route).toContain("permission: 'manage_team'");
    expect(route).toContain('requireTrustedMutation(request');
    expect(route).toContain('requireStepUpForRequest({');
    expect(route).toContain(".eq('organization_id', organization.id)");
    expect(route).toContain("transition.outcome === 'last_owner'");
    expect(route).toContain('limit: RATE_LIMIT_MAX_ATTEMPTS');
    expect(migration).toContain("m.status = 'active'");
    expect(migration).toContain("v_target_user_id is distinct from p_expected_user_id");
    expect(migration).toContain("lower(v_actor_role) <> 'owner'");
    expect(migration).toContain('set search_path = pg_catalog');
    expect(migration).toContain('from public, anon, authenticated');
    expect(migration).toContain('to service_role');
  });
});
