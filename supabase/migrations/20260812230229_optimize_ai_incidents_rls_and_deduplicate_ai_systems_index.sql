begin;

alter table public.ai_incidents enable row level security;
alter table public.ai_incidents force row level security;

-- Replace legacy public/auth.uid()-per-row policies with the canonical membership helper.
drop policy if exists "Organization members can insert ai incidents" on public.ai_incidents;
drop policy if exists "Organization members can read ai incidents" on public.ai_incidents;
drop policy if exists "Organization members can update ai incidents" on public.ai_incidents;
drop policy if exists rls_ai_incidents_insert_member on public.ai_incidents;
drop policy if exists rls_ai_incidents_select_member on public.ai_incidents;
drop policy if exists rls_ai_incidents_update_member on public.ai_incidents;

create policy rls_ai_incidents_select_member
  on public.ai_incidents
  for select
  to authenticated
  using (app_private.is_org_member(organization_id));

create policy rls_ai_incidents_insert_member
  on public.ai_incidents
  for insert
  to authenticated
  with check (app_private.is_org_member(organization_id));

create policy rls_ai_incidents_update_member
  on public.ai_incidents
  for update
  to authenticated
  using (app_private.is_org_member(organization_id))
  with check (app_private.is_org_member(organization_id));

revoke all on table public.ai_incidents from PUBLIC, anon, authenticated;
grant select, insert, update on table public.ai_incidents to authenticated;

-- Evaluate auth.uid() once per statement for the global authenticated reference feed.
drop policy if exists rls_regulatory_updates_select_authenticated on public.regulatory_updates;
create policy rls_regulatory_updates_select_authenticated
  on public.regulatory_updates
  for select
  to authenticated
  using ((select auth.uid()) is not null);

-- Both indexes cover (organization_id, created_at DESC). Keep the descriptive canonical name.
drop index if exists public.ai_systems_org_created_idx;

do $$
declare
  unexpected_grants integer;
  duplicate_indexes integer;
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='ai_incidents'
      and policyname='rls_ai_incidents_select_member' and cmd='SELECT'
      and roles = array['authenticated']::name[]
  ) then
    raise exception 'canonical ai_incidents SELECT policy missing';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='ai_incidents'
      and policyname='rls_ai_incidents_insert_member' and cmd='INSERT'
      and roles = array['authenticated']::name[]
  ) then
    raise exception 'canonical ai_incidents INSERT policy missing';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='ai_incidents'
      and policyname='rls_ai_incidents_update_member' and cmd='UPDATE'
      and roles = array['authenticated']::name[]
  ) then
    raise exception 'canonical ai_incidents UPDATE policy missing';
  end if;

  select count(*) into unexpected_grants
  from information_schema.table_privileges
  where table_schema='public' and table_name='ai_incidents'
    and grantee in ('PUBLIC','anon','authenticated')
    and not (grantee='authenticated' and privilege_type in ('SELECT','INSERT','UPDATE'));
  if unexpected_grants <> 0 then
    raise exception 'unexpected ai_incidents client grants survived: %', unexpected_grants;
  end if;

  select count(*) into duplicate_indexes
  from pg_indexes
  where schemaname='public' and tablename='ai_systems'
    and indexname in ('ai_systems_org_created_at_idx','ai_systems_org_created_idx');
  if duplicate_indexes <> 1 then
    raise exception 'ai_systems created-at duplicate index reconciliation failed: %', duplicate_indexes;
  end if;
end $$;

commit;
