begin;

create or replace function public.process_enterprise_contract_lifecycle_v3_atomic(
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
    where contract.contract_mode = 'negotiated'
      and contract.status not in ('expired','terminated')
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

      return query select v_contract.id, v_contract.organization_id, v_contract.status, v_next, v_reason;
    end if;
  end loop;
end;
$$;

create or replace function public.process_enterprise_contract_lifecycle_v2_atomic(
  p_batch_size integer default 100
)
returns table (
  contract_id uuid,
  organization_id uuid,
  previous_status text,
  applied_status text,
  reason text
)
language sql
security definer
set search_path = public
as $$
  select *
  from public.process_enterprise_contract_lifecycle_v3_atomic(p_batch_size);
$$;

revoke all on function public.process_enterprise_contract_lifecycle_v3_atomic(integer) from public, anon, authenticated;
revoke all on function public.process_enterprise_contract_lifecycle_v2_atomic(integer) from public, anon, authenticated;
grant execute on function public.process_enterprise_contract_lifecycle_v3_atomic(integer) to service_role;
grant execute on function public.process_enterprise_contract_lifecycle_v2_atomic(integer) to service_role;

notify pgrst, 'reload schema';

commit;
