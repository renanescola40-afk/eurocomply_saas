begin;

alter table public.enterprise_contracts
  add column if not exists payment_method text not null default 'manual_invoice',
  add column if not exists billing_status text not null default 'unlinked',
  add column if not exists external_invoice_reference text,
  add column if not exists payment_failed_at timestamptz,
  add column if not exists payment_due_at timestamptz,
  add column if not exists last_paid_at timestamptz,
  add column if not exists read_only_at timestamptz,
  add column if not exists dunning_stage integer not null default 0,
  add column if not exists last_billing_event_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'enterprise_contracts_payment_method_check'
  ) then
    alter table public.enterprise_contracts
      add constraint enterprise_contracts_payment_method_check
      check (payment_method in ('stripe_subscription','stripe_invoice','bank_transfer','manual_invoice'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'enterprise_contracts_billing_status_check'
  ) then
    alter table public.enterprise_contracts
      add constraint enterprise_contracts_billing_status_check
      check (billing_status in ('unlinked','pending','active','paid','past_due','manual_invoice','canceled','failed'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'enterprise_contracts_dunning_stage_check'
  ) then
    alter table public.enterprise_contracts
      add constraint enterprise_contracts_dunning_stage_check
      check (dunning_stage between 0 and 10);
  end if;
end;
$$;

create index if not exists enterprise_contracts_billing_due_idx
  on public.enterprise_contracts (status, payment_due_at)
  where status in ('past_due','grace_period');
create index if not exists enterprise_contracts_stripe_subscription_idx
  on public.enterprise_contracts (stripe_subscription_id)
  where stripe_subscription_id is not null;
create index if not exists enterprise_contracts_stripe_customer_idx
  on public.enterprise_contracts (stripe_customer_id)
  where stripe_customer_id is not null;

create table if not exists public.enterprise_contract_billing_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_id uuid not null references public.enterprise_contracts(id) on delete cascade,
  event_type text not null check (char_length(event_type) between 3 and 120),
  billing_status text not null,
  previous_contract_status text,
  applied_contract_status text,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_invoice_id text,
  external_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint enterprise_contract_billing_events_status_check check (
    billing_status in ('unlinked','pending','active','paid','past_due','manual_invoice','canceled','failed')
  )
);

create index if not exists enterprise_contract_billing_events_contract_idx
  on public.enterprise_contract_billing_events (contract_id, created_at desc);

alter table public.enterprise_contract_billing_events enable row level security;
alter table public.enterprise_contract_billing_events force row level security;
revoke all on public.enterprise_contract_billing_events from public, anon, authenticated;
grant all on public.enterprise_contract_billing_events to service_role;

create or replace function public.sync_enterprise_contract_billing_atomic(
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
  v_event_type text := lower(trim(coalesce(p_event_type, '')));
  v_stripe_status text := lower(trim(coalesce(p_stripe_status, '')));
  v_billing_status text;
  v_next_status text;
  v_existing_event public.enterprise_contract_billing_events%rowtype;
  v_due_at timestamptz;
begin
  if char_length(trim(coalesce(p_event_id, ''))) < 3
    or char_length(v_event_type) < 3 then
    return query select 'invalid_input'::text, false, null::uuid, null::uuid, null::text, null::text, null::text, null::integer;
    return;
  end if;

  select billing_event.* into v_existing_event
  from public.enterprise_contract_billing_events as billing_event
  where billing_event.stripe_event_id = p_event_id;

  if found then
    select contract.* into v_contract
    from public.enterprise_contracts as contract
    where contract.id = v_existing_event.contract_id;

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

  select contract.* into v_contract
  from public.enterprise_contracts as contract
  where (
      p_contract_id is not null
      and contract.id = p_contract_id
      and (p_organization_id is null or contract.organization_id = p_organization_id)
    ) or (
      p_stripe_subscription_id is not null
      and contract.stripe_subscription_id = p_stripe_subscription_id
    ) or (
      p_organization_id is not null
      and contract.organization_id = p_organization_id
      and contract.status not in ('expired','terminated')
      and (
        contract.stripe_customer_id is null
        or p_stripe_customer_id is null
        or contract.stripe_customer_id = p_stripe_customer_id
      )
    )
  order by
    case when contract.id = p_contract_id then 0
      when contract.stripe_subscription_id = p_stripe_subscription_id then 1
      else 2
    end,
    contract.updated_at desc
  limit 1
  for update;

  if not found then
    return query select 'not_enterprise'::text, false, null::uuid, p_organization_id, null::text, null::text, null::text, null::integer;
    return;
  end if;

  if v_contract.stripe_customer_id is not null
    and p_stripe_customer_id is not null
    and v_contract.stripe_customer_id <> p_stripe_customer_id then
    return query select 'binding_conflict'::text, true, v_contract.id, v_contract.organization_id, v_contract.status, v_contract.status, v_contract.billing_status, v_contract.version;
    return;
  end if;

  if v_contract.stripe_subscription_id is not null
    and p_stripe_subscription_id is not null
    and v_contract.stripe_subscription_id <> p_stripe_subscription_id then
    return query select 'binding_conflict'::text, true, v_contract.id, v_contract.organization_id, v_contract.status, v_contract.status, v_contract.billing_status, v_contract.version;
    return;
  end if;

  v_next_status := v_contract.status;
  v_billing_status := v_contract.billing_status;
  v_due_at := p_payment_due_at;

  if v_event_type in ('customer.subscription.created','customer.subscription.updated') then
    v_billing_status := case
      when v_stripe_status in ('active','trialing') then 'active'
      when v_stripe_status in ('past_due','unpaid','incomplete','incomplete_expired','paused') then 'past_due'
      when v_stripe_status = 'canceled' then 'canceled'
      else 'pending'
    end;

    if v_billing_status = 'active' and v_contract.status in ('pending_activation','past_due','grace_period','read_only') then
      v_next_status := 'active';
    elsif v_billing_status = 'past_due' and v_contract.status = 'active' then
      v_next_status := 'past_due';
      v_due_at := coalesce(v_due_at, now() + make_interval(days => v_contract.payment_terms_days));
    end if;
  elsif v_event_type = 'customer.subscription.deleted' then
    v_billing_status := 'canceled';
  elsif v_event_type in ('invoice.paid','invoice.payment_succeeded') or p_invoice_paid is true then
    v_billing_status := 'paid';
    if v_contract.status in ('pending_activation','past_due','grace_period','read_only') then
      v_next_status := 'active';
    end if;
  elsif v_event_type = 'invoice.payment_failed' then
    v_billing_status := 'past_due';
    if v_contract.status = 'active' then v_next_status := 'past_due'; end if;
    v_due_at := coalesce(v_due_at, now() + make_interval(days => v_contract.payment_terms_days));
  end if;

  update public.enterprise_contracts as contract
  set
    payment_method = case
      when p_stripe_subscription_id is not null then 'stripe_subscription'
      when p_stripe_invoice_id is not null then 'stripe_invoice'
      else contract.payment_method
    end,
    billing_status = v_billing_status,
    stripe_customer_id = coalesce(contract.stripe_customer_id, nullif(trim(coalesce(p_stripe_customer_id, '')), '')),
    stripe_subscription_id = coalesce(contract.stripe_subscription_id, nullif(trim(coalesce(p_stripe_subscription_id, '')), '')),
    stripe_price_id = coalesce(nullif(trim(coalesce(p_stripe_price_id, '')), ''), contract.stripe_price_id),
    latest_stripe_invoice_id = coalesce(nullif(trim(coalesce(p_stripe_invoice_id, '')), ''), contract.latest_stripe_invoice_id),
    external_invoice_reference = coalesce(nullif(trim(coalesce(p_external_reference, '')), ''), contract.external_invoice_reference),
    payment_failed_at = case when v_billing_status = 'past_due' then coalesce(contract.payment_failed_at, now()) else null end,
    payment_due_at = case when v_billing_status = 'past_due' then v_due_at else null end,
    last_paid_at = case when v_billing_status = 'paid' then now() else contract.last_paid_at end,
    read_only_at = case when v_next_status = 'active' then null else contract.read_only_at end,
    dunning_stage = case when v_billing_status in ('active','paid') then 0 when v_billing_status = 'past_due' then greatest(contract.dunning_stage, 1) else contract.dunning_stage end,
    last_billing_event_id = p_event_id,
    status = v_next_status,
    version = case when contract.status is distinct from v_next_status or contract.billing_status is distinct from v_billing_status then contract.version + 1 else contract.version end,
    updated_at = now()
  where contract.id = v_contract.id
  returning * into v_contract;

  insert into public.enterprise_contract_billing_events (
    stripe_event_id,
    organization_id,
    contract_id,
    event_type,
    billing_status,
    previous_contract_status,
    applied_contract_status,
    stripe_customer_id,
    stripe_subscription_id,
    stripe_invoice_id,
    external_reference,
    metadata
  ) values (
    p_event_id,
    v_contract.organization_id,
    v_contract.id,
    v_event_type,
    v_billing_status,
    (select status from public.enterprise_contracts where id = v_contract.id),
    v_next_status,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_stripe_invoice_id,
    p_external_reference,
    jsonb_build_object('stripe_status', nullif(v_stripe_status, ''), 'payment_due_at', v_due_at)
  );

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    v_contract.organization_id,
    null,
    'enterprise.contract_billing_synced',
    'enterprise_contract',
    v_contract.id::text,
    jsonb_build_object(
      'event_id', p_event_id,
      'event_type', v_event_type,
      'billing_status', v_billing_status,
      'previous_status', v_contract.status,
      'applied_status', v_next_status,
      'payment_due_at', v_due_at
    )
  );

  return query select
    'synced'::text,
    true,
    v_contract.id,
    v_contract.organization_id,
    v_contract.status,
    v_next_status,
    v_billing_status,
    v_contract.version;
end;
$$;

create or replace function public.configure_enterprise_contract_billing_atomic(
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
  v_method text := lower(trim(coalesce(p_payment_method, '')));
  v_billing text := lower(trim(coalesce(p_billing_status, '')));
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if p_contract_id is null
    or p_actor_user_id is null
    or v_method not in ('stripe_subscription','stripe_invoice','bank_transfer','manual_invoice')
    or v_billing not in ('unlinked','pending','active','paid','past_due','manual_invoice','canceled','failed')
    or char_length(v_reason) not between 5 and 1000 then
    return query select 'invalid_input'::text, p_contract_id, null::uuid, null::text, null::text, null::integer;
    return;
  end if;

  if not exists (
    select 1 from public.platform_admin_users as actor
    where actor.user_id = p_actor_user_id
      and actor.enabled = true
      and actor.role in ('owner','sales_admin','platform_owner','platform_admin','platform_billing')
  ) then
    return query select 'platform_role_required'::text, p_contract_id, null::uuid, null::text, null::text, null::integer;
    return;
  end if;

  select contract.* into v_contract
  from public.enterprise_contracts as contract
  where contract.id = p_contract_id
  for update;

  if not found then
    return query select 'not_found'::text, p_contract_id, null::uuid, null::text, null::text, null::integer;
    return;
  end if;

  update public.enterprise_contracts as contract
  set
    payment_method = v_method,
    billing_status = v_billing,
    stripe_customer_id = nullif(trim(coalesce(p_stripe_customer_id, '')), ''),
    stripe_subscription_id = nullif(trim(coalesce(p_stripe_subscription_id, '')), ''),
    stripe_price_id = nullif(trim(coalesce(p_stripe_price_id, '')), ''),
    external_invoice_reference = nullif(trim(coalesce(p_external_reference, '')), ''),
    payment_due_at = p_payment_due_at,
    payment_failed_at = case when v_billing = 'past_due' then coalesce(contract.payment_failed_at, now()) else null end,
    last_paid_at = case when v_billing = 'paid' then now() else contract.last_paid_at end,
    dunning_stage = case when v_billing = 'past_due' then greatest(contract.dunning_stage, 1) when v_billing in ('paid','active') then 0 else contract.dunning_stage end,
    version = contract.version + 1,
    updated_by = p_actor_user_id,
    updated_at = now()
  where contract.id = v_contract.id
  returning * into v_contract;

  insert into public.enterprise_contract_billing_events (
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
    v_contract.status,
    v_contract.status,
    v_contract.stripe_customer_id,
    v_contract.stripe_subscription_id,
    v_contract.external_invoice_reference,
    jsonb_build_object('payment_method', v_method, 'reason', v_reason, 'payment_due_at', p_payment_due_at)
  );

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    v_contract.organization_id,
    p_actor_user_id,
    'enterprise.contract_billing_configured',
    'enterprise_contract',
    v_contract.id::text,
    jsonb_build_object('payment_method', v_method, 'billing_status', v_billing, 'reason', v_reason)
  );

  return query select 'configured'::text, v_contract.id, v_contract.organization_id, v_contract.billing_status, v_contract.status, v_contract.version;
end;
$$;

create or replace function public.process_enterprise_contract_lifecycle_atomic(
  p_batch_size integer default 100
)
returns table (
  contract_id uuid,
  organization_id uuid,
  previous_status text,
  applied_status text,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.enterprise_contracts%rowtype;
  v_next text;
  v_reason text;
begin
  if p_batch_size < 1 or p_batch_size > 500 then
    raise exception 'invalid_batch_size';
  end if;

  for v_contract in
    select contract.*
    from public.enterprise_contracts as contract
    where contract.status not in ('expired','terminated')
      and (
        (contract.ends_at is not null and contract.ends_at <= now())
        or (contract.status = 'pending_activation' and contract.starts_at <= now() and contract.billing_status in ('active','paid','manual_invoice'))
        or (contract.status = 'past_due' and contract.payment_due_at is not null and contract.payment_due_at <= now())
        or (contract.status = 'grace_period' and contract.payment_due_at is not null and contract.payment_due_at + make_interval(days => contract.grace_period_days) <= now())
      )
    order by coalesce(contract.payment_due_at, contract.ends_at, contract.starts_at), contract.id
    for update skip locked
    limit p_batch_size
  loop
    v_next := v_contract.status;
    v_reason := null;

    if v_contract.ends_at is not null and v_contract.ends_at <= now() then
      v_next := 'expired';
      v_reason := 'contract_end_reached';
    elsif v_contract.status = 'pending_activation'
      and v_contract.starts_at <= now()
      and v_contract.billing_status in ('active','paid','manual_invoice') then
      v_next := 'active';
      v_reason := 'contract_start_and_billing_ready';
    elsif v_contract.status = 'past_due'
      and v_contract.payment_due_at is not null
      and v_contract.payment_due_at <= now() then
      v_next := 'grace_period';
      v_reason := 'payment_due_date_reached';
    elsif v_contract.status = 'grace_period'
      and v_contract.payment_due_at is not null
      and v_contract.payment_due_at + make_interval(days => v_contract.grace_period_days) <= now() then
      v_next := 'read_only';
      v_reason := 'grace_period_exhausted';
    end if;

    if v_next is distinct from v_contract.status
      and public.is_valid_enterprise_contract_transition(v_contract.status, v_next) then
      update public.enterprise_contracts as contract
      set
        status = v_next,
        read_only_at = case when v_next = 'read_only' then now() else contract.read_only_at end,
        dunning_stage = case when v_next = 'grace_period' then greatest(contract.dunning_stage, 2) when v_next = 'read_only' then greatest(contract.dunning_stage, 3) else contract.dunning_stage end,
        version = contract.version + 1,
        updated_at = now()
      where contract.id = v_contract.id;

      insert into public.audit_logs (
        organization_id,
        actor_user_id,
        action,
        entity_type,
        entity_id,
        metadata
      ) values (
        v_contract.organization_id,
        null,
        'enterprise.contract_lifecycle_advanced',
        'enterprise_contract',
        v_contract.id::text,
        jsonb_build_object('previous_status', v_contract.status, 'next_status', v_next, 'reason', v_reason)
      );

      return next (v_contract.id, v_contract.organization_id, v_contract.status, v_next, v_reason);
    end if;
  end loop;
end;
$$;

revoke all on function public.sync_enterprise_contract_billing_atomic(text, text, uuid, uuid, text, text, text, text, text, boolean, timestamptz, text) from public, anon, authenticated;
revoke all on function public.configure_enterprise_contract_billing_atomic(uuid, text, text, text, text, text, text, timestamptz, uuid, text) from public, anon, authenticated;
revoke all on function public.process_enterprise_contract_lifecycle_atomic(integer) from public, anon, authenticated;
grant execute on function public.sync_enterprise_contract_billing_atomic(text, text, uuid, uuid, text, text, text, text, text, boolean, timestamptz, text) to service_role;
grant execute on function public.configure_enterprise_contract_billing_atomic(uuid, text, text, text, text, text, text, timestamptz, uuid, text) to service_role;
grant execute on function public.process_enterprise_contract_lifecycle_atomic(integer) to service_role;

notify pgrst, 'reload schema';

commit;
