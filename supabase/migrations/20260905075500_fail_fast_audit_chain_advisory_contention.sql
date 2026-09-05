begin;

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

  -- Same-organization contention is retriable. Fail fast instead of holding
  -- a PostgREST worker on an advisory lock while burst proofs are active.
  if not pg_try_advisory_xact_lock(hashtext(p_organization_id::text)) then
    raise exception 'audit chain append contention' using errcode = '40001';
  end if;

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

notify pgrst, 'reload schema';

commit;
