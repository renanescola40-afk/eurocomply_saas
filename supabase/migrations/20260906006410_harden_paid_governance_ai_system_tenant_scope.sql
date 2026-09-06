begin;

-- Same-root-cause companion to the paid-governance runtime foundation bridge.
-- Prevent Enterprise governance rows from referencing an AI system owned by a
-- different organization. This is prospective enforcement only and does not
-- rewrite historical migration versions or application rows.

do $preflight$
begin
  if to_regclass('public.ai_systems') is null
     or to_regclass('public.enterprise_vendor_due_diligence') is null
     or to_regclass('public.enterprise_risk_reviews') is null then
    raise exception 'Paid governance tenant-scope prerequisites are missing';
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

revoke all on function public.enforce_enterprise_ai_system_tenant_scope() from public;
revoke all on function public.enforce_enterprise_ai_system_tenant_scope() from anon;
revoke all on function public.enforce_enterprise_ai_system_tenant_scope() from authenticated;

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
  function_oid oid := to_regprocedure('public.enforce_enterprise_ai_system_tenant_scope()');
begin
  if function_oid is null then
    raise exception 'Enterprise AI-system tenant-scope trigger function is missing';
  end if;

  if has_function_privilege('public', function_oid, 'EXECUTE')
     or has_function_privilege('anon', function_oid, 'EXECUTE')
     or has_function_privilege('authenticated', function_oid, 'EXECUTE') then
    raise exception 'Enterprise AI-system tenant-scope trigger function became directly executable';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.enterprise_vendor_due_diligence'::regclass
      and tgname = 'enforce_enterprise_vendor_diligence_ai_system_scope'
      and not tgisinternal
  ) then
    raise exception 'Vendor diligence tenant-scope trigger is missing';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.enterprise_risk_reviews'::regclass
      and tgname = 'enforce_enterprise_risk_review_ai_system_scope'
      and not tgisinternal
  ) then
    raise exception 'Risk review tenant-scope trigger is missing';
  end if;
end
$verify$;

notify pgrst, 'reload schema';
commit;
