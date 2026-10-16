begin;

-- SECURITY FIX: Enterprise RLS helpers must enforce the same tenant-wide MFA
-- requirement already enforced by app_private.is_org_member / has_org_role.
-- Source-only migration; apply only after isolated tenant A/B MFA testing.
-- Preserve the existing active-membership checks and manager role boundaries.
do $preflight$
begin
  if to_regprocedure('public.tenant_mfa_satisfied(uuid)') is null
     or to_regprocedure('app_private.enterprise_member_can_read(uuid)') is null
     or to_regprocedure('app_private.enterprise_member_can_manage(uuid)') is null
     or to_regclass('public.organization_members') is null then
    raise exception 'Enterprise MFA reconciliation dependencies are missing';
  end if;
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
    and auth.uid() is not null
    and public.tenant_mfa_satisfied(p_organization_id)
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id = p_organization_id
        and lower(coalesce(om.status, '')) = 'active'
        and om.user_id = auth.uid()
    );
$function$;

create or replace function app_private.enterprise_member_can_manage(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select p_organization_id is not null
    and auth.uid() is not null
    and public.tenant_mfa_satisfied(p_organization_id)
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id = p_organization_id
        and lower(coalesce(om.status, '')) = 'active'
        and om.user_id = auth.uid()
        and lower(coalesce(om.role, 'viewer')) in (
          'owner', 'admin', 'editor', 'compliance_manager'
        )
    );
$function$;

-- Preserve the documented RLS call authority without exposing either helper
-- to unauthenticated callers or via a new public-schema RPC surface.
revoke all on function app_private.enterprise_member_can_read(uuid) from public, anon;
revoke all on function app_private.enterprise_member_can_manage(uuid) from public, anon;
grant execute on function app_private.enterprise_member_can_read(uuid) to authenticated, service_role;
grant execute on function app_private.enterprise_member_can_manage(uuid) to authenticated, service_role;

do $postconditions$
declare
  helper_name text;
  helper_oid oid;
  helper_definition text;
  helper_security_definer boolean;
  helper_settings text[];
begin
  for helper_name in
    select unnest(array['enterprise_member_can_read', 'enterprise_member_can_manage'])
  loop
    select p.oid, pg_get_functiondef(p.oid), p.prosecdef, p.proconfig
      into helper_oid, helper_definition, helper_security_definer, helper_settings
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app_private'
      and p.proname = helper_name
      and pg_get_function_identity_arguments(p.oid) = 'p_organization_id uuid';

    if helper_oid is null
      or helper_security_definer is distinct from true
      or helper_settings is null
      or not ('search_path=pg_catalog' = any(helper_settings))
      or position('public.tenant_mfa_satisfied(p_organization_id)' in coalesce(helper_definition, '')) = 0
      or position('auth.uid() is not null' in lower(coalesce(helper_definition, ''))) = 0
      or not has_function_privilege('authenticated', helper_oid, 'EXECUTE')
      or has_function_privilege('anon', helper_oid, 'EXECUTE') then
      raise exception 'Enterprise helper MFA or privilege postcondition failed for %', helper_name;
    end if;
  end loop;

  if to_regprocedure('public.enterprise_member_can_read(uuid)') is not null
     or to_regprocedure('public.enterprise_member_can_manage(uuid)') is not null then
    raise exception 'Enterprise privileged membership helper exposed via public RPC schema';
  end if;
end
$postconditions$;

commit;
