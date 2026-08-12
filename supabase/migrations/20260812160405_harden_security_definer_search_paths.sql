-- enterprise-migration-review: approved
-- Harden existing SECURITY DEFINER helpers so name resolution cannot be influenced
-- by mutable application or temporary schemas. Function bodies use schema-qualified
-- references, so pg_catalog alone is sufficient.

alter function app_private.is_org_member(uuid)
  set search_path = pg_catalog;

alter function app_private.has_org_role(uuid, text[])
  set search_path = pg_catalog;

alter function public.prevent_client_notification_scope_change()
  set search_path = pg_catalog;

do $security_definer_search_path_guard$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where (n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) in (
      ('app_private', 'is_org_member', 'target_organization_id uuid'),
      ('app_private', 'has_org_role', 'target_organization_id uuid, allowed_roles text[]'),
      ('public', 'prevent_client_notification_scope_change', '')
    )
      and coalesce(array_to_string(p.proconfig, ','), '') <> 'search_path=pg_catalog'
  ) then
    raise exception 'SECURITY DEFINER search_path hardening postcondition failed';
  end if;
end
$security_definer_search_path_guard$;
