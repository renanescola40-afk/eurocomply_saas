begin;

-- Tenant-wide MFA terminal ACL hardening.
-- Current production RLS policies execute the app_private helpers. The public
-- compatibility helpers do not need to be exposed as authenticated REST RPCs.
-- Keep service_role authority for controlled backend/security validation only.

revoke all on function public.tenant_mfa_satisfied(uuid) from public, anon, authenticated;
revoke all on function public.is_org_member(uuid) from public, anon, authenticated;
revoke all on function public.has_org_role(uuid, text[]) from public, anon, authenticated;

grant execute on function public.tenant_mfa_satisfied(uuid) to service_role;
grant execute on function public.is_org_member(uuid) to service_role;
grant execute on function public.has_org_role(uuid, text[]) to service_role;

alter function public.tenant_mfa_satisfied(uuid) set search_path = pg_catalog, public;
alter function public.is_org_member(uuid) set search_path = pg_catalog, public;
alter function public.has_org_role(uuid, text[]) set search_path = pg_catalog, public;

do $tenant_mfa_acl_verify$
begin
  if has_function_privilege('anon', 'public.tenant_mfa_satisfied(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.tenant_mfa_satisfied(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.is_org_member(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.is_org_member(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.has_org_role(uuid,text[])', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.has_org_role(uuid,text[])', 'EXECUTE') then
    raise exception 'tenant MFA public helper RPC boundary remains exposed';
  end if;

  if not has_function_privilege('service_role', 'public.tenant_mfa_satisfied(uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.is_org_member(uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.has_org_role(uuid,text[])', 'EXECUTE') then
    raise exception 'tenant MFA service-role helper authority missing';
  end if;
end
$tenant_mfa_acl_verify$;

commit;
