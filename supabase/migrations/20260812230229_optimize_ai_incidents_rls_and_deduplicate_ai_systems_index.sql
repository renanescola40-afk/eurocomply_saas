begin;

-- Historical clean-replay compatibility: creator migrations for these evolved
-- tables are not guaranteed to be represented in the production ledger. Harden
-- every object that exists; preserve fail-closed policy/grant verification for it.
do $ai_runtime_hardening_apply$
begin
  if to_regclass('public.ai_incidents') is not null then
    execute 'alter table public.ai_incidents enable row level security';
    execute 'alter table public.ai_incidents force row level security';

    execute 'drop policy if exists "Organization members can insert ai incidents" on public.ai_incidents';
    execute 'drop policy if exists "Organization members can read ai incidents" on public.ai_incidents';
    execute 'drop policy if exists "Organization members can update ai incidents" on public.ai_incidents';
    execute 'drop policy if exists rls_ai_incidents_insert_member on public.ai_incidents';
    execute 'drop policy if exists rls_ai_incidents_select_member on public.ai_incidents';
    execute 'drop policy if exists rls_ai_incidents_update_member on public.ai_incidents';

    execute $policy$
      create policy rls_ai_incidents_select_member
        on public.ai_incidents
        for select
        to authenticated
        using (app_private.is_org_member(organization_id))
    $policy$;

    execute $policy$
      create policy rls_ai_incidents_insert_member
        on public.ai_incidents
        for insert
        to authenticated
        with check (app_private.is_org_member(organization_id))
    $policy$;

    execute $policy$
      create policy rls_ai_incidents_update_member
        on public.ai_incidents
        for update
        to authenticated
        using (app_private.is_org_member(organization_id))
        with check (app_private.is_org_member(organization_id))
    $policy$;

    execute 'revoke all on table public.ai_incidents from PUBLIC, anon, authenticated';
    execute 'grant select, insert, update on table public.ai_incidents to authenticated';
  end if;

  if to_regclass('public.regulatory_updates') is not null then
    execute 'drop policy if exists rls_regulatory_updates_select_authenticated on public.regulatory_updates';
    execute $policy$
      create policy rls_regulatory_updates_select_authenticated
        on public.regulatory_updates
        for select
        to authenticated
        using ((select auth.uid()) is not null)
    $policy$;
  end if;

  -- DROP INDEX IF EXISTS is replay-safe even when the parent table is absent.
  drop index if exists public.ai_systems_org_created_idx;
end
$ai_runtime_hardening_apply$;

do $ai_runtime_hardening_guard$
declare
  unexpected_grants integer;
  duplicate_indexes integer;
begin
  if to_regclass('public.ai_incidents') is not null then
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
  end if;

  if to_regclass('public.regulatory_updates') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname='public' and tablename='regulatory_updates'
         and policyname='rls_regulatory_updates_select_authenticated'
         and cmd='SELECT'
         and roles = array['authenticated']::name[]
     ) then
    raise exception 'canonical regulatory_updates SELECT policy missing';
  end if;

  if to_regclass('public.ai_systems') is not null then
    select count(*) into duplicate_indexes
    from pg_indexes
    where schemaname='public' and tablename='ai_systems'
      and indexname in ('ai_systems_org_created_at_idx','ai_systems_org_created_idx');
    if duplicate_indexes <> 1 then
      raise exception 'ai_systems created-at duplicate index reconciliation failed: %', duplicate_indexes;
    end if;
  end if;
end
$ai_runtime_hardening_guard$;

commit;
