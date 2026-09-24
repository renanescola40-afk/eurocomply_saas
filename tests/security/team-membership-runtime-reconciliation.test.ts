import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260922203500_reconcile_team_membership_runtime_rpcs.sql',
  'utf8',
);

describe('team membership runtime RPC reconciliation', () => {
  it('restores both backend-only membership mutation RPCs used by current runtime', () => {
    expect(migration).toContain('create or replace function public.change_organization_member_role_atomic');
    expect(migration).toContain('create or replace function public.remove_organization_member_atomic');
  });

  it('keeps last-owner and expected-state protections', () => {
    expect(migration).toContain("'last_owner'::text");
    expect(migration).toContain("'state_changed'::text");
    expect(migration).toContain('v_owner_count <= 1');
    expect(migration).toContain('p_expected_role');
    expect(migration).toContain('p_expected_user_id');
  });

  it('keeps both RPCs service-role only with a fixed search path', () => {
    expect(migration.match(/security definer/g)?.length).toBe(2);
    expect(migration.match(/set search_path = pg_catalog, public/g)?.length).toBe(2);
    expect(migration).toContain('revoke all on function public.change_organization_member_role_atomic(uuid, uuid, text, text)');
    expect(migration).toContain('grant execute on function public.change_organization_member_role_atomic(uuid, uuid, text, text)');
    expect(migration).toContain('revoke all on function public.remove_organization_member_atomic(uuid, uuid, uuid, text)');
    expect(migration).toContain('grant execute on function public.remove_organization_member_atomic(uuid, uuid, uuid, text)');
    expect(migration).toContain("notify pgrst, 'reload schema'");
  });

  it('does not broaden direct browser mutation authority', () => {
    expect(migration).not.toContain('to authenticated;');
    expect(migration).not.toContain('to anon;');
  });
});
