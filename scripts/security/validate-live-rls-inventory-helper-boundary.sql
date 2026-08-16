\set ON_ERROR_STOP on

-- Read-only postcondition proof for the controlled live RLS inventory helper.
-- The helper exposes schema-security metadata and must remain service-role-only.
do $verify$
declare
  function_oid oid := to_regprocedure('public.eurocomply_live_rls_inventory(text[])');
begin
  if function_oid is null then
    raise exception 'live RLS inventory helper is missing';
  end if;

  if exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where p.oid = function_oid
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ) then
    raise exception 'PUBLIC retains EXECUTE on the live RLS inventory helper';
  end if;

  if has_function_privilege('anon', function_oid, 'EXECUTE') then
    raise exception 'anon retains EXECUTE on the live RLS inventory helper';
  end if;

  if has_function_privilege('authenticated', function_oid, 'EXECUTE') then
    raise exception 'authenticated retains EXECUTE on the live RLS inventory helper';
  end if;

  if not has_function_privilege('service_role', function_oid, 'EXECUTE') then
    raise exception 'service_role lacks EXECUTE on the live RLS inventory helper';
  end if;

  if (select p.prosecdef from pg_proc p where p.oid = function_oid) then
    raise exception 'live RLS inventory helper must remain SECURITY INVOKER';
  end if;

  if not exists (
    select 1
    from pg_proc p
    cross join lateral unnest(coalesce(p.proconfig, array[]::text[])) setting
    where p.oid = function_oid
      and setting = 'search_path=public, pg_catalog'
  ) then
    raise exception 'live RLS inventory helper search_path is not fixed';
  end if;
end
$verify$;

select 'live_rls_inventory_helper_boundary_passed' as status;

-- This validator is the final read-only include in the shared forward
-- reconciliation postcondition runner. Chain the Gap Analysis/remediation
-- runtime proof here so isolated rehearsal and protected promotion execute the
-- same fail-closed current-schema validation without a second workflow path.
\ir validate-gap-remediation-runtime.sql
