-- Serialize equal organization/idempotency keys before contract and quota
-- evaluation. This makes retries stable even when the contract or remaining
-- capacity changes after the first operation completed.

begin;

create or replace function public.reserve_organization_seat_idempotent_atomic(
  p_organization_id uuid,
  p_user_id uuid,
  p_role text,
  p_seat_type text,
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_source text default 'api'
)
returns table (
  outcome text,
  membership_id uuid,
  applied_role text,
  applied_seat_type text,
  active_members integer,
  seat_usage integer,
  seat_limit integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_operation public.enterprise_seat_operations%rowtype;
  v_result record;
begin
  if p_organization_id is null
    or p_user_id is null
    or p_actor_user_id is null
    or length(trim(coalesce(p_idempotency_key, ''))) not between 8 and 200 then
    return query select 'invalid_input'::text, null::uuid, null::text, null::text, 0, 0, 0;
    return;
  end if;

  -- Transaction-scoped and tenant-scoped. It contains no secret and is used
  -- only to serialize retries sharing the same public idempotency key.
  perform pg_advisory_xact_lock(
    hashtextextended(p_organization_id::text || ':' || p_idempotency_key, 0)
  );

  select operation.* into v_existing_operation
  from public.enterprise_seat_operations as operation
  where operation.organization_id = p_organization_id
    and operation.idempotency_key = p_idempotency_key;

  if found then
    return query select
      'duplicate'::text,
      v_existing_operation.membership_id,
      null::text,
      v_existing_operation.requested_seat_type,
      coalesce((v_existing_operation.metadata ->> 'active_members')::integer, 0),
      coalesce((v_existing_operation.metadata ->> 'seat_usage')::integer, 0),
      coalesce((v_existing_operation.metadata ->> 'seat_limit')::integer, 0);
    return;
  end if;

  select * into v_result
  from public.reserve_organization_seat_with_pending_atomic(
    p_organization_id,
    p_user_id,
    p_role,
    p_seat_type,
    p_actor_user_id,
    p_idempotency_key,
    p_source
  );

  return query select
    v_result.outcome,
    v_result.membership_id,
    v_result.applied_role,
    v_result.applied_seat_type,
    v_result.active_members,
    v_result.seat_usage,
    v_result.seat_limit;
end;
$$;

revoke all on function public.reserve_organization_seat_idempotent_atomic(uuid, uuid, text, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.reserve_organization_seat_idempotent_atomic(uuid, uuid, text, text, uuid, text, text) to service_role;

-- Backend integrations use the idempotency-hardened entrypoint. The pending
-- wrapper remains callable by database-owned invitation acceptance only.
revoke all on function public.reserve_organization_seat_with_pending_atomic(uuid, uuid, text, text, uuid, text, text) from service_role;

notify pgrst, 'reload schema';

commit;
