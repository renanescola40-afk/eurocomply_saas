import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const invitationAuthority = readFileSync(
  'supabase/migrations/20260822123610_v19_reconcile_enterprise_invitation_seat_authority.sql',
  'utf8',
);
const onboardingRuntime = readFileSync(
  'supabase/migrations/20260822123616_v19_reconcile_active_onboarding_runtime.sql',
  'utf8',
);

describe('onboarding forward reconciliation partial-rollout safety', () => {
  it('denies missing or inactive invitation actors in the first seat-authority migration itself', () => {
    expect(invitationAuthority).toContain("v_actor_status is distinct from 'active'");
    expect(invitationAuthority).toContain("coalesce(v_actor_role, '') not in ('owner', 'admin')");
    expect(invitationAuthority).not.toContain("if v_actor_status <> 'active' or v_actor_role not in ('owner', 'admin')");
  });

  it('routes invitations through seat quota authority in the initial onboarding RPC', () => {
    expect(onboardingRuntime).toContain(
      "to_regprocedure('public.create_organization_invitation_with_seat_atomic(uuid,text,text,text,text,uuid,timestamptz)')",
    );
    expect(onboardingRuntime).toContain('public.create_organization_invitation_with_seat_atomic(');
    expect(onboardingRuntime).toContain("'viewer',\n      'viewer'");
    expect(onboardingRuntime).toContain("v_seat_invitation.outcome <> 'created'");
    expect(onboardingRuntime).toContain("raise exception 'onboarding_invitation_seat_authority_denied:%'");
    expect(onboardingRuntime).not.toContain('insert into public.invitations');
  });

  it('rejects inactive actors and revoked replay deliveries before final hardening exists', () => {
    expect(onboardingRuntime).toContain("v_actor_status is distinct from 'active'");
    expect(onboardingRuntime).toContain("coalesce(v_actor_role, '') not in ('owner', 'admin')");
    expect(onboardingRuntime).toContain('invitations.revoked_at is null');
  });
});
