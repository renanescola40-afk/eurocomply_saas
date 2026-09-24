begin;

alter table public.organization_security_settings
  add column if not exists require_mfa_for_all_users boolean not null default false;

comment on column public.organization_security_settings.require_mfa_for_all_users is
  'When true, authenticated workspace access requires an AAL2 Supabase Auth session for every organization member.';

do $tenant_mfa_verify$
declare
  settings_rls boolean;
  settings_force_rls boolean;
begin
  select c.relrowsecurity, c.relforcerowsecurity
    into settings_rls, settings_force_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'organization_security_settings';

  if settings_rls is distinct from true or settings_force_rls is distinct from true then
    raise exception 'tenant-wide MFA: organization_security_settings must retain RLS and FORCE RLS';
  end if;

  if has_table_privilege('anon', 'public.organization_security_settings', 'SELECT')
     or has_table_privilege('anon', 'public.organization_security_settings', 'INSERT')
     or has_table_privilege('anon', 'public.organization_security_settings', 'UPDATE')
     or has_table_privilege('anon', 'public.organization_security_settings', 'DELETE')
     or has_table_privilege('authenticated', 'public.organization_security_settings', 'SELECT')
     or has_table_privilege('authenticated', 'public.organization_security_settings', 'INSERT')
     or has_table_privilege('authenticated', 'public.organization_security_settings', 'UPDATE')
     or has_table_privilege('authenticated', 'public.organization_security_settings', 'DELETE')
     or not has_table_privilege('service_role', 'public.organization_security_settings', 'SELECT')
     or not has_table_privilege('service_role', 'public.organization_security_settings', 'INSERT')
     or not has_table_privilege('service_role', 'public.organization_security_settings', 'UPDATE')
     or not has_table_privilege('service_role', 'public.organization_security_settings', 'DELETE') then
    raise exception 'tenant-wide MFA: organization_security_settings privilege boundary drifted';
  end if;
end
$tenant_mfa_verify$;

select pg_notify('pgrst', 'reload schema');

commit;
