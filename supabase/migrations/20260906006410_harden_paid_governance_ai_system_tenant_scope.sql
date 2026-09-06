begin;

-- Same-root-cause companion to the paid-governance runtime foundation bridge.
-- The bridge materializes Enterprise governance tables that were absent from
-- Production. Their AI-system references must be bound to the same organization
-- before any higher-tier authenticated policy or privileged writer can consume
-- them. This forward-only migration does not repair or rewrite migration history.

do $preflight$
begin
  if to_regclass('public.ai_systems') is null
     or to_regclass('public.enterprise_vendor_due_diligence') is null
     or to_regclass('public.enterprise_risk_reviews') is null then
    raise exception 'Paid-governance AI-system tenant-scope prerequisites are missing';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_systems'
      and column_name = 'organization_id'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'enterprise_vendor_due_diligence'
      and column_name in ('organization_id', 'ai_system_id')
    group by table_schema, table_name
    having count(distinct column_name) = 2
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'enterprise_risk_reviews'
      and column_name in ('organization_id', 'ai_system_id')
    group by table_schema, table_name
    having count(distinct column_name) = 2
  ) then
    raise exception 'Paid-governance tenant-scope columns are missing';
  end if;
end
$preflight$;

create or replace function public.enforce_enterprise_ai_system_tenant_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ai_system_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.ai_systems scoped_system
    where scoped_system.id = new.ai_system_id
      and scoped_system.organization_id = new.organization_id
  ) then
    raise exception 'enterprise_ai_system_not_in_organization'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_enterprise_ai_system_tenant_scope()
  from public, anon, authenticated;

drop trigger if exists enforce_enterprise_vendor_diligence_ai_system_scope
  on public.enterprise_vendor_due_diligence;
create trigger enforce_enterprise_vendor_diligence_ai_system_scope
before insert or update of organization_id, ai_system_id
on public.enterprise_vendor_due_diligence
for each row
execute function public.enforce_enterprise_ai_system_tenant_scope();

drop trigger if exists enforce_enterprise_risk_review_ai_system_scope
  on public.enterprise_risk_reviews;
create trigger enforce_enterprise_risk_review_ai_system_scope
before insert or update of organization_id, ai_system_id
on public.enterprise_risk_reviews
for each row
execute function public.enforce_enterprise_ai_system_tenant_scope();

do $verify$
declare
  tenant_scope_oid oid := to_regprocedure('public.enforce_enterprise_ai_system_tenant_scope()');
  cross_tenant_rows bigint;
begin
  if tenant_scope_oid is null then
    raise exception 'Enterprise AI-system tenant-scope trigger function is missing';
  end if;

  if has_function_privilege('public', tenant_scope_oid, 'EXECUTE')
     or has_function_privilege('anon', tenant_scope_oid, 'EXECUTE')
     or has_function_privilege('authenticated', tenant_scope_oid, 'EXECUTE') then
    raise exception 'Enterprise AI-system tenant-scope trigger function became directly executable';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.enterprise_vendor_due_diligence'::regclass
      and tgname = 'enforce_enterprise_vendor_diligence_ai_system_scope'
      and not tgisinternal
  ) or not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.enterprise_risk_reviews'::regclass
      and tgname = 'enforce_enterprise_risk_review_ai_system_scope'
      and not tgisinternal
  ) then
    raise exception 'Enterprise AI-system same-organization triggers are missing';
  end if;

  select count(*) into cross_tenant_rows
  from (
    select diligence.id
    from public.enterprise_vendor_due_diligence diligence
    join public.ai_systems system on system.id = diligence.ai_system_id
    where diligence.ai_system_id is not null
      and system.organization_id is distinct from diligence.organization_id
    union all
    select review.id
    from public.enterprise_risk_reviews review
    join public.ai_systems system on system.id = review.ai_system_id
    where review.ai_system_id is not null
      and system.organization_id is distinct from review.organization_id
  ) inconsistent;

  if cross_tenant_rows <> 0 then
    raise exception 'Existing paid-governance AI-system references violate tenant scope';
  end if;
end
$verify$;

notify pgrst, 'reload schema';
commit;
