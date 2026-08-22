begin;

alter table public.enterprise_contracts
  drop constraint if exists enterprise_contracts_mode_bridge_check;
alter table public.enterprise_contracts
  drop constraint if exists enterprise_contracts_contract_mode_check;
alter table public.enterprise_contracts
  drop constraint if exists enterprise_contracts_mode_check;

update public.enterprise_contracts
set contract_mode='compatibility'
where contract_mode='legacy_compatibility';

alter table public.enterprise_contracts
  add constraint enterprise_contracts_mode_check
  check (contract_mode in ('compatibility','negotiated'));

-- A Stripe subscription is a globally unique provider identity and is an
-- authoritative selector for negotiated Enterprise billing. Fail closed before
-- installing the unique boundary if a legacy restore contains duplicate binds.
do $stripe_binding_guard$
begin
  if exists (
    select contract.stripe_subscription_id
    from public.enterprise_contracts contract
    where contract.stripe_subscription_id is not null
    group by contract.stripe_subscription_id
    having count(*) > 1
  ) then
    raise exception 'duplicate_enterprise_stripe_subscription_binding';
  end if;
end
$stripe_binding_guard$;

create unique index if not exists enterprise_contracts_stripe_subscription_uidx
  on public.enterprise_contracts(stripe_subscription_id)
  where stripe_subscription_id is not null;

-- V19 billing synchronization is intentionally split into an internal mutation
-- implementation (v2) and a service-role entrypoint (v3). The entrypoint must
-- never create a new Enterprise Stripe binding from organization_id alone:
-- self-service Checkout also carries organization metadata. A negotiated
-- contract is selected only by an explicit contract id or by an already-bound
-- Stripe subscription id, then v2 receives that exact contract identity.
create or replace function public.sync_enterprise_contract_billing_v3_atomic(
  p_event_id text,
  p_event_type text,
  p_contract_id uuid,
  p_organization_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_stripe_price_id text,
  p_stripe_invoice_id text,
  p_stripe_status text,
  p_invoice_paid boolean,
  p_payment_due_at timestamptz,
  p_external_reference text
)
returns table (
  outcome text,
  matched boolean,
  contract_id uuid,
  organization_id uuid,
  previous_status text,
  applied_status text,
  billing_status text,
  version integer
)
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_contract public.enterprise_contracts%rowtype;
  v_existing_event public.enterprise_contract_billing_events%rowtype;
begin
  select event.* into v_existing_event
  from public.enterprise_contract_billing_events event
  where event.stripe_event_id=p_event_id;

  if found then
    select contract.* into v_contract
    from public.enterprise_contracts contract
    where contract.id=v_existing_event.contract_id
      and contract.contract_mode='negotiated';

    if found then
      return query select
        'duplicate'::text,
        true,
        v_existing_event.contract_id,
        v_existing_event.organization_id,
        v_existing_event.previous_contract_status,
        v_existing_event.applied_contract_status,
        v_existing_event.billing_status,
        v_contract.version;
      return;
    end if;
  end if;

  select contract.* into v_contract
  from public.enterprise_contracts contract
  where contract.contract_mode='negotiated'
    and (
      (
        p_contract_id is not null
        and contract.id=p_contract_id
        and (p_organization_id is null or contract.organization_id=p_organization_id)
      )
      or (
        p_stripe_subscription_id is not null
        and contract.stripe_subscription_id=p_stripe_subscription_id
      )
    )
  order by
    case when contract.id=p_contract_id then 0 else 1 end,
    contract.updated_at desc
  limit 1;

  if not found then
    return query select
      'not_enterprise'::text,
      false,
      null::uuid,
      p_organization_id,
      null::text,
      null::text,
      null::text,
      null::integer;
    return;
  end if;

  return query
  select result.outcome,
    result.matched,
    result.contract_id,
    result.organization_id,
    result.previous_status,
    result.applied_status,
    result.billing_status,
    result.version
  from public.sync_enterprise_contract_billing_v2_atomic(
    p_event_id,
    p_event_type,
    v_contract.id,
    v_contract.organization_id,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_stripe_price_id,
    p_stripe_invoice_id,
    p_stripe_status,
    p_invoice_paid,
    p_payment_due_at,
    p_external_reference
  ) result;
end;
$$;

-- The historical configure RPC is not present on the bounded Production base.
-- Re-materialize the negotiated-only service-role API consumed by Platform
-- Control Center instead of depending on an unapplied historical migration.
create or replace function public.configure_enterprise_contract_billing_v2_atomic(
  p_contract_id uuid,
  p_payment_method text,
  p_billing_status text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_stripe_price_id text,
  p_external_reference text,
  p_payment_due_at timestamptz,
  p_actor_user_id uuid,
  p_reason text
)
returns table (
  outcome text,
  contract_id uuid,
  organization_id uuid,
  billing_status text,
  contract_status text,
  version integer
)
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_contract public.enterprise_contracts%rowtype;
  v_previous_status text;
  v_method text:=lower(trim(coalesce(p_payment_method,'')));
  v_billing text:=lower(trim(coalesce(p_billing_status,'')));
  v_reason text:=trim(coalesce(p_reason,''));
begin
  if p_contract_id is null
     or p_actor_user_id is null
     or v_method not in ('stripe_subscription','stripe_invoice','bank_transfer','manual_invoice')
     or v_billing not in ('unlinked','pending','active','paid','past_due','manual_invoice','canceled','failed')
     or char_length(v_reason) not between 5 and 1000
     or (v_method='stripe_subscription' and nullif(trim(coalesce(p_stripe_subscription_id,'')),'') is null)
     or (v_method='stripe_invoice'
         and nullif(trim(coalesce(p_stripe_customer_id,'')),'') is null
         and nullif(trim(coalesce(p_external_reference,'')),'') is null)
     or (v_billing='past_due' and p_payment_due_at is null) then
    return query select
      'invalid_input'::text,p_contract_id,null::uuid,null::text,null::text,null::integer;
    return;
  end if;

  if not exists (
    select 1 from public.platform_admin_users actor
    where actor.user_id=p_actor_user_id
      and actor.enabled=true
      and actor.role in ('owner','sales_admin','platform_owner','platform_admin','platform_billing')
  ) then
    return query select
      'platform_role_required'::text,p_contract_id,null::uuid,null::text,null::text,null::integer;
    return;
  end if;

  select contract.* into v_contract
  from public.enterprise_contracts contract
  where contract.id=p_contract_id
    and contract.contract_mode='negotiated'
  for update;

  if not found then
    return query select
      'not_found'::text,p_contract_id,null::uuid,null::text,null::text,null::integer;
    return;
  end if;

  v_previous_status:=v_contract.status;

  update public.enterprise_contracts contract
  set
    payment_method=v_method,
    billing_status=v_billing,
    stripe_customer_id=nullif(trim(coalesce(p_stripe_customer_id,'')),''),
    stripe_subscription_id=nullif(trim(coalesce(p_stripe_subscription_id,'')),''),
    stripe_price_id=nullif(trim(coalesce(p_stripe_price_id,'')),''),
    external_invoice_reference=nullif(trim(coalesce(p_external_reference,'')),''),
    payment_due_at=p_payment_due_at,
    payment_failed_at=case
      when v_billing='past_due' then coalesce(contract.payment_failed_at,now())
      else null
    end,
    last_paid_at=case when v_billing='paid' then now() else contract.last_paid_at end,
    dunning_stage=case
      when v_billing='past_due' then greatest(contract.dunning_stage,1)
      when v_billing in ('paid','active') then 0
      else contract.dunning_stage
    end,
    version=contract.version+1,
    updated_by=p_actor_user_id,
    updated_at=now()
  where contract.id=v_contract.id
  returning * into v_contract;

  insert into public.enterprise_contract_billing_events(
    organization_id,
    contract_id,
    event_type,
    billing_status,
    previous_contract_status,
    applied_contract_status,
    stripe_customer_id,
    stripe_subscription_id,
    external_reference,
    metadata
  ) values (
    v_contract.organization_id,
    v_contract.id,
    'platform.billing_configured',
    v_billing,
    v_previous_status,
    v_contract.status,
    v_contract.stripe_customer_id,
    v_contract.stripe_subscription_id,
    v_contract.external_invoice_reference,
    jsonb_build_object(
      'payment_method',v_method,
      'reason',v_reason,
      'payment_due_at',p_payment_due_at
    )
  );

  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata)
  values (
    v_contract.organization_id,
    p_actor_user_id,
    'enterprise.contract_billing_configured',
    'enterprise_contract',
    v_contract.id::text,
    jsonb_build_object(
      'payment_method',v_method,
      'billing_status',v_billing,
      'reason',v_reason,
      'payment_due_at',p_payment_due_at
    )
  );

  return query select
    'configured'::text,
    v_contract.id,
    v_contract.organization_id,
    v_contract.billing_status,
    v_contract.status,
    v_contract.version;
end;
$$;

-- v2 remains callable only from the SECURITY DEFINER v3 wrapper. A service-role
-- caller must not bypass the stricter binding selector.
revoke all on function public.sync_enterprise_contract_billing_v2_atomic(
  text,text,uuid,uuid,text,text,text,text,text,boolean,timestamptz,text
) from public,anon,authenticated,service_role;
revoke all on function public.sync_enterprise_contract_billing_v3_atomic(
  text,text,uuid,uuid,text,text,text,text,text,boolean,timestamptz,text
) from public,anon,authenticated;
revoke all on function public.configure_enterprise_contract_billing_v2_atomic(
  uuid,text,text,text,text,text,text,timestamptz,uuid,text
) from public,anon,authenticated;

grant execute on function public.sync_enterprise_contract_billing_v3_atomic(
  text,text,uuid,uuid,text,text,text,text,text,boolean,timestamptz,text
) to service_role;
grant execute on function public.configure_enterprise_contract_billing_v2_atomic(
  uuid,text,text,text,text,text,text,timestamptz,uuid,text
) to service_role;

-- If an environment happened to receive the historical v1 configure function,
-- do not leave a service-role bypass around the negotiated-only v2 entrypoint.
do $legacy_rpc$
begin
  if to_regprocedure(
    'public.configure_enterprise_contract_billing_atomic(uuid,text,text,text,text,text,text,timestamptz,uuid,text)'
  ) is not null then
    execute 'revoke all on function public.configure_enterprise_contract_billing_atomic(uuid,text,text,text,text,text,text,timestamptz,uuid,text) from service_role';
  end if;
end
$legacy_rpc$;

do $verify$
declare
  sync_v2 oid:=to_regprocedure(
    'public.sync_enterprise_contract_billing_v2_atomic(text,text,uuid,uuid,text,text,text,text,text,boolean,timestamptz,text)'
  );
  sync_v3 oid:=to_regprocedure(
    'public.sync_enterprise_contract_billing_v3_atomic(text,text,uuid,uuid,text,text,text,text,text,boolean,timestamptz,text)'
  );
  configure_v2 oid:=to_regprocedure(
    'public.configure_enterprise_contract_billing_v2_atomic(uuid,text,text,text,text,text,text,timestamptz,uuid,text)'
  );
  subscription_binding_index oid:=to_regclass('public.enterprise_contracts_stripe_subscription_uidx');
  rpc oid;
begin
  if exists (
    select 1 from public.enterprise_contracts
    where contract_mode not in ('compatibility','negotiated')
  ) then
    raise exception 'Enterprise contract mode reconciliation is incomplete';
  end if;

  if exists (
    select 1 from public.enterprise_contracts
    where coalesce((custom_features ->> 'legacy_compatibility')::boolean,false)
      and contract_mode<>'compatibility'
  ) then
    raise exception 'Legacy compatibility contracts are not canonicalized';
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

  if sync_v2 is null or sync_v3 is null or configure_v2 is null then
    raise exception 'Enterprise billing hardening RPC set is incomplete';
  end if;

  if has_function_privilege('service_role',sync_v2,'EXECUTE') then
    raise exception 'Enterprise billing v2 implementation is directly executable by service_role';
  end if;

  foreach rpc in array array[sync_v3,configure_v2] loop
    if has_function_privilege('anon',rpc,'EXECUTE')
       or has_function_privilege('authenticated',rpc,'EXECUTE')
       or not has_function_privilege('service_role',rpc,'EXECUTE') then
      raise exception 'Enterprise billing hardened RPC privileges are not canonical';
    end if;

    if not exists (
      select 1
      from pg_proc p
      cross join lateral unnest(coalesce(p.proconfig,array[]::text[])) setting
      where p.oid=rpc
        and p.prosecdef
        and setting='search_path=pg_catalog'
    ) then
      raise exception 'Enterprise billing hardened RPC security configuration is not fixed';
    end if;
  end loop;
end
$verify$;

notify pgrst,'reload schema';
commit;
