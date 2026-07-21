begin;

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
set search_path = public
as $$
declare
  v_contract public.enterprise_contracts%rowtype;
  v_existing_event public.enterprise_contract_billing_events%rowtype;
begin
  select event.* into v_existing_event
  from public.enterprise_contract_billing_events as event
  where event.stripe_event_id = p_event_id;

  if found then
    select contract.* into v_contract
    from public.enterprise_contracts as contract
    where contract.id = v_existing_event.contract_id
      and contract.contract_mode = 'negotiated';

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
  from public.enterprise_contracts as contract
  where contract.contract_mode = 'negotiated'
    and (
      (
        p_contract_id is not null
        and contract.id = p_contract_id
        and (p_organization_id is null or contract.organization_id = p_organization_id)
      )
      or (
        p_stripe_subscription_id is not null
        and contract.stripe_subscription_id = p_stripe_subscription_id
      )
    )
  order by
    case when contract.id = p_contract_id then 0 else 1 end,
    contract.updated_at desc
  limit 1;

  if not found then
    return query select 'not_enterprise'::text, false, null::uuid, p_organization_id, null::text, null::text, null::text, null::integer;
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
  ) as result;
end;
$$;

revoke all on function public.sync_enterprise_contract_billing_v3_atomic(text, text, uuid, uuid, text, text, text, text, text, boolean, timestamptz, text) from public, anon, authenticated;
grant execute on function public.sync_enterprise_contract_billing_v3_atomic(text, text, uuid, uuid, text, text, text, text, text, boolean, timestamptz, text) to service_role;

notify pgrst, 'reload schema';

commit;
