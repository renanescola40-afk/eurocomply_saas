begin;

-- Forward-only reconciliation for the live RLS inventory helper.
--
-- Production migration history has already advanced beyond the older
-- 20260730204500 repair identity, so that historical file cannot participate in
-- a genuinely forward-only bounded promotion. Re-apply the intended idempotent
-- schema effect under a new execution identity that is later than the observed
-- production migration head. No migration-history repair is performed here.
--
-- The helper exposes schema-security metadata. It remains SECURITY INVOKER and
-- is callable only by service_role for controlled live-RLS validation.

create or replace function public.eurocomply_live_rls_inventory(table_names text[])
returns table (
  table_name text,
  "exists" boolean,
  rls_enabled boolean,
  force_rls boolean,
  policy_count integer
)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  with requested as (
    select unnest(table_names) as table_name
  ), live_tables as (
    select
      c.relname::text as table_name,
      c.oid,
      c.relrowsecurity,
      c.relforcerowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
  ), policy_counts as (
    select polrelid, count(*)::integer as policy_count
    from pg_policy
    group by polrelid
  )
  select
    requested.table_name,
    live_tables.oid is not null as "exists",
    coalesce(live_tables.relrowsecurity, false) as rls_enabled,
    coalesce(live_tables.relforcerowsecurity, false) as force_rls,
    coalesce(policy_counts.policy_count, 0) as policy_count
  from requested
  left join live_tables on live_tables.table_name = requested.table_name
  left join policy_counts on policy_counts.polrelid = live_tables.oid
  order by requested.table_name;
$$;

revoke all on function public.eurocomply_live_rls_inventory(text[]) from public;
revoke execute on function public.eurocomply_live_rls_inventory(text[]) from anon;
revoke execute on function public.eurocomply_live_rls_inventory(text[]) from authenticated;
grant execute on function public.eurocomply_live_rls_inventory(text[]) to service_role;

comment on function public.eurocomply_live_rls_inventory(text[]) is
  'Controlled service-role helper for exact-target live RLS validation. Not a public application RPC.';

do $verify$
declare
  function_oid oid := to_regprocedure('public.eurocomply_live_rls_inventory(text[])');
begin
  if function_oid is null then
    raise exception 'live RLS inventory helper is missing after reconciliation';
  end if;

  if exists (
    select 1
    from pg_proc p
    where p.oid = function_oid
      and p.prosecdef
  ) then
    raise exception 'live RLS inventory helper must remain SECURITY INVOKER';
  end if;

  if not exists (
    select 1
    from pg_proc p,
         unnest(coalesce(p.proconfig, array[]::text[])) as setting
    where p.oid = function_oid
      and setting = 'search_path=public, pg_catalog'
  ) then
    raise exception 'live RLS inventory helper search_path is not canonical';
  end if;

  if has_function_privilege('anon', function_oid, 'EXECUTE')
     or has_function_privilege('authenticated', function_oid, 'EXECUTE')
     or not has_function_privilege('service_role', function_oid, 'EXECUTE') then
    raise exception 'live RLS inventory helper privileges are not service-role-only';
  end if;
end
$verify$;

notify pgrst, 'reload schema';

commit;
