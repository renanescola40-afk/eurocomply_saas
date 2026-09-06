import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260906003500_billing_self_serve_member_capacity.sql', 'utf8');
const invites = readFileSync('src/server/queries/invites.ts', 'utf8');
const acceptance = readFileSync('src/server/actions/invitations.ts', 'utf8');
const entitlements = readFileSync('src/server/billing/entitlements.ts', 'utf8');

describe('paid self-serve member capacity', () => {
  it('uses the canonical included user limits for non-contract plans', () => {
    expect(migration).toContain("when 'starter' then 3");
    expect(migration).toContain("when 'professional' then 15");
    expect(migration).toContain("when 'business' then 75");
    expect(migration).toContain('app_private.resolve_commercial_plan');
    expect(entitlements).toContain('employeeInvites: unlimited || canonicalLimits.users > 1');
  });

  it('keeps Enterprise on the existing contractual seat authority', () => {
    expect(migration).toContain("if v_plan = 'enterprise' then");
    expect(migration).toContain('public.create_organization_invitation_with_seat_atomic(');
    expect(migration).toContain('public.accept_organization_invitation_atomic(p_token, p_user_id, p_email)');
  });

  it('serializes reservation and acceptance so concurrent invitations cannot oversubscribe users', () => {
    expect(migration.match(/pg_advisory_xact_lock\(hashtext\(/g)?.length).toBe(2);
    expect(migration).toContain('v_active_members + v_pending_members >= v_limit');
    expect(migration).toContain('and invitation.id <> v_invitation.id');
  });

  it('routes creation and acceptance through the commercial wrappers only', () => {
    expect(invites).toContain("const ATOMIC_INVITATION_CREATE_RPC = 'create_billing_organization_invitation_atomic'");
    expect(acceptance).toContain("const ATOMIC_INVITATION_ACCEPTANCE_RPC = 'accept_billing_organization_invitation_atomic'");
    expect(migration).toContain('revoke all on function public.create_billing_organization_invitation_atomic');
    expect(migration).toContain('revoke all on function public.accept_billing_organization_invitation_atomic');
  });
});
