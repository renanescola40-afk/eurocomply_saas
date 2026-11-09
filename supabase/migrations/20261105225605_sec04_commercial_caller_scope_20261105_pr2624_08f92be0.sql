begin;
set local lock_timeout = '750ms';
set local statement_timeout = '20s';

-- SEC-02/SEC-04: prevent an authenticated SQL caller from inferring a
-- different tenant's commercial authority/plan through private RLS helpers.
-- Preserve trusted backend/service-role evaluation and existing RLS policies.
-- Forward-only, no production execution authorization; review and QA first.
do $preflight$
declare
  routine regprocedure;
  routine_oid oid;
  routine_def text;
  routine_config text[];
begin
  if to_regprocedure('app_private.resolve_commercial_plan(uuid)') is null
    or to_regprocedure('app_private.is_org_member(uuid)') is null
    or to_regprocedure('app_private.has_commercial_authority(uuid)') is null
    or to_regprocedure('app_private.has_minimum_commercial_plan(uuid,text)') is null
    or to_regprocedure('public.tenant_mfa_satisfied(uuid)') is null
  then raise exception 'SEC-04 commercial caller-scope prerequisites missing'; end if;

  for routine in select unnest(array[
     'app_private.has_commercial_authority(uuid)'::regprocedure,
     'app_private.has_minimum_commercial_plan(uuid,text)'::regprocedure
  ]) loop
    select p.oid, pg_get_functiondef(p.oid), p.proconfig
      into routine_oid, routine_def, routine_config
    from pg_proc p where p.oid=routine and p.prosecdef=true;
    if routine_oid is null
      or routine_config is null
      or not exists (select 1 from unnest(routine_config) c where c like 'search_path=%')
      or not has_function_privilege('authenticated',routine_oid,'EXECUTE')
      or not has_function_privilege('service_role',routine_oid,'EXECUTE')
      or has_function_privilege('anon',routine_oid,'EXECUTE')
      or position('resolve_commercial_plan' in coalesce(routine_def,''))=0
    then raise exception 'SEC-04 unsafe preexisting routine: %',routine; end if;
  end loop;
  if not exists (
    select 1 from pg_proc p
    where p.oid='app_private.is_org_member(uuid)'::regprocedure
      and p.prosecdef
      and position('tenant_mfa_satisfied' in pg_get_functiondef(p.oid))>0
  ) then raise exception 'SEC-04 tenant membership/MFA prerequisite absent'; end if;
end $preflight$;

-- SECURITY DEFINER changes current_user: use the caller's role GUC and
-- session_user, NOT current_user, to classify invocations.
-- Any unrecognized caller fails closed. A direct authenticated DB login
-- also needs membership even without SET ROLE.
create or replace function app_private.has_commercial_authority(
  target_organization_id uuid
) returns boolean
language sql stable security definer
set search_path = ''
as $function$
  select target_organization_id is not null
    and (
      case
        when current_setting('role',true)='authenticated'
          or session_user='authenticated'
          then app_private.is_org_member(target_organization_id)
        when current_setting('role',true)='service_role' then true
        when session_user='postgres'
          and coalesce(current_setting('role',true),'none') in ('none','postgres')
          then true
        else false
      end
    )
    and app_private.resolve_commercial_plan(target_organization_id) is not null;
$function$;

create or replace function app_private.has_minimum_commercial_plan(
  target_organization_id uuid, minimum_plan text
) returns boolean
language sql stable security definer
set search_path = ''
as $function$
  with permitted_plan as (
    select case
      when target_organization_id is null then null::text
      when current_setting('role',true)='authenticated'
        or session_user='authenticated' then
        case when app_private.is_org_member(target_organization_id)
          then app_private.resolve_commercial_plan(target_organization_id)
          else null::text end
      when current_setting('role',true)='service_role'
        or (session_user='postgres'
          and coalesce(current_setting('role',true),'none') in ('none','postgres'))
        then app_private.resolve_commercial_plan(target_organization_id)
      else null::text
    end as plan
  ), ranks as (
    select
      case (select plan from permitted_plan)
        when 'starter' then 1 when 'professional' then 2
        when 'business' then 3 when 'enterprise' then 4 else 0
      end as current_rank,
      case lower(trim(coalesce(minimum_plan,'')))
        when 'essential' then 1 when 'starter' then 1 when 'basic' then 1
        when 'professional' then 2 when 'pro' then 2 when 'growth' then 2
        when 'business' then 3 when 'enterprise' then 4
        else 2147483647
      end as minimum_rank
  )
  select current_rank>=minimum_rank and current_rank>0 from ranks;
$function$;

-- Retain existing RLS execution semantics; never expose public/anon access.
revoke all on function app_private.has_commercial_authority(uuid) from public, anon;
revoke all on function app_private.has_minimum_commercial_plan(uuid,text) from public, anon;
grant execute on function app_private.has_commercial_authority(uuid) to authenticated,service_role;
grant execute on function app_private.has_minimum_commercial_plan(uuid,text) to authenticated,service_role;

comment on function app_private.has_commercial_authority(uuid) is
  'Caller-scoped paid entitlement: authenticated must be active member with tenant MFA; trusted service_role/postgres retain backend read.';
comment on function app_private.has_minimum_commercial_plan(uuid,text) is
  'Caller-scoped plan threshold: authenticated must be active member with tenant MFA; trusted backend retains entitlement evaluation.';

do $postconditions$
declare routine regprocedure; definition text; fn oid; definer boolean;
begin
  for routine in select unnest(array[
    'app_private.has_commercial_authority(uuid)'::regprocedure,
    'app_private.has_minimum_commercial_plan(uuid,text)'::regprocedure
  ]) loop
    select p.oid,p.prosecdef,pg_get_functiondef(p.oid)
      into fn,definer,definition from pg_proc p where p.oid=routine;
    if fn is null or definer is distinct from true
      or position('current_setting(''role''' in definition)=0
      or position('app_private.is_org_member' in definition)=0
      or position('session_user' in lower(definition))=0
      or not has_function_privilege('authenticated',fn,'EXECUTE')
      or not has_function_privilege('service_role',fn,'EXECUTE')
      or has_function_privilege('anon',fn,'EXECUTE')
      or has_function_privilege('public',fn,'EXECUTE')
    then raise exception 'SEC-04 caller-scope postcondition failed: %',routine; end if;
  end loop;
end $postconditions$;

commit;
