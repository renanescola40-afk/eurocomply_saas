begin;

-- Commercial plan isolation for Professional-only organization resources.
--
-- Tasks, Risks and Vendors start at Professional in the application catalog.
-- Server-side boundaries enforce tenant RBAC/quota controls, but authenticated
-- database policies also need to fail closed after downgrade. Preserve existing
-- rows without exposing or mutating them below the licensed tier. Personal
-- compliance_tasks rows remain governed by their separate user-bound policies.
--
-- The immediately preceding paid-governance bridge materializes historical QMS
-- and Enterprise helpers that are absent from the curated Production schema.
-- Reassert the canonical active-membership authority here before any Business/
-- Enterprise data-plane policy can consume those helpers. Suspended or
-- deprovisioned organization_members rows must never regain tenant authority.
do $prerequisites$
begin
  if to_regclass('public.compliance_tasks') is null
     or to_regclass('public.risks') is null
     or to_regclass('public.vendors') is null
     or to_regclass('public.vendor_review_history') is null
     or to_regclass('public.organization_members') is null
     or to_regprocedure('app_private.resolve_commercial_plan(uuid)') is null
     or to_regprocedure('public.enterprise_member_can_read(uuid)') is null
     or to_regprocedure('public.enterprise_member_can_manage(uuid)') is null
     or to_regprocedure('public.ai_qms_actor_is_member(uuid,uuid)') is null then
    raise exception 'Professional commercial isolation prerequisites are missing';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organization_members'
      and column_name = 'status'
      and is_nullable = 'NO'
  ) then
    raise exception 'organization_members.status is missing or nullable';
  end if;
end
$prerequisites$;

-- Preserve the active-membership tenant authority established by the canonical
-- August hardening. These helpers are only being materialized now because the
-- paid governance tables were missing from the curated Production history.
create or replace function public.enterprise_member_can_read(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select p_organization_id is not null
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id = p_organization_id
        and lower(coalesce(om.status, '')) = 'active'
        and om.user_id = auth.uid()
    );
$$;

create or replace function public.enterprise_member_can_manage(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select p_organization_id is not null
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id = p_organization_id
        and lower(coalesce(om.status, '')) = 'active'
        and om.user_id = auth.uid()
        and lower(coalesce(om.role, 'viewer')) in ('owner', 'admin', 'editor', 'compliance_manager')
    );
$$;

create or replace function public.ai_qms_actor_is_member(
  target_organization_id uuid,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select target_user_id is null
    or (
      target_organization_id is not null
      and exists (
        select 1
        from public.organization_members member
        where member.organization_id = target_organization_id
          and lower(coalesce(member.status, '')) = 'active'
          and member.user_id = target_user_id
      )
    );
$$;

revoke all on function public.enterprise_member_can_read(uuid) from public, anon;
revoke all on function public.enterprise_member_can_manage(uuid) from public, anon;
revoke all on function public.ai_qms_actor_is_member(uuid,uuid) from public, anon, authenticated;
grant execute on function public.enterprise_member_can_read(uuid) to authenticated, service_role;
grant execute on function public.enterprise_member_can_manage(uuid) to authenticated, service_role;
grant execute on function public.ai_qms_actor_is_member(uuid,uuid) to service_role;

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

-- Risks have direct authenticated CRUD grants in the reviewed Production ACL.
-- A SELECT-only plan policy would therefore still allow a downgraded writer to
-- INSERT/UPDATE/DELETE via PostgREST. Restrict ALL commands and enforce the same
-- Professional-or-higher predicate in USING and WITH CHECK.
drop policy if exists "restrict_risks_professional_plan" on public.risks;
create policy "restrict_risks_professional_plan"
  on public.risks
  as restrictive
  for all
  to authenticated
  using (app_private.has_minimum_commercial_plan(organization_id, 'professional'))
  with check (app_private.has_minimum_commercial_plan(organization_id, 'professional'));

-- Vendors currently expose authenticated SELECT only, but the read gate remains
-- explicit and fail-closed below Professional. Backend/service_role writes are
-- unaffected by this authenticated policy.
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
  enterprise_read_oid oid := to_regprocedure('public.enterprise_member_can_read(uuid)');
  enterprise_manage_oid oid := to_regprocedure('public.enterprise_member_can_manage(uuid)');
  qms_member_oid oid := to_regprocedure('public.ai_qms_actor_is_member(uuid,uuid)');
  enterprise_read_definition text;
  enterprise_manage_definition text;
  qms_member_definition text;
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

  if enterprise_read_oid is null or enterprise_manage_oid is null or qms_member_oid is null then
    raise exception 'paid governance membership helpers are missing';
  end if;

  select pg_get_functiondef(enterprise_read_oid) into enterprise_read_definition;
  select pg_get_functiondef(enterprise_manage_oid) into enterprise_manage_definition;
  select pg_get_functiondef(qms_member_oid) into qms_member_definition;

  if coalesce(enterprise_read_definition, '') not ilike '%status%active%'
     or coalesce(enterprise_manage_definition, '') not ilike '%status%active%'
     or coalesce(qms_member_definition, '') not ilike '%status%active%' then
    raise exception 'Paid governance membership helper is not active-membership aware';
  end if;

  if has_function_privilege('anon', enterprise_read_oid, 'EXECUTE')
     or has_function_privilege('anon', enterprise_manage_oid, 'EXECUTE')
     or not has_function_privilege('authenticated', enterprise_read_oid, 'EXECUTE')
     or not has_function_privilege('authenticated', enterprise_manage_oid, 'EXECUTE')
     or not has_function_privilege('service_role', enterprise_read_oid, 'EXECUTE')
     or not has_function_privilege('service_role', enterprise_manage_oid, 'EXECUTE')
     or has_function_privilege('anon', qms_member_oid, 'EXECUTE')
     or has_function_privilege('authenticated', qms_member_oid, 'EXECUTE')
     or not has_function_privilege('service_role', qms_member_oid, 'EXECUTE') then
    raise exception 'Paid governance membership helper privileges are not canonical';
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
      raise exception 'Professional restrictive plan policy missing for %.%', target_table, required_policy;
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

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'risks'
      and policyname = 'restrict_risks_professional_plan'
      and cmd = 'ALL'
      and permissive = 'RESTRICTIVE'
      and roles = array['authenticated']::name[]
      and qual ilike '%has_minimum_commercial_plan%professional%'
      and with_check ilike '%has_minimum_commercial_plan%professional%'
  ) then
    raise exception 'Risks Professional policy must restrict authenticated reads and mutations';
  end if;
end
$verify$;

notify pgrst, 'reload schema';
commit;
