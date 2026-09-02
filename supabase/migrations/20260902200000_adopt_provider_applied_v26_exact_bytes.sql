begin;

-- V27 canonical forward adoption after the exact V25/V26 migration bytes were
-- applied through a provider operation that recorded provider-generated ledger
-- versions. This migration does not repair, rewrite or delete migration history.
-- It proves the exact approved provider-applied bytes and the required live
-- commercial/Enterprise SSO postconditions before adding one new forward
-- repository-controlled execution identity strictly after the observed remote
-- head.

do $provider_bytes$
declare
  commercial_statement_count integer;
  sso_statement_count integer;
  commercial_sha256 text;
  sso_sha256 text;
begin
  if to_regclass('supabase_migrations.schema_migrations') is null
     or to_regprocedure('extensions.digest(bytea,text)') is null then
    raise exception 'provider migration byte verification prerequisites are missing';
  end if;

  select cardinality(m.statements),
         encode(extensions.digest(convert_to(m.statements[1], 'UTF8'), 'sha256'), 'hex')
    into commercial_statement_count, commercial_sha256
  from supabase_migrations.schema_migrations m
  where m.name = 'reconcile_deterministic_commercial_contract_source_precedence'
  order by m.version desc
  limit 1;

  if commercial_statement_count is distinct from 1
     or commercial_sha256 is distinct from '894ca7297890ae01ab57986af20654e33b62e95fe732cad4b8336afeed6f0fac' then
    raise exception 'provider-applied commercial reconciliation bytes do not match the reviewed V25 digest';
  end if;

  select cardinality(m.statements),
         encode(extensions.digest(convert_to(m.statements[1], 'UTF8'), 'sha256'), 'hex')
    into sso_statement_count, sso_sha256
  from supabase_migrations.schema_migrations m
  where m.name = 'reconcile_enterprise_sso_production_runtime'
  order by m.version desc
  limit 1;

  if sso_statement_count is distinct from 1
     or sso_sha256 is distinct from '494631c9521dc224cef5609cc975c4ebb9731ce14bfcced71ee026fb3cf35adb' then
    raise exception 'provider-applied Enterprise SSO reconciliation bytes do not match the reviewed V26 digest';
  end if;
end
$provider_bytes$;

do $live_postconditions$
declare
  required_column text;
  resolver_definition text;
  rpc_signature text;
begin
  if to_regclass('public.enterprise_identity_connections') is null
     or to_regprocedure('app_private.resolve_commercial_plan(uuid)') is null then
    raise exception 'canonical V27 live postcondition prerequisites are missing';
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
      raise exception 'canonical V27 Enterprise SSO runtime column % is missing', required_column;
    end if;
  end loop;

  if to_regprocedure('public.resolve_enterprise_sso_binding(uuid,text)') is null
     or to_regprocedure('public.record_enterprise_sso_login(uuid,uuid,text)') is null
     or to_regprocedure('public.upsert_enterprise_sso_connection_atomic(uuid,uuid,uuid,text,text,text,text,text,boolean,boolean,uuid)') is null then
    raise exception 'canonical V27 Enterprise SSO runtime RPC is missing';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'enterprise_identity_default_role_allowed'
      and conrelid = 'public.enterprise_identity_connections'::regclass
  ) or not exists (
    select 1 from pg_constraint
    where conname = 'enterprise_identity_default_seat_allowed'
      and conrelid = 'public.enterprise_identity_connections'::regclass
  ) then
    raise exception 'canonical V27 Enterprise SSO validation constraints are missing';
  end if;

  if to_regclass('public.enterprise_identity_supabase_provider_unique') is null
     or to_regclass('public.enterprise_identity_domain_active_idx') is null then
    raise exception 'canonical V27 Enterprise SSO indexes are missing';
  end if;

  select pg_get_functiondef('app_private.resolve_commercial_plan(uuid)'::regprocedure)
    into resolver_definition;

  if coalesce(resolver_definition, '') not like '%order by source.priority desc, source.id asc%'
     or coalesce(resolver_definition, '') not like '%source.source_kind = ''signed_contract''%'
     or coalesce(resolver_definition, '') not like '%event.livemode = true%'
     or coalesce(resolver_definition, '') not like '%event.status = ''processed''%' then
    raise exception 'canonical V27 commercial resolver postconditions are invalid';
  end if;

  if has_function_privilege('public', 'app_private.resolve_commercial_plan(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'app_private.resolve_commercial_plan(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'app_private.resolve_commercial_plan(uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'app_private.resolve_commercial_plan(uuid)', 'EXECUTE') then
    raise exception 'canonical V27 commercial resolver privilege boundary is invalid';
  end if;

  foreach rpc_signature in array array[
    'public.resolve_enterprise_sso_binding(uuid,text)',
    'public.record_enterprise_sso_login(uuid,uuid,text)',
    'public.upsert_enterprise_sso_connection_atomic(uuid,uuid,uuid,text,text,text,text,text,boolean,boolean,uuid)'
  ] loop
    if has_function_privilege('public', rpc_signature, 'EXECUTE')
       or has_function_privilege('anon', rpc_signature, 'EXECUTE')
       or has_function_privilege('authenticated', rpc_signature, 'EXECUTE')
       or not has_function_privilege('service_role', rpc_signature, 'EXECUTE') then
      raise exception 'canonical V27 Enterprise SSO RPC privilege boundary is invalid for %', rpc_signature;
    end if;
  end loop;
end
$live_postconditions$;

notify pgrst, 'reload schema';

commit;
