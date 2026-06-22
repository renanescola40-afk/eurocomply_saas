-- Enterprise audit-chain hardening.
--
-- The original chained RPC serialized appends, but the application-computed hash included
-- id and createdAt values that were not inserted by the RPC. This migration replaces the
-- append function with an id/timestamp-aware contract so the persisted row exactly matches
-- the canonical payload used to compute event_hash.

alter table if exists public.audit_events
  add column if not exists actor_user_id uuid,
  add column if not exists previous_hash text,
  add column if not exists event_hash text,
  add column if not exists hash_algorithm text not null default 'sha256',
  add column if not exists hash_signature text;

drop function if exists public.append_audit_event_chained(uuid, uuid, text, text, text, jsonb, text, text, text, text);

drop function if exists public.append_audit_event_chained(uuid, uuid, uuid, text, text, text, jsonb, timestamptz, text, text, text, text);

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

  -- Serialize append operations for the organization for the lifetime of this transaction.
  perform pg_advisory_xact_lock(hashtext(p_organization_id::text));

  select ae.event_hash
    into v_previous_hash
  from public.audit_events ae
  where ae.organization_id = p_organization_id
    and ae.event_hash is not null
  order by ae.created_at desc, ae.id desc
  limit 1;

  if coalesce(v_previous_hash, '') <> coalesce(p_previous_hash, '') then
    raise exception 'audit chain previous hash mismatch' using errcode = '40001';
  end if;

  insert into public.audit_events (
    id,
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata,
    created_at,
    previous_hash,
    event_hash,
    hash_algorithm,
    hash_signature
  ) values (
    p_id,
    p_organization_id,
    p_actor_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    coalesce(p_metadata, '{}'::jsonb),
    p_created_at,
    v_previous_hash,
    p_event_hash,
    p_hash_algorithm,
    p_hash_signature
  )
  returning * into v_inserted;

  return v_inserted;
end;
$$;

revoke all on function public.append_audit_event_chained(uuid, uuid, uuid, text, text, text, jsonb, timestamptz, text, text, text, text) from public;
revoke all on function public.append_audit_event_chained(uuid, uuid, uuid, text, text, text, jsonb, timestamptz, text, text, text, text) from anon;
revoke all on function public.append_audit_event_chained(uuid, uuid, uuid, text, text, text, jsonb, timestamptz, text, text, text, text) from authenticated;

grant execute on function public.append_audit_event_chained(uuid, uuid, uuid, text, text, text, jsonb, timestamptz, text, text, text, text) to service_role;

comment on function public.append_audit_event_chained(uuid, uuid, uuid, text, text, text, jsonb, timestamptz, text, text, text, text)
  is 'Enterprise append-only audit-chain writer. Uses organization-scoped advisory locking and persists the exact id/created_at payload used for event_hash verification.';
