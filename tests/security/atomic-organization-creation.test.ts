import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const action = fs.readFileSync('src/server/actions/organizations.ts', 'utf8');
const migration = fs.readFileSync(
  'supabase/migrations/20260716180000_atomic_organization_creation.sql',
  'utf8',
);

describe('atomic organization creation', () => {
  it('delegates tenant and initial owner creation to one RPC', () => {
    expect(action).toContain("const ATOMIC_ORGANIZATION_CREATION_RPC = 'create_organization_with_owner_atomic'");
    expect(action).toContain('supabase.rpc(ATOMIC_ORGANIZATION_CREATION_RPC');
    expect(action).not.toContain(".from('organizations')");
    expect(action).not.toContain(".from('organization_members')");
  });

  it('persists the organization before its owner inside one database function', () => {
    const organizationInsert = migration.indexOf('insert into public.organizations');
    const ownerInsert = migration.indexOf('insert into public.organization_members');

    expect(organizationInsert).toBeGreaterThan(-1);
    expect(ownerInsert).toBeGreaterThan(organizationInsert);
    expect(migration).toContain("values (v_organization.id, p_user_id, 'owner')");
    expect(migration).toContain("'created'::text");
  });

  it('duplicates application input constraints at the privileged database boundary', () => {
    expect(migration).toContain('char_length(v_name) < 2');
    expect(migration).toContain('char_length(v_name) > 120');
    expect(migration).toContain('char_length(v_slug) < 3');
    expect(migration).toContain('char_length(v_slug) > 80');
    expect(migration).toContain("v_slug !~ '^[a-z0-9-]+$'");
    expect(migration).toContain("'invalid_input'::text");
  });

  it('is service-role only with a fixed search path', () => {
    expect(migration).toContain('security definer');
    expect(migration).toContain('set search_path = public');
    expect(migration).toContain(
      'revoke all on function public.create_organization_with_owner_atomic(text, text, uuid) from authenticated',
    );
    expect(migration).toContain(
      'grant execute on function public.create_organization_with_owner_atomic(text, text, uuid) to service_role',
    );
  });
});
