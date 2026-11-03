begin;

-- SEC-01/02/03: reconcile the existing Enterprise private membership helpers
-- with the already-deployed, UUID-safe Clerk / Supabase Auth identity resolvers.
--
-- Do NOT alter historical migration 20261015235500, widen RLS, disable MFA,
-- create new roles or change caller grants. This forward migration is designed
-- for canonical review / isolated-QA execution, not an automatic PROD change.
--
-- Root cause: auth.uid() casts text Clerk subjects to uuid and raises 22P02
-- before an Enterprise RLS membership policy can make a denial decision.

do $preflight$
declare
  helper_name text;
  helper_oid oid;
  definition text;
begin
  if to_regprocedure('app_private.enterprise_member_can_read(uuid)') is null
     or to_regprocedure('app_private.enterprise_member_can_manage(uuid)') is null
     or to_regprocedure('app_private.is_org_member(uuid)') is null
     or to_regprocedure('app_private.has_org_role(uuid,text[])') is null
     or to_regprocedure('public.current_legacy_user_id()') is null
     or to_regprocedure('public.current_clerk_user_id()') is null
     or to_regprocedure('public.tenant_mfa_satisfied(uuid)') is null
     or to_regclass('public.organization_members') is null then
    raise exception 'Clerk-safe Enterprise membership migration prerequisites missing';
  end if;

  for helper_name in
    select unnest(array['is_org_member', 'has_org_role'])
  loop
    select p.oid, pg_get_functiondef(p.oid)
    into helper_oid, definition
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app_private' and p.proname = helper_name
      and p.prosecdef = true;

    if helper_oid is null
       or position('tenant_mfa_satisfied' in coalesce(definition,'')) = 0
       or has_function_privilege('anon', helper_oid, 'EXECUTE') then
      raise exception 'Unsafe or missing prerequisite: app_private.%', helper_name;
    end if;
  end loop;
end
$preflight$;

create or replace function app_private.enterprise_member_can_read(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select p_organization_id is not null
    and app_private.is_org_member(p_organization_id);
$function$;

create or replace function app_private.enterprise_member_can_manage(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select p_organization_id is not null
    and app_private.has_org_role(
      p_organization_id,
      array['owner', 'admin', 'editor', 'compliance_manager']
    );
$function$;

-- CREATE OR REPLACE preserves function identity and ownership. Explicitly
-- retain the existing authenticated/service_role EXECUTE and anon denial.
revoke all on function app_private.enterprise_member_can_read(uuid) from public, anon;
revoke all on function app_private.enterprise_member_can_manage(uuid) from public, anon;
grant execute on function app_private.enterprise_member_can_read(uuid) to authenticated, service_role;
grant execute on function app_private.enterprise_member_can_manage(uuid) to authenticated, service_role;

comment on function app_private.enterprise_member_can_read(uuid) is
  'Enterprise tenant read: delegates to Clerk/UUID-safe membership and tenant MFA; private definer, no public RPC.';
comment on function app_private.enterprise_member_can_manage(uuid) is
  'Enterprise tenant manager: delegates to Clerk/UUID-safe active role and tenant MFA; private definer, no public RPC.';

do $postconditions$
declare
  helper_name text;
  helper_oid oid;
  definition text;
  config text[];
  is_definer boolean;
begin
  for helper_name in
    select unnest(array['enterprise_member_can_read', 'enterprise_member_can_manage'])
  loop
    select p.oid, pg_get_functiondef(p.oid), p.proconfig, p.prosecdef
    into helper_oid, definition, config, is_definer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app_private'
      and p.proname = helper_name
      and pg_get_function_identity_arguments(p.oid) = 'p_organization_id uuid';

    if helper_oid is null or is_definer is distinct from true
       or config is null
       or not ('search_path=pg_catalog' = any(config))
       or position('auth.uid()' in coalesce(definition,'')) <> 0
       or not has_function_privilege('authenticated', helper_oid, 'EXECUTE')
       or not has_function_privilege('service_role', helper_oid, 'EXECUTE')
       or has_function_privilege('anon', helper_oid, 'EXECUTE') then
      raise exception 'Enterprise Clerk-safe helper postcondition failed: %', helper_name;
    end if;
  end loop;

  if position('app_private.is_org_member' in pg_get_functiondef(
       'app_private.enterprise_member_can_read(uuid)'::regprocedure)) = 0
     or position('app_private.has_org_role' in pg_get_functiondef(
       'app_private.enterprise_member_can_manage(uuid)'::regprocedure)) = 0
     or to_regprocedure('public.enterprise_member_can_read(uuid)') is not null
     or to_regprocedure('public.enterprise_member_can_manage(uuid)') is not null then
    raise exception 'Enterprise membership helper delegation or RPC exposure mismatch';
  end if;
end
$postconditions$;

commit;
