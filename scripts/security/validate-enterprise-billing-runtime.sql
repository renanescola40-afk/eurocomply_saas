\set ON_ERROR_STOP on

do $proof$
declare
  billing_impl_v2 oid:=to_regprocedure('public.sync_enterprise_contract_billing_v2_atomic(text,text,uuid,uuid,text,text,text,text,text,boolean,timestamptz,text)');
  billing_rpc oid:=to_regprocedure('public.sync_enterprise_contract_billing_v3_atomic(text,text,uuid,uuid,text,text,text,text,text,boolean,timestamptz,text)');
  configure_rpc oid:=to_regprocedure('public.configure_enterprise_contract_billing_v2_atomic(uuid,text,text,text,text,text,text,timestamptz,uuid,text)');
  lifecycle_rpc oid:=to_regprocedure('public.process_enterprise_contract_lifecycle_v2_atomic(integer)');
  transition_helper oid:=to_regprocedure('public.is_valid_enterprise_contract_transition(text,text)');
  provision_rpc oid:=to_regprocedure('public.provision_enterprise_contract_atomic(uuid,text,text,bigint,timestamptz,timestamptz,timestamptz,integer,integer,integer,integer,integer,integer,integer,integer,integer,bigint,integer,boolean,boolean,boolean,boolean,boolean,boolean,boolean,uuid)');
  entitlement_rpc oid:=to_regprocedure('public.update_enterprise_contract_entitlements_atomic(uuid,integer,integer,integer,integer,integer,integer,integer,integer,bigint,integer,boolean,boolean,boolean,boolean,boolean,boolean,boolean,uuid,text)');
  status_rpc oid:=to_regprocedure('public.transition_enterprise_contract_status_atomic(uuid,text,text,uuid,text)');
  subscription_binding_index oid:=to_regclass('public.enterprise_contracts_stripe_subscription_uidx');
  rpc oid;
  billing_columns integer;
begin
  if to_regclass('public.enterprise_contracts') is null
     or to_regclass('public.enterprise_contract_billing_events') is null then
    raise exception 'Enterprise billing lifecycle tables are missing';
  end if;

  select count(*) into billing_columns
  from information_schema.columns
  where table_schema='public' and table_name='enterprise_contracts'
    and column_name in (
      'contract_mode','payment_method','billing_status','external_invoice_reference',
      'payment_failed_at','payment_due_at','last_paid_at','read_only_at',
      'dunning_stage','last_billing_event_id','stripe_customer_id','stripe_subscription_id',
      'stripe_price_id','latest_stripe_invoice_id'
    );
  if billing_columns<>14 then
    raise exception 'Enterprise contract billing columns incomplete: %/14',billing_columns;
  end if;

  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='enterprise_contract_billing_events'
      and c.relrowsecurity and c.relforcerowsecurity
  ) then
    raise exception 'Enterprise billing events RLS/FORCE RLS incomplete';
  end if;

  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema='public' and table_name='enterprise_contract_billing_events'
      and grantee in ('anon','authenticated')
  ) then
    raise exception 'Browser roles retain Enterprise billing event table privileges';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.enterprise_contracts'::regclass
      and conname='enterprise_contracts_mode_check' and convalidated
  ) or not exists (
    select 1 from pg_constraint
    where conrelid='public.enterprise_contracts'::regclass
      and conname='enterprise_contracts_billing_status_check' and convalidated
  ) then
    raise exception 'Enterprise billing contract constraints incomplete';
  end if;

  if subscription_binding_index is null
     or not exists (
       select 1
       from pg_index idx
       where idx.indexrelid=subscription_binding_index
         and idx.indisunique
         and pg_get_expr(idx.indpred,idx.indrelid) like '%stripe_subscription_id IS NOT NULL%'
     ) then
    raise exception 'Enterprise Stripe subscription binding uniqueness is not canonical';
  end if;

  if exists (
    select 1 from public.enterprise_contracts contract
    where contract.contract_mode not in ('compatibility','negotiated')
  ) then
    raise exception 'Enterprise contract modes are not canonical';
  end if;

  if exists (
    select 1 from public.enterprise_contracts contract
    where coalesce((contract.custom_features ->> 'legacy_compatibility')::boolean,false)
      and contract.contract_mode<>'compatibility'
  ) then
    raise exception 'Legacy compatibility contracts are eligible for negotiated billing sync';
  end if;

  if exists (
    select 1 from public.enterprise_contracts contract
    join public.organization_entitlements entitlement on entitlement.organization_id=contract.organization_id
    where contract.contract_mode='compatibility'
      and (entitlement.sso_enabled or entitlement.scim_enabled or entitlement.api_enabled or entitlement.webhooks_enabled)
  ) then
    raise exception 'Compatibility contracts unexpectedly enable Enterprise integrations';
  end if;

  if billing_impl_v2 is null or billing_rpc is null or configure_rpc is null
     or lifecycle_rpc is null or transition_helper is null
     or provision_rpc is null or entitlement_rpc is null or status_rpc is null then
    raise exception 'Enterprise contract control/billing RPC set incomplete';
  end if;

  if has_function_privilege('anon',billing_impl_v2,'EXECUTE')
     or has_function_privilege('authenticated',billing_impl_v2,'EXECUTE')
     or has_function_privilege('service_role',billing_impl_v2,'EXECUTE') then
    raise exception 'Enterprise billing v2 implementation remains directly executable';
  end if;

  if not exists (
    select 1 from pg_proc p
    cross join lateral unnest(coalesce(p.proconfig,array[]::text[])) setting
    where p.oid=billing_impl_v2 and p.prosecdef and setting='search_path=pg_catalog'
  ) then
    raise exception 'Enterprise billing v2 implementation search_path hardening incomplete';
  end if;

  foreach rpc in array array[billing_rpc,configure_rpc,lifecycle_rpc,provision_rpc,entitlement_rpc,status_rpc] loop
    if has_function_privilege('anon',rpc,'EXECUTE')
       or has_function_privilege('authenticated',rpc,'EXECUTE')
       or not has_function_privilege('service_role',rpc,'EXECUTE') then
      raise exception 'Enterprise contract control/billing RPC privileges are not service-role-only';
    end if;
    if not exists (
      select 1 from pg_proc p
      cross join lateral unnest(coalesce(p.proconfig,array[]::text[])) setting
      where p.oid=rpc and p.prosecdef and setting='search_path=pg_catalog'
    ) then
      raise exception 'Enterprise contract control/billing SECURITY DEFINER search_path hardening incomplete';
    end if;
  end loop;

  if has_function_privilege('anon',transition_helper,'EXECUTE')
     or has_function_privilege('authenticated',transition_helper,'EXECUTE')
     or not has_function_privilege('service_role',transition_helper,'EXECUTE') then
    raise exception 'Enterprise contract transition helper privileges are not service-role-only';
  end if;

  if not exists (
    select 1 from pg_proc p
    cross join lateral unnest(coalesce(p.proconfig,array[]::text[])) setting
    where p.oid=transition_helper and not p.prosecdef and setting='search_path=pg_catalog'
  ) then
    raise exception 'Enterprise contract transition helper search_path hardening incomplete';
  end if;
end
$proof$;

select 'enterprise_billing_runtime_validation_passed' as status;
