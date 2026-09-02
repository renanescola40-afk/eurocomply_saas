begin;

-- V27 forward-only verification reconciliation.
--
-- Production recorded the already-reviewed V25 and V26 bounded migrations under
-- provider-generated versions 20260902193810 and 20260902193849. Matching
-- versioned records live in supabase/reconciliation so drift tooling can bind
-- those remote identities without rewriting or repairing migration history.
--
-- This migration intentionally performs no schema, privilege or policy change.
-- It is a fail-closed assertion of the live V25/V26 postconditions and exists as
-- the next canonical forward version after the observed Production ledger head.

do $v27_verify$
declare
  resolver_definition text;
  required_column text;
  identity_rls boolean;
  identity_force_rls boolean;
begin
  if to_regprocedure('app_private.resolve_commercial_plan(uuid)') is null then
    raise exception 'V27: deterministic commercial plan resolver is missing';
  end if;

  select pg_get_functiondef('app_private.resolve_commercial_plan(uuid)'::regprocedure)
    into resolver_definition;

  if coalesce(resolver_definition, '') not like '%order by source.priority desc, source.id asc%'
     or coalesce(resolver_definition, '') not like '%source.source_kind = ''signed_contract''%'
     or coalesce(resolver_definition, '') not like '%event.livemode = true%'
     or coalesce(resolver_definition, '') not like '%event.status = ''processed''%' then
    raise exception 'V27: deterministic commercial authority postcondition drifted';
  end if;

  if has_function_privilege('public', 'app_private.resolve_commercial_plan(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'app_private.resolve_commercial_plan(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'app_private.resolve_commercial_plan(uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'app_private.resolve_commercial_plan(uuid)', 'EXECUTE') then
    raise exception 'V27: commercial resolver privilege boundary drifted';
  end if;

  if to_regclass('public.enterprise_identity_connections') is null then
    raise exception 'V27: enterprise identity connections table is missing';
  end if;

  foreach required_column in array array[
    'supabase_provider_id',
    'default_role',
    'default_seat_type',
    'auto_provision',
    'last_login_at'
  ] loop
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'enterprise_identity_connections'
        and column_name = required_column
    ) then
      raise exception 'V27: enterprise SSO runtime column % is missing', required_column;
    end if;
  end loop;

  if not exists (
       select 1
       from pg_constraint
       where conname = 'enterprise_identity_default_role_allowed'
         and conrelid = 'public.enterprise_identity_connections'::regclass
         and contype = 'c'
     )
     or not exists (
       select 1
       from pg_constraint
       where conname = 'enterprise_identity_default_seat_allowed'
         and conrelid = 'public.enterprise_identity_connections'::regclass
         and contype = 'c'
     ) then
    raise exception 'V27: enterprise SSO validation constraints are missing';
  end if;

  if to_regclass('public.enterprise_identity_supabase_provider_unique') is null
     or to_regclass('public.enterprise_identity_domain_active_idx') is null then
    raise exception 'V27: enterprise SSO runtime indexes are missing';
  end if;

  if to_regprocedure('public.resolve_enterprise_sso_binding(uuid,text)') is null
     or to_regprocedure('public.record_enterprise_sso_login(uuid,uuid,text)') is null
     or to_regprocedure('public.upsert_enterprise_sso_connection_atomic(uuid,uuid,uuid,text,text,text,text,text,boolean,boolean,uuid)') is null then
    raise exception 'V27: enterprise SSO runtime RPC is missing';
  end if;

  if exists (
       select 1
       from pg_proc p
       where p.oid in (
         'public.resolve_enterprise_sso_binding(uuid,text)'::regprocedure,
         'public.record_enterprise_sso_login(uuid,uuid,text)'::regprocedure,
         'public.upsert_enterprise_sso_connection_atomic(uuid,uuid,uuid,text,text,text,text,text,boolean,boolean,uuid)'::regprocedure
       )
       and (
         p.prosecdef is not true
         or not ('search_path=pg_catalog, public' = any(coalesce(p.proconfig, array[]::text[])))
       )
     ) then
    raise exception 'V27: enterprise SSO RPC security-definer/search-path boundary drifted';
  end if;

  if has_function_privilege('public', 'public.resolve_enterprise_sso_binding(uuid,text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.resolve_enterprise_sso_binding(uuid,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.resolve_enterprise_sso_binding(uuid,text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.resolve_enterprise_sso_binding(uuid,text)', 'EXECUTE')
     or has_function_privilege('public', 'public.record_enterprise_sso_login(uuid,uuid,text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.record_enterprise_sso_login(uuid,uuid,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.record_enterprise_sso_login(uuid,uuid,text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.record_enterprise_sso_login(uuid,uuid,text)', 'EXECUTE')
     or has_function_privilege('public', 'public.upsert_enterprise_sso_connection_atomic(uuid,uuid,uuid,text,text,text,text,text,boolean,boolean,uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.upsert_enterprise_sso_connection_atomic(uuid,uuid,uuid,text,text,text,text,text,boolean,boolean,uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.upsert_enterprise_sso_connection_atomic(uuid,uuid,uuid,text,text,text,text,text,boolean,boolean,uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.upsert_enterprise_sso_connection_atomic(uuid,uuid,uuid,text,text,text,text,text,boolean,boolean,uuid)', 'EXECUTE') then
    raise exception 'V27: enterprise SSO RPC privilege boundary drifted';
  end if;

  select c.relrowsecurity, c.relforcerowsecurity
    into identity_rls, identity_force_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'enterprise_identity_connections';

  if identity_rls is distinct from true or identity_force_rls is distinct from true then
    raise exception 'V27: enterprise identity RLS/FORCE RLS boundary drifted';
  end if;
end
$v27_verify$;

commit;
