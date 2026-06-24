-- Live RLS validation inventory helper.
-- Required by scripts/security/run-supabase-live-tenant-isolation.mjs to prove
-- RLS is enabled in the target Supabase project before tenant-isolation tests.

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
