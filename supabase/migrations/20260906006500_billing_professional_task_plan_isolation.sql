begin;

-- Commercial plan isolation for Professional-only organization resources.
--
-- Tasks, Risks and Vendors start at Professional in the application catalog.
-- Server-side mutation boundaries already enforce tenant RBAC/quota controls,
-- but authenticated SELECT policies remained membership-scoped. After a
-- downgrade to Essential/Starter, a browser Supabase client could therefore
-- continue reading previously-created Professional data. Preserve those rows
-- without exposing them below the licensed tier. Personal compliance_tasks
-- rows remain governed by their separate user-bound compatibility policies.

do $prerequisites$
begin
  if to_regclass('public.compliance_tasks') is null
     or to_regclass('public.risks') is null
     or to_regclass('public.vendors') is null
     or to_regclass('public.vendor_review_history') is null
     or to_regprocedure('app_private.resolve_commercial_plan(uuid)') is null then
    raise exception 'Professional commercial isolation prerequisites are missing';
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
        when 'essential' then 1
        when 'starter' then 1
        when 'basic' then 1
        when 'professional' then 2
        when 'pro' then 2
        when 'growth' then 2
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
  'Boolean-only commercial rank authority for restrictive RLS; resolves durable signed-contract/LIVE Stripe plan authority inside app_private.';

-- Reassert RLS/FORCE RLS on every protected Professional resource. service_role
-- keeps the reviewed backend mutation path; authenticated clients remain bound
-- by the permissive tenant policy AND these restrictive commercial policies.
alter table public.compliance_tasks enable row level security;
alter table public.compliance_tasks force row level security;
alter table public.risks enable row level security;
alter table public.risks force row level security;
alter table public.vendors enable row level security;
alter table public.vendors force row level security;
alter table public.vendor_review_history enable row level security;
alter table public.vendor_review_history force row level security;

-- Personal compliance_tasks rows (organization_id IS NULL) keep their existing
-- owner-bound visibility; organization task rows require Professional or higher.
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

-- Risks and Vendors have no personal scope. Membership alone must never expose
-- previously-created Professional rows after downgrade.
drop policy if exists "restrict_risks_professional_plan" on public.risks;
create policy "restrict_risks_professional_plan"
  on public.risks
  as restrictive
  for select
  to authenticated
  using (app_private.has_minimum_commercial_plan(organization_id, 'professional'));

drop policy if exists "restrict_vendors_professional_plan" on public.vendors;
create policy "restrict_vendors_professional_plan"
  on public.vendors
  as restrictive
  for select
  to authenticated
  using (app_private.has_minimum_commercial_plan(organization_id, 'professional'));

drop policy if exists "restrict_vendor_review_history_professional_plan" on public.vendor_review_history;
create policy "restrict_vendor_review_history_professional_plan"
  on public.vendor_review_history
  as restrictive
  for select
  to authenticated
  using (app_private.has_minimum_commercial_plan(organization_id, 'professional'));

do $verify$
declare
  helper_oid oid := to_regprocedure('app_private.has_minimum_commercial_plan(uuid,text)');
  required_policy text;
  target_table text;
begin
  if helper_oid is null then
    raise exception 'minimum commercial plan helper is missing';
  end if;

  if has_function_privilege('anon', helper_oid, 'EXECUTE')
     or not has_function_privilege('authenticated', helper_oid, 'EXECUTE')
     or not has_function_privilege('service_role', helper_oid, 'EXECUTE') then
    raise exception 'minimum commercial plan helper privileges are not canonical';
  end if;

  for target_table, required_policy in
    values
      ('compliance_tasks', 'restrict_compliance_tasks_organization_professional_plan'),
      ('risks', 'restrict_risks_professional_plan'),
      ('vendors', 'restrict_vendors_professional_plan'),
      ('vendor_review_history', 'restrict_vendor_review_history_professional_plan')
  loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
        and policyname = required_policy
        and permissive = 'RESTRICTIVE'
        and roles = array['authenticated']::name[]
        and qual ilike '%has_minimum_commercial_plan%professional%'
    ) then
      raise exception 'Professional restrictive SELECT policy missing for %.%', target_table, required_policy;
    end if;

    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = target_table
        and c.relrowsecurity
        and c.relforcerowsecurity
    ) then
      raise exception 'RLS/FORCE RLS missing for Professional resource %', target_table;
    end if;
  end loop;
end
$verify$;

notify pgrst, 'reload schema';
commit;
