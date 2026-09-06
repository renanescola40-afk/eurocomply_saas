import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const action = fs.readFileSync('src/server/actions/invitations.ts', 'utf8');
const enterpriseMigration = fs.readFileSync(
  'supabase/migrations/20260716164000_atomic_invitation_acceptance.sql',
  'utf8',
);
const billingMigration = fs.readFileSync(
  'supabase/migrations/20260906003500_billing_self_serve_member_capacity.sql',
  'utf8',
);

describe('atomic invitation acceptance', () => {
  it('delegates membership creation and invite consumption to one commercial RPC', () => {
    expect(action).toContain("const ATOMIC_INVITATION_ACCEPTANCE_RPC = 'accept_billing_organization_invitation_atomic'");
    expect(action).toContain('supabase.rpc(ATOMIC_INVITATION_ACCEPTANCE_RPC');
    expect(action).not.toContain(".from('organization_members')");
    expect(action).not.toContain(".from('invitations')");
  });

  it('preserves the proven Enterprise acceptance path', () => {
    expect(enterpriseMigration).toContain('for update;');
    expect(enterpriseMigration).toContain('insert into public.organization_members');
    expect(enterpriseMigration).toContain('on conflict (organization_id, user_id) do nothing');
    expect(enterpriseMigration).toContain('update public.invitations as invitation');
    expect(enterpriseMigration).toContain("raise exception 'invitation_state_changed'");
    expect(billingMigration).toContain('public.accept_organization_invitation_atomic(p_token, p_user_id, p_email)');
  });

  it('locks and consumes self-serve invitations in the same commercial transaction', () => {
    expect(billingMigration).toContain('pg_advisory_xact_lock(hashtext(v_organization_id::text))');
    expect(billingMigration).toContain('insert into public.organization_members');
    expect(billingMigration).toContain('update public.invitations as invitation');
    expect(billingMigration).toContain("raise exception 'invitation_state_changed'");
  });

  it('rejects replay, expiry, email mismatch and invalid roles before granting access', () => {
    for (const outcome of ['already_accepted', 'expired', 'email_mismatch']) {
      expect(billingMigration).toContain(`'${outcome}'::text`);
    }
    expect(billingMigration.indexOf("'email_mismatch'::text")).toBeLessThan(
      billingMigration.indexOf('insert into public.organization_members'),
    );
  });

  it('keeps both acceptance authorities service-role only', () => {
    expect(enterpriseMigration).toContain('security definer');
    expect(enterpriseMigration).toContain('set search_path = public');
    expect(enterpriseMigration).toContain('grant execute on function public.accept_organization_invitation_atomic(text, uuid, text) to service_role');
    expect(billingMigration).toContain('security definer');
    expect(billingMigration).toContain('revoke all on function public.accept_billing_organization_invitation_atomic');
    expect(billingMigration).toContain('grant execute on function public.accept_billing_organization_invitation_atomic(text, uuid, text) to service_role');
  });
});
