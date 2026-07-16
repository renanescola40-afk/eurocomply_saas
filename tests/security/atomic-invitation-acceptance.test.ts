import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const action = fs.readFileSync('src/server/actions/invitations.ts', 'utf8');
const migration = fs.readFileSync(
  'supabase/migrations/20260716164000_atomic_invitation_acceptance.sql',
  'utf8',
);

describe('atomic invitation acceptance', () => {
  it('delegates membership creation and invite consumption to one RPC', () => {
    expect(action).toContain("const ATOMIC_INVITATION_ACCEPTANCE_RPC = 'accept_organization_invitation_atomic'");
    expect(action).toContain('supabase.rpc(ATOMIC_INVITATION_ACCEPTANCE_RPC');
    expect(action).not.toContain(".from('organization_members')");
    expect(action).not.toContain(".from('invitations')");
  });

  it('locks and consumes the invitation in the same database transaction as membership creation', () => {
    expect(migration).toContain('for update;');
    expect(migration).toContain('insert into public.organization_members');
    expect(migration).toContain('on conflict (organization_id, user_id) do nothing');
    expect(migration).toContain('update public.invitations as invitation');
    expect(migration).toContain("raise exception 'invitation_state_changed'");
  });

  it('rejects replay, expiry, email mismatch and invalid roles before granting access', () => {
    for (const outcome of ['already_accepted', 'expired', 'email_mismatch', 'invalid_role']) {
      expect(migration).toContain(`'${outcome}'::text`);
    }
    expect(migration.indexOf("'email_mismatch'::text")).toBeLessThan(
      migration.indexOf('insert into public.organization_members'),
    );
  });

  it('is service-role only with a fixed search path', () => {
    expect(migration).toContain('security definer');
    expect(migration).toContain('set search_path = public');
    expect(migration).toContain('revoke all on function public.accept_organization_invitation_atomic(text, uuid, text) from authenticated');
    expect(migration).toContain('grant execute on function public.accept_organization_invitation_atomic(text, uuid, text) to service_role');
  });
});
