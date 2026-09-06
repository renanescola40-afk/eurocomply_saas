begin;

-- Commercial plan isolation for organization-scoped Compliance Tasks.
--
-- The application catalog sells Tasks from Professional upward. Organization
-- task mutations already run through service-role server actions, but direct
-- authenticated SELECT remained membership-scoped. After a downgrade to
-- Essential, a browser Supabase client could therefore continue reading old
-- Professional task rows. Preserve those rows without exposing them below the
-- licensed tier, while leaving the separate personal-task compatibility scope
-- unchanged.

do $prerequisites$
begin
  if to_regclass('public.compliance_tasks') is null
     or to_regprocedure('app_private.resolve_commercial_plan(uuid)') is null then
    raise exception 'Professional task isolation prerequisites are missing';
  end if;
end
$prerequisites$;

create or replace function app_private.has_minimum_commercial_plan(
  target_organization_id uuid,
  minimum_plan text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with authority as (
    select app_private.resolve_commercial_plan(target_organization_id) as plan
  ), ranks as (
    select
      case (select plan from authority)
        when 'starter' then 1
        when 'professional' then 2
        when 'business' then 3
        when 'enterprise' then 4
        else 0
      end as current_rank,
      case lower(trim(coalesce(minimum_plan, '')))
        when 'starter' then 1
        when 'professional' then 2
        when 'business' then 3
        when 'enterprise' then 4
        else 2147483647
      end as minimum_rank
  )
  select current_rank >= minimum_rank and current_rank > 0
  from ranks;
$$;

revoke all on function app_private.has_minimum_commercial_plan(uuid,text) from public, anon;
grant execute on function app_private.has_minimum_commercial_plan(uuid,text) to authenticated, service_role;

comment on function app_private.has_minimum_commercial_plan(uuid,text) is
  'Boolean-only commercial rank authority for restrictive RLS; resolves the durable signed-contract/LIVE Stripe plan inside app_private.';

-- Existing permissive policies continue to decide membership/personal ownership.
-- PostgreSQL ANDs this RESTRICTIVE policy with those policies. Personal rows
-- (organization_id IS NULL) keep their existing user-bound visibility; tenant
-- rows require Professional or higher in addition to membership.
drop policy if exists "restrict_compliance_tasks_organization_professional_plan" on public.compliance_tasks;
create policy "restrict_compliance_tasks_organization_professional_plan"
  on public.compliance_tasks
  as restrictive
  for select
  to authenticated
  using (
    organization_id is null
    or app_private.has_minimum_commercial_plan(organization_id, 'professional')
  );

do $verify$
declare
  helper_oid oid := to_regprocedure('app_private.has_minimum_commercial_plan(uuid,text)');
begin
  if helper_oid is null then
    raise exception 'minimum commercial plan helper is missing';
  end if;

  if has_function_privilege('anon', helper_oid, 'EXECUTE')
     or not has_function_privilege('authenticated', helper_oid, 'EXECUTE')
     or not has_function_privilege('service_role', helper_oid, 'EXECUTE') then
    raise exception 'minimum commercial plan helper privileges are not canonical';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'compliance_tasks'
      and policyname = 'restrict_compliance_tasks_organization_professional_plan'
      and permissive = 'RESTRICTIVE'
      and roles = array['authenticated']::name[]
      and qual ilike '%has_minimum_commercial_plan%professional%'
  ) then
    raise exception 'Professional organization task restrictive SELECT policy is missing';
  end if;
end
$verify$;

notify pgrst, 'reload schema';
commit;
