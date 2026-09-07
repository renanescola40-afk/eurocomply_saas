-- P0 containment for the 2026-09-07 privileged PostgREST rollback storm.
--
-- Production evidence showed a stale/direct service_role client invoking
-- append_audit_event_chained without traversing the canonical application writer.
-- The client continued retrying the legacy audit-chain conflict contract
-- (SQLSTATE 40001 plus legacy conflict messages) at ~1.8k-2.5k rollbacks/sec.
--
-- Keep successful append semantics and the service_role-only authority boundary
-- unchanged, but emit fail-closed conflict signals that stale generic-retry
-- clients do not classify as retryable.

create or replace function public.append_audit_event_chained(
  p_id uuid,
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_metadata jsonb,
  p_created_at timestamptz,
  p_previous_hash text,
  p_event_hash text,
  p_hash_signature text default null,
  p_hash_algorithm text default 'sha256'
) returns public.audit_events
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_previous_hash text;
  v_inserted public.audit_events;
begin
  if p_id is null then
    raise exception 'id is required' using errcode = '23502';
  end if;
  if p_organization_id is null then
    raise exception 'organization_id is required' using errcode = '23502';
  end if;
  if p_action is null or length(trim(p_action)) = 0 then
    raise exception 'action is required' using errcode = '23502';
  end if;
  if p_entity_type is null or length(trim(p_entity_type)) = 0 then
    raise exception 'entity_type is required' using errcode = '23502';
  end if;
  if p_created_at is null then
    raise exception 'created_at is required' using errcode = '23502';
  end if;
  if p_event_hash is null or length(trim(p_event_hash)) = 0 then
    raise exception 'event_hash is required' using errcode = '23502';
  end if;
  if p_hash_algorithm is null or p_hash_algorithm <> 'sha256' then
    raise exception 'hash_algorithm must be sha256' using errcode = '22023';
  end if;

  -- Fail closed immediately on same-organization lock contention. 55P03 is
  -- intentionally not the legacy retryable 40001 contract.
  if not pg_try_advisory_xact_lock(hashtext(p_organization_id::text)) then
    raise exception 'audit chain write conflict: lock unavailable' using errcode = '55P03';
  end if;

  select ae.event_hash
    into v_previous_hash
  from public.audit_events ae
  where ae.organization_id = p_organization_id
    and ae.event_hash is not null
  order by ae.created_at desc, ae.id desc
  limit 1;

  -- A stale head is a safe rejection. Use a non-40001 signal so stale clients
  -- cannot amplify it through generic serialization-retry loops.
  if coalesce(v_previous_hash, '') <> coalesce(p_previous_hash, '') then
    raise exception 'audit chain write conflict: stale head' using errcode = 'P0001';
  end if;

  insert into public.audit_events (
    id, organization_id, actor_user_id, action, entity_type, entity_id,
    metadata, created_at, previous_hash, event_hash, hash_algorithm, hash_signature
  ) values (
    p_id, p_organization_id, p_actor_user_id, p_action, p_entity_type, p_entity_id,
    coalesce(p_metadata, '{}'::jsonb), p_created_at, v_previous_hash, p_event_hash,
    p_hash_algorithm, p_hash_signature
  )
  returning * into v_inserted;

  return v_inserted;
end;
$$;

revoke all on function public.append_audit_event_chained(uuid,uuid,uuid,text,text,text,jsonb,timestamptz,text,text,text,text)
  from public, anon, authenticated;

grant execute on function public.append_audit_event_chained(uuid,uuid,uuid,text,text,text,jsonb,timestamptz,text,text,text,text)
  to service_role;

comment on function public.append_audit_event_chained(uuid,uuid,uuid,text,text,text,jsonb,timestamptz,text,text,text,text)
  is 'Enterprise append-only audit-chain writer. P0 emergency fail-closed conflict signaling uses non-retryable codes/messages to contain stale generic-retry clients; normal successful append semantics are unchanged.';
