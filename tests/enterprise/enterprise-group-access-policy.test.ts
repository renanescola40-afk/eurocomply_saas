import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260723223000_enterprise_group_access_policies.sql',
  'utf8',
);

describe('enterprise group access policies', () => {
  it('stores group-to-role, seat and department mapping behind forced RLS', () => {
    expect(migration).toContain('create table if not exists public.enterprise_scim_group_access_policies');
    expect(migration).toContain("role text not null check (role in ('admin', 'editor', 'viewer'))");
    expect(migration).toContain("seat_type text not null check (seat_type in ('full', 'participant', 'viewer'))");
    expect(migration).toContain('department_key text');
    expect(migration).toContain('force row level security');
    expect(migration).toContain('revoke all on public.enterprise_scim_group_access_policies from public, anon, authenticated');
  });

  it('enforces a composite tenant boundary between policies and groups', () => {
    expect(migration).toContain('unique (organization_id, id)');
    expect(migration).toContain('foreign key (organization_id, group_id)');
    expect(migration).toContain('references public.enterprise_scim_groups(organization_id, id)');
    expect(migration).toContain('where g.organization_id = p_organization_id');
    expect(migration).toContain('and g.id = p_group_id');
  });

  it('uses optimistic concurrency for administrative mapping changes', () => {
    expect(migration).toContain('p_expected_version integer');
    expect(migration).toContain("return query select 'version_conflict'::text");
    expect(migration).toContain('for update');
    expect(migration).toContain('version = p.version + 1');
  });

  it('resolves mappings deterministically and fails closed on equal-priority conflicts', () => {
    expect(migration).toContain('create or replace function public.resolve_enterprise_scim_group_access');
    expect(migration).toContain('order by p.priority asc, p.group_id asc');
    expect(migration).toContain("return query select 'mapping_conflict'::text");
    expect(migration).toContain("return query select 'no_mapping'::text");
    expect(migration).toContain("'resolved'::text");
  });

  it('does not expose mapping mutation or resolution to authenticated clients', () => {
    expect(migration).toContain('revoke all on function public.set_enterprise_scim_group_access_policy_atomic');
    expect(migration).toContain('revoke all on function public.resolve_enterprise_scim_group_access');
    expect(migration).toContain('grant execute on function public.set_enterprise_scim_group_access_policy_atomic');
    expect(migration).toContain('to service_role');
  });
});
