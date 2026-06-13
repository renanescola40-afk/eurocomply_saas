-- Adds a transactional RPC for appending organization-scoped audit-chain events.
--
-- Enterprise rationale:
-- Application-side read-previous-hash + insert can fork the chain under concurrent writes.
-- This function serializes appends per organization with pg_advisory_xact_lock and performs
-- previous_hash lookup plus insert in one database transaction.

create or replace function public.append_audit_event_chained(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_metadata jsonb,
  p_event_hash text,
  p_hash_signature text default null,
  p_hash_algorithm text default 'sha256'
)
returns public.audit_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous_hash text;
  v_inserted public.audit_events;
begin
  if p_organization_id is null then
    raise exception 'organization_id is required' using errcode = '23502';
  end if;

  if p_action is null or length(trim(p_action)) = 0 then
    raise exception 'action is required' using errcode = '23502';
  end if;

  if p_event_hash is null or length(trim(p_event_hash)) = 0 then
    raise exception 'event_hash is required' using errcode = '23502';
  end if;

  if p_hash_algorithm is null or p_hash_algorithm <> 'sha256' then
    raise exception 'hash_algorithm must be sha256' using errcode = '22023';
  end if;

  -- Serialize append operations for the organization for the lifetime of this transaction.
  perform pg_advisory_xact_lock(hashtext(p_organization_id::text));

  select ae.event_hash
    into v_previous_hash
  from public.audit_events ae
  where ae.organization_id = p_organization_id
    and ae.event_hash is not null
  order by ae.created_at desc, ae.id desc
  limit 1;

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata,
    previous_hash,
    event_hash,
    hash_algorithm,
    hash_signature
  ) values (
    p_organization_id,
    p_actor_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    coalesce(p_metadata, '{}'::jsonb),
    v_previous_hash,
    p_event_hash,
    p_hash_algorithm,
    p_hash_signature
  )
  returning * into v_inserted;

  return v_inserted;
end;
$$;

revoke all on function public.append_audit_event_chained(uuid, uuid, text, text, text, jsonb, text, text, text) from public;
revoke all on function public.append_audit_event_chained(uuid, uuid, text, text, text, jsonb, text, text, text) from anon;
revoke all on function public.append_audit_event_chained(uuid, uuid, text, text, text, jsonb, text, text, text) from authenticated;

grant execute on function public.append_audit_event_chained(uuid, uuid, text, text, text, jsonb, text, text, text) to service_role;

comment on function public.append_audit_event_chained(uuid, uuid, text, text, text, jsonb, text, text, text)
  is 'Appends an audit event with organization-scoped advisory locking so previous_hash lookup and insert happen atomically.';
