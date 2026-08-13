begin;

-- Close the remaining live tenant-table drift: tasks already has canonical
-- tenant-scoped policies but production metadata still reports FORCE RLS=false.
do $guard$
begin
  if to_regclass('public.tasks') is null then
    raise exception 'public.tasks must exist before tasks RLS reconciliation';
  end if;
end
$guard$;

alter table public.tasks enable row level security;
alter table public.tasks force row level security;

do $verify$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'tasks'
      and c.relrowsecurity
      and c.relforcerowsecurity
  ) then
    raise exception 'tasks RLS/FORCE RLS boundary is not materialized';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tasks'
      and policyname in ('rls_tasks_select_member', 'live_rls_tasks_select_member')
      and cmd = 'SELECT'
      and 'authenticated' = any(roles)
  ) then
    raise exception 'tasks tenant-scoped SELECT policy is missing';
  end if;
end
$verify$;

commit;
