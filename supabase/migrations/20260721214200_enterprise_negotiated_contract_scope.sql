begin;

alter table public.enterprise_contracts
  add column if not exists contract_mode text not null default 'negotiated',
  add column if not exists latest_stripe_invoice_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'enterprise_contracts_mode_check'
  ) then
    alter table public.enterprise_contracts
      add constraint enterprise_contracts_mode_check
      check (contract_mode in ('compatibility','negotiated'));
  end if;
end;
$$;

update public.enterprise_contracts
set contract_mode = 'compatibility', updated_at = now()
where contract_code like 'LEGACY-%'
  and contract_mode <> 'compatibility';

create index if not exists enterprise_contracts_negotiated_current_idx
  on public.enterprise_contracts (organization_id, status, updated_at desc)
  where contract_mode = 'negotiated';

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
begin
  select contract.* into v_contract
  from public.enterprise_contracts as contract
  where contract.contract_mode = 'negotiated'
    and (
      (p_contract_id is not null and contract.id = p_contract_id)
      or (p_stripe_subscription_id is not null and contract.stripe_subscription_id = p_stripe_subscription_id)
      or (
        p_organization_id is not null
        and contract.organization_id = p_organization_id
        and contract.status not in ('expired','terminated')
        and (
          contract.stripe_customer_id is null
          or p_stripe_customer_id is null
          or contract.stripe_customer_id = p_stripe_customer_id
        )
      )
    )
  order by
    case when contract.id = p_contract_id then 0
      when contract.stripe_subscription_id = p_stripe_subscription_id then 1
      else 2
    end,
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
set search_path = public
as $$
declare
  v_contract public.enterprise_contracts%rowtype;
begin
  select contract.* into v_contract
  from public.enterprise_contracts as contract
  where contract.id = p_contract_id
    and contract.contract_mode = 'negotiated';

  if not found then
    return query select 'not_found'::text, p_contract_id, null::uuid, null::text, null::text, null::integer;
    return;
  end if;

  return query
  select result.outcome,
    result.contract_id,
    result.organization_id,
    result.billing_status,
    result.contract_status,
    result.version
  from public.configure_enterprise_contract_billing_atomic(
    p_contract_id,
    p_payment_method,
    p_billing_status,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_stripe_price_id,
    p_external_reference,
    p_payment_due_at,
    p_actor_user_id,
    p_reason
  ) as result;
end;
$$;

revoke all on function public.sync_enterprise_contract_billing_v2_atomic(text, text, uuid, uuid, text, text, text, text, text, boolean, timestamptz, text) from service_role;
revoke all on function public.configure_enterprise_contract_billing_atomic(uuid, text, text, text, text, text, text, timestamptz, uuid, text) from service_role;
revoke all on function public.sync_enterprise_contract_billing_v3_atomic(text, text, uuid, uuid, text, text, text, text, text, boolean, timestamptz, text) from public, anon, authenticated;
revoke all on function public.configure_enterprise_contract_billing_v2_atomic(uuid, text, text, text, text, text, text, timestamptz, uuid, text) from public, anon, authenticated;
grant execute on function public.sync_enterprise_contract_billing_v3_atomic(text, text, uuid, uuid, text, text, text, text, text, boolean, timestamptz, text) to service_role;
grant execute on function public.configure_enterprise_contract_billing_v2_atomic(uuid, text, text, text, text, text, text, timestamptz, uuid, text) to service_role;

notify pgrst, 'reload schema';

commit;
