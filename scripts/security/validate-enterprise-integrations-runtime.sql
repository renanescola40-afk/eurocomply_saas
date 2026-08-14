\set ON_ERROR_STOP on

-- Fail-closed runtime validation for Enterprise licensing + integrations + SCIM.
-- This proof is read-only and is intended for the exact-SHA disposable schema
-- runtime or, after protected deployment, the live production schema.
do $proof$
declare
  missing_tables integer;
  forced_rls integer;
  browser_grants integer;
  tenant_fk_count integer;
  required_rpc_count integer;
  hardened_rpc_count integer;
  service_rpc_count integer;
  sensitive_column_count integer;
begin
  select count(*) into missing_tables
  from (values
    ('platform_admin_users'),
    ('enterprise_contracts'),
    ('organization_entitlements'),
    ('organization_usage'),
    ('enterprise_seat_operations'),
    ('enterprise_service_accounts'),
    ('enterprise_api_keys'),
    ('enterprise_webhook_subscriptions'),
    ('enterprise_webhook_deliveries'),
    ('enterprise_identity_connections'),
    ('enterprise_scim_tokens'),
    ('enterprise_integration_audit_events'),
    ('enterprise_scim_identities')
  ) required(table_name)
  where to_regclass('public.' || required.table_name) is null;

  if missing_tables <> 0 then
    raise exception 'Enterprise control-plane tables missing: %', missing_tables;
  end if;

  select count(*) into forced_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (
      'platform_admin_users',
      'enterprise_contracts',
      'organization_entitlements',
      'organization_usage',
      'enterprise_seat_operations',
      'enterprise_service_accounts',
      'enterprise_api_keys',
      'enterprise_webhook_subscriptions',
      'enterprise_webhook_deliveries',
      'enterprise_identity_connections',
      'enterprise_scim_tokens',
      'enterprise_integration_audit_events',
      'enterprise_scim_identities'
    )
    and c.relrowsecurity
    and c.relforcerowsecurity;

  if forced_rls <> 13 then
    raise exception 'Enterprise control-plane RLS/FORCE RLS incomplete: %/13', forced_rls;
  end if;

  select count(*) into browser_grants
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in (
      'platform_admin_users',
      'enterprise_contracts',
      'organization_entitlements',
      'organization_usage',
      'enterprise_seat_operations',
      'enterprise_service_accounts',
      'enterprise_api_keys',
      'enterprise_webhook_subscriptions',
      'enterprise_webhook_deliveries',
      'enterprise_identity_connections',
      'enterprise_scim_tokens',
      'enterprise_integration_audit_events',
      'enterprise_scim_identities'
    )
    and grantee in ('anon','authenticated');

  if browser_grants <> 0 then
    raise exception 'Browser roles retain Enterprise control-plane table grants: %', browser_grants;
  end if;

  select count(*) into tenant_fk_count
  from pg_constraint
  where conname in (
    'enterprise_api_keys_service_account_tenant_fk',
    'enterprise_api_keys_rotation_tenant_fk',
    'enterprise_webhook_deliveries_subscription_tenant_fk',
    'enterprise_scim_tokens_connection_tenant_fk',
    'enterprise_integration_audit_service_account_tenant_fk',
    'enterprise_scim_identities_connection_tenant_fk'
  )
    and contype = 'f'
    and convalidated;

  if tenant_fk_count <> 6 then
    raise exception 'Enterprise integration tenant FK coverage incomplete: %/6', tenant_fk_count;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.enterprise_scim_identities'::regclass
      and conname = 'enterprise_scim_identities_connection_tenant_fk'
      and contype = 'f'
      and convalidated
      and confdeltype = 'r'
  ) then
    raise exception 'SCIM identity connection deletes are not tenant-safe/restricted';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='organization_members'
      and column_name='seat_type' and is_nullable='NO'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='organization_members'
      and column_name='status' and is_nullable='NO'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='invitations'
      and column_name='seat_type' and is_nullable='NO'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='invitations'
      and column_name='revoked_at'
  ) then
    raise exception 'Enterprise seat/invitation runtime columns are incomplete';
  end if;

  select count(*) into sensitive_column_count
  from information_schema.columns
  where table_schema='public'
    and (
      (table_name='enterprise_api_keys' and column_name='secret_hash')
      or (table_name='enterprise_scim_tokens' and column_name='token_hash')
      or (table_name='enterprise_webhook_subscriptions' and column_name='secret_ciphertext')
      or (table_name='enterprise_identity_connections' and column_name='encrypted_client_secret')
    );

  if sensitive_column_count <> 4 then
    raise exception 'Enterprise credential-digest/encrypted-secret storage columns incomplete';
  end if;

  select count(*) into required_rpc_count
  from unnest(array[
    to_regprocedure('public.resolve_organization_entitlements_v2(uuid)'),
    to_regprocedure('public.reserve_organization_seat_idempotent_atomic(uuid,uuid,text,text,uuid,text,text)'),
    to_regprocedure('public.release_organization_seat_atomic(uuid,uuid,uuid,text,text)'),
    to_regprocedure('public.create_enterprise_scim_token_atomic(uuid,uuid,text,text,timestamptz,uuid)'),
    to_regprocedure('public.authenticate_enterprise_scim_token(text,text)'),
    to_regprocedure('public.upsert_enterprise_scim_identity_atomic(uuid,uuid,text,uuid,text,text,text)'),
    to_regprocedure('public.get_enterprise_scim_identity(uuid,uuid)'),
    to_regprocedure('public.find_enterprise_scim_identity(uuid,text,text)'),
    to_regprocedure('public.deactivate_enterprise_scim_identity_atomic(uuid,uuid)')
  ]::regprocedure[]) rpc
  where rpc is not null;

  if required_rpc_count <> 9 then
    raise exception 'Enterprise licensing/SCIM RPC set incomplete: %/9', required_rpc_count;
  end if;

  select count(*) into hardened_rpc_count
  from pg_proc p
  where p.oid = any(array[
    to_regprocedure('public.resolve_organization_entitlements_v2(uuid)'),
    to_regprocedure('public.reserve_organization_seat_idempotent_atomic(uuid,uuid,text,text,uuid,text,text)'),
    to_regprocedure('public.release_organization_seat_atomic(uuid,uuid,uuid,text,text)'),
    to_regprocedure('public.create_enterprise_scim_token_atomic(uuid,uuid,text,text,timestamptz,uuid)'),
    to_regprocedure('public.authenticate_enterprise_scim_token(text,text)'),
    to_regprocedure('public.upsert_enterprise_scim_identity_atomic(uuid,uuid,text,uuid,text,text,text)'),
    to_regprocedure('public.get_enterprise_scim_identity(uuid,uuid)'),
    to_regprocedure('public.find_enterprise_scim_identity(uuid,text,text)'),
    to_regprocedure('public.deactivate_enterprise_scim_identity_atomic(uuid,uuid)')
  ]::oid[])
    and p.prosecdef
    and exists (
      select 1
      from unnest(coalesce(p.proconfig,array[]::text[])) setting
      where setting='search_path=pg_catalog'
    );

  if hardened_rpc_count <> 9 then
    raise exception 'Enterprise licensing/SCIM SECURITY DEFINER search_path hardening incomplete: %/9', hardened_rpc_count;
  end if;

  select count(*) into service_rpc_count
  from unnest(array[
    to_regprocedure('public.resolve_organization_entitlements_v2(uuid)'),
    to_regprocedure('public.reserve_organization_seat_idempotent_atomic(uuid,uuid,text,text,uuid,text,text)'),
    to_regprocedure('public.release_organization_seat_atomic(uuid,uuid,uuid,text,text)'),
    to_regprocedure('public.create_enterprise_scim_token_atomic(uuid,uuid,text,text,timestamptz,uuid)'),
    to_regprocedure('public.authenticate_enterprise_scim_token(text,text)'),
    to_regprocedure('public.upsert_enterprise_scim_identity_atomic(uuid,uuid,text,uuid,text,text,text)'),
    to_regprocedure('public.get_enterprise_scim_identity(uuid,uuid)'),
    to_regprocedure('public.find_enterprise_scim_identity(uuid,text,text)'),
    to_regprocedure('public.deactivate_enterprise_scim_identity_atomic(uuid,uuid)')
  ]::regprocedure[]) rpc
  where rpc is not null
    and has_function_privilege('service_role',rpc,'EXECUTE')
    and not has_function_privilege('anon',rpc,'EXECUTE')
    and not has_function_privilege('authenticated',rpc,'EXECUTE');

  if service_rpc_count <> 9 then
    raise exception 'Enterprise licensing/SCIM RPC grants are not service-role-only: %/9', service_rpc_count;
  end if;

  if exists (
    select 1
    from public.organization_entitlements entitlement
    join public.enterprise_contracts contract on contract.id=entitlement.contract_id
    where coalesce((contract.custom_features ->> 'legacy_compatibility')::boolean,false)
      and (
        entitlement.sso_enabled
        or entitlement.scim_enabled
        or entitlement.api_enabled
        or entitlement.webhooks_enabled
      )
  ) then
    raise exception 'Legacy compatibility contracts unexpectedly enable Enterprise integration features';
  end if;
end
$proof$;

select 'enterprise_integrations_runtime_validation_passed' as status;
