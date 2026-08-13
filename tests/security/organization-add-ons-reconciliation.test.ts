import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const migrationPath = 'supabase/migrations/20260813121500_reconcile_organization_add_ons.sql';
const sql = fs.readFileSync(path.join(root, migrationPath), 'utf8');

describe('organization add-ons canonical reconciliation', () => {
  it('creates a tenant-scoped add-on catalog with RLS forced on', () => {
    expect(sql).toContain('create table if not exists public.organization_add_ons');
    expect(sql).toContain('organization_id uuid not null references public.organizations(id) on delete cascade');
    expect(sql).toContain('alter table public.organization_add_ons enable row level security');
    expect(sql).toContain('alter table public.organization_add_ons force row level security');
    expect(sql).toContain('to authenticated');
    expect(sql).toContain('members.organization_id = organization_add_ons.organization_id');
    expect(sql).toContain('members.user_id = auth.uid()');
  });

  it('keeps provider-owned billing mutations out of browser roles', () => {
    expect(sql).toContain('revoke all on table public.organization_add_ons from anon');
    expect(sql).toContain('revoke insert, update, delete, truncate, references, trigger');
    expect(sql).toContain('on table public.organization_add_ons from authenticated');
    expect(sql).toContain('grant select on table public.organization_add_ons to authenticated');
    expect(sql).toContain('grant all on table public.organization_add_ons to service_role');
  });

  it('pins the trigger search path and removes browser execution', () => {
    expect(sql).toContain('create or replace function public.touch_organization_add_on_updated_at()');
    expect(sql).toContain('set search_path = pg_catalog');
    expect(sql).toContain('revoke all on function public.touch_organization_add_on_updated_at() from public');
    expect(sql).toContain('revoke all on function public.touch_organization_add_on_updated_at() from anon');
    expect(sql).toContain('revoke all on function public.touch_organization_add_on_updated_at() from authenticated');
    expect(sql).toContain('grant execute on function public.touch_organization_add_on_updated_at() to service_role');
    expect(sql).toContain('drop trigger if exists organization_add_ons_set_updated_at');
  });

  it('uses deterministic drop-and-create policy and trigger reconciliation', () => {
    expect(sql).toContain('drop policy if exists "organization members can read add-ons"');
    expect(sql).toContain('create policy "organization members can read add-ons"');
    expect(sql).not.toContain('create policy if not exists');
    expect(sql).not.toContain('create trigger if not exists');
  });
});
