-- A new tenant needs a persisted security policy from the instant it exists.
-- Keep legacy/malformed/missing policies fail-closed: deliberately NO backfill.
-- Preserve the pre-existing new-tenant default (MFA optional until configured).
-- The trigger runs in the same transaction as the organization insert; failure
-- to initialize policy aborts organization creation rather than leaving an orphan.
begin;

do $mfa_initialization_preflight$
begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.organization_security_settings') is null
     or not exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'organization_security_settings'
         and column_name = 'require_mfa_for_all_users'
         and data_type = 'boolean'
     )
     or to_regprocedure('public.tenant_mfa_satisfied(uuid)') is null
  then
    raise exception 'new tenant MFA policy prerequisites missing';
  end if;
end
$mfa_initialization_preflight$;

create or replace function public.initialize_new_tenant_mfa_policy()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  insert into public.organization_security_settings (
    organization_id, require_mfa_for_all_users
  ) values (new.id, false);

  return new;
end;
$function$;

revoke all on function public.initialize_new_tenant_mfa_policy()
  from public, anon, authenticated;
grant execute on function public.initialize_new_tenant_mfa_policy()
  to service_role;

drop trigger if exists trg_initialize_new_tenant_mfa_policy on public.organizations;
create trigger trg_initialize_new_tenant_mfa_policy
  after insert on public.organizations
  for each row execute function public.initialize_new_tenant_mfa_policy();

do $verify_mfa_initialization$
begin
  if not exists (
      select 1
      from pg_trigger t
      join pg_proc p on p.oid = t.tgfoid
      join pg_namespace n on n.oid = p.pronamespace
      where t.tgrelid = 'public.organizations'::regclass
        and t.tgname = 'trg_initialize_new_tenant_mfa_policy'
        and not t.tgisinternal
        and t.tgenabled = 'O'
        and n.nspname = 'public'
        and p.proname = 'initialize_new_tenant_mfa_policy'
    )
    or has_function_privilege('anon', 'public.initialize_new_tenant_mfa_policy()', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.initialize_new_tenant_mfa_policy()', 'EXECUTE')
    or not has_function_privilege('service_role', 'public.initialize_new_tenant_mfa_policy()', 'EXECUTE')
    or public.tenant_mfa_satisfied('00000000-0000-0000-0000-000000000000'::uuid)
  then
    raise exception 'new tenant MFA policy trigger or security boundary invalid';
  end if;
end
$verify_mfa_initialization$;

commit;
