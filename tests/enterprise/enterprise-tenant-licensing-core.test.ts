import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  contractAllowsNewSeats,
  getSeatAvailability,
  normalizeEnterpriseSeatType,
  type EnterpriseEntitlementContext,
} from '../../src/server/enterprise/licensing';
import {
  normalizePlatformAdminRole,
  platformRoleHasCapability,
} from '../../src/server/security/platform-admin';

const migration = fs.readFileSync(
  'supabase/migrations/20260721193000_enterprise_tenant_licensing_core.sql',
  'utf8',
);
const platformMigration = fs.readFileSync(
  'supabase/migrations/20260721193500_enterprise_platform_roles_and_contract_transitions.sql',
  'utf8',
);
const invitationMigration = fs.readFileSync(
  'supabase/migrations/20260721195000_transactional_enterprise_invitations.sql',
  'utf8',
);
const invitationAction = fs.readFileSync('src/server/actions/invitations.ts', 'utf8');
const licensingService = fs.readFileSync('src/server/enterprise/licensing.ts', 'utf8');

function context(overrides: Partial<EnterpriseEntitlementContext> = {}): EnterpriseEntitlementContext {
  return {
    organizationId: '00000000-0000-4000-8000-000000000001',
    contractId: '00000000-0000-4000-8000-000000000002',
    contractStatus: 'active',
    canAddMembers: true,
    limits: {
      members: 10,
      fullUsers: 4,
      participants: 5,
      viewers: 3,
      admins: 2,
    },
    usage: {
      activeMembers: 6,
      fullUsers: 3,
      participants: 2,
      viewers: 1,
      activeAdmins: 1,
    },
    features: {
      sso: true,
      scim: true,
      api: true,
      webhooks: true,
    },
    ...overrides,
  };
}

describe('enterprise tenant licensing core', () => {
  it('separates organization role from license seat type', () => {
    expect(migration).toContain("add column if not exists seat_type text not null default 'full'");
    expect(migration).toContain("check (seat_type in ('full', 'participant', 'viewer'))");
    expect(migration).toContain('p_role text');
    expect(migration).toContain('p_seat_type text');
  });

  it('creates contract, entitlement, usage and operation stores with forced RLS', () => {
    for (const table of [
      'public.enterprise_contracts',
      'public.organization_entitlements',
      'public.organization_usage',
      'public.enterprise_seat_operations',
    ]) {
      expect(migration).toContain(`create table if not exists ${table}`);
      expect(migration).toContain(`alter table ${table} force row level security`);
    }
  });

  it('consolidates global roles in the existing MFA-protected admin authority', () => {
    expect(platformMigration).toContain('drop table if exists public.platform_admins');
    expect(platformMigration).toContain('alter table public.platform_admin_users');
    expect(platformMigration).toContain("'platform_owner'");
    expect(platformMigration).toContain("'platform_billing'");
    expect(platformMigration).toContain("'platform_security'");
    expect(platformMigration).toContain("'platform_auditor'");
    expect(normalizePlatformAdminRole(' PLATFORM_SECURITY ')).toBe('platform_security');
    expect(platformRoleHasCapability('platform_billing', 'billing')).toBe(true);
    expect(platformRoleHasCapability('platform_billing', 'security')).toBe(false);
    expect(platformRoleHasCapability('platform_auditor', 'audit')).toBe(true);
    expect(platformRoleHasCapability('platform_auditor', 'contracts')).toBe(false);
  });

  it('serializes every seat consumer on the organization usage row', () => {
    expect(migration).toContain('create or replace function public.reserve_organization_seat_atomic');
    expect(migration).toContain('from public.organization_usage as usage');
    expect(migration).toContain('for update;');
    expect(migration).toContain('Recount under that lock so stale counters cannot authorize an extra seat');
    expect(migration.indexOf('for update;')).toBeLessThan(
      migration.indexOf('insert into public.organization_members ('),
    );
  });

  it('counts pending invitations before allocating any new seat', () => {
    expect(invitationMigration).toContain('create or replace function public.reserve_organization_seat_with_pending_atomic');
    expect(invitationMigration).toContain('create or replace function public.create_organization_invitation_with_seat_atomic');
    expect(invitationMigration).toContain('v_usage.active_members + v_pending_members >= v_member_limit');
    expect(invitationMigration).toContain('v_pending_seats >= v_seat_limit');
    expect(invitationMigration).toContain('v_usage.active_admins + v_pending_admins >= v_admin_limit');
    expect(invitationMigration).toContain('for update;');
  });

  it('fails closed for missing or inactive contracts and exhausted quotas', () => {
    for (const outcome of [
      'contract_missing',
      'contract_not_active',
      'entitlements_missing',
      'member_limit_reached',
      'seat_limit_reached',
      'admin_limit_reached',
    ]) {
      expect(`${migration}\n${invitationMigration}`).toContain(`'${outcome}'`);
      expect(invitationAction).toContain(`acceptance.outcome === '${outcome}'`);
    }
  });

  it('makes invite acceptance consume the pending-aware transactional reservation', () => {
    expect(invitationMigration).toContain('create or replace function public.accept_organization_invitation_atomic');
    expect(invitationMigration).toContain('from public.reserve_organization_seat_with_pending_atomic(');
    expect(invitationMigration).toContain("'invitation:' || v_invitation.id::text");
    expect(invitationMigration.indexOf('from public.reserve_organization_seat_with_pending_atomic(')).toBeLessThan(
      invitationMigration.indexOf('set accepted_at = now()'),
    );
  });

  it('keeps privileged licensing RPCs service-role only', () => {
    for (const signature of [
      'public.resolve_organization_entitlements(uuid)',
      'public.release_organization_seat_atomic(uuid, uuid, uuid, text, text)',
      'public.reconcile_organization_usage_atomic(uuid, uuid)',
    ]) {
      expect(migration).toContain(`revoke all on function ${signature} from public, anon, authenticated`);
      expect(migration).toContain(`grant execute on function ${signature} to service_role`);
    }

    expect(invitationMigration).toContain(
      'revoke all on function public.reserve_organization_seat_with_pending_atomic(uuid, uuid, text, text, uuid, text, text) from public, anon, authenticated',
    );
    expect(invitationMigration).toContain(
      'grant execute on function public.reserve_organization_seat_with_pending_atomic(uuid, uuid, text, text, uuid, text, text) to service_role',
    );
    expect(invitationMigration).toContain(
      'revoke all on function public.reserve_organization_seat_atomic(uuid, uuid, text, text, uuid, text, text) from service_role',
    );
  });

  it('enforces explicit contract transitions, expected state and operator roles', () => {
    expect(platformMigration).toContain('create or replace function public.is_valid_enterprise_contract_transition');
    expect(platformMigration).toContain('create or replace function public.transition_enterprise_contract_status_atomic');
    expect(platformMigration).toContain("when 'terminated' then false");
    expect(platformMigration).toContain("'invalid_transition'::text");
    expect(platformMigration).toContain("'state_changed'::text");
    expect(platformMigration).toContain("'platform_role_required'::text");
    expect(platformMigration).toContain('length(v_reason) < 5');
    expect(platformMigration).toContain('for update;');
  });

  it('uses a central pending-aware backend resolver instead of plan-name checks', () => {
    expect(licensingService).toContain("const RESOLVE_ENTITLEMENTS_RPC = 'resolve_organization_entitlements'");
    expect(licensingService).toContain("const RESERVE_SEAT_RPC = 'reserve_organization_seat_with_pending_atomic'");
    expect(licensingService).not.toContain("if (plan === 'enterprise')");
    expect(licensingService).toContain('throw new Error(LICENSING_UNAVAILABLE)');
  });

  it('normalizes seat types and calculates the strictest remaining capacity', () => {
    expect(normalizeEnterpriseSeatType(' FULL ')).toBe('full');
    expect(normalizeEnterpriseSeatType('participant')).toBe('participant');
    expect(normalizeEnterpriseSeatType('invalid')).toBeNull();

    expect(getSeatAvailability(context(), 'full')).toBe(1);
    expect(getSeatAvailability(context(), 'participant')).toBe(3);
    expect(getSeatAvailability(context(), 'viewer')).toBe(2);
    expect(getSeatAvailability(context({ canAddMembers: false }), 'full')).toBe(0);
  });

  it('allows new seats only for active contracts', () => {
    expect(contractAllowsNewSeats('active')).toBe(true);
    for (const status of [
      'draft',
      'pending_activation',
      'past_due',
      'grace_period',
      'read_only',
      'suspended',
      'expired',
      'terminated',
    ] as const) {
      expect(contractAllowsNewSeats(status)).toBe(false);
    }
  });
});
