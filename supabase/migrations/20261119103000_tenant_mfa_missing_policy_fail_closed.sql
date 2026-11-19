-- Fail closed when an organization has no security settings row.
-- The previous COALESCE(..., true) treated a missing policy as MFA satisfied,
-- even with no JWT. AAL2 alone must not override a missing tenant policy.
begin;

create or replace function public.tenant_mfa_satisfied(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select target_organization_id is not null
    and exists (
      select 1
      from public.organization_security_settings as oss
      where oss.organization_id = target_organization_id
        and (
          not oss.require_mfa_for_all_users
          or coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
        )
    );
$function$;

-- CREATE OR REPLACE retains the existing function owner and grants.
-- Keep the service-role-only RPC boundary established by the ACL hardening.
do $verify_mfa_policy$
begin
  if public.tenant_mfa_satisfied('00000000-0000-0000-0000-000000000000'::uuid)
     or has_function_privilege('anon', 'public.tenant_mfa_satisfied(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.tenant_mfa_satisfied(uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.tenant_mfa_satisfied(uuid)', 'EXECUTE')
  then
    raise exception 'tenant MFA policy must fail closed and preserve the RPC ACL';
  end if;
end
$verify_mfa_policy$;

commit;
