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
const invitationLockMigration = fs.readFileSync(
  'supabase/migrations/20260721200500_invitation_lock_order_hardening.sql',
  'utf8',
);
const idempotencyMigration = fs.readFileSync(
  'supabase/migrations/20260721201000_seat_idempotency_hardening.sql',
  'utf8',
);
const billingMemberMigration = fs.readFileSync(
  'supabase/migrations/20260906003500_billing_self_serve_member_capacity.sql',
  'utf8',
);
const invitationAction = fs.readFileSync('src/server/actions/invitations.ts', 'utf8');
const licensingService = fs.readFileSync('src/server/enterprise/licensing.ts', 'utf8');

function context(overrides: Partial<EnterpriseEntitlementContext> = {}): EnterpriseEntitlementContext {
  return {
    organizationId: '00000000-0000-4000-8000-000000000001',
    contractId: '00000000-0000-4000-8000-000000000002',
    contractStatus: 'active',
    contractVersion: 1,
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
    pending: {
      invitations: 0,
      fullUsers: 0,
      participants: 0,
      viewers: 0,
      admins: 0,
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
  });

  it('normalizes seat types and calculates remaining capacity', () => {
    expect(normalizeEnterpriseSeatType('viewer')).toBe('viewer');
    expect(normalizeEnterpriseSeatType('unknown')).toBeNull();
    expect(getSeatAvailability(context(), 'full')).toBe(1);
  });

  it('blocks new seats when the contract state is not active', () => {
    expect(contractAllowsNewSeats(context().contractStatus)).toBe(true);
    expect(contractAllowsNewSeats('suspended')).toBe(false);
  });

  it('keeps invitation and idempotency hardening contracts present behind the commercial wrapper', () => {
    expect(invitationMigration).toContain('create_organization_invitation_with_seat_atomic');
    expect(invitationLockMigration).toContain('from public.organization_usage as usage');
    expect(invitationLockMigration).toContain('for update;');
    expect(idempotencyMigration).toContain('enterprise_seat_operations');
    expect(invitationAction).toContain("const ATOMIC_INVITATION_ACCEPTANCE_RPC = 'accept_billing_organization_invitation_atomic'");
    expect(billingMemberMigration).toContain("if v_plan = 'enterprise' then");
    expect(billingMemberMigration).toContain('public.accept_organization_invitation_atomic(p_token, p_user_id, p_email)');
    expect(licensingService).toContain('resolve_organization_entitlements_v2');
  });

  it('normalizes platform roles and capabilities', () => {
    expect(normalizePlatformAdminRole('platform_owner')).toBe('platform_owner');
    expect(platformRoleHasCapability('platform_owner', 'contracts')).toBe(true);
    expect(platformRoleHasCapability('platform_support', 'billing')).toBe(false);
  });
});
