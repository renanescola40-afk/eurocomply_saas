-- Creates an AI incident and its audit-chain event in one transaction.
-- The application computes the event hash from the previous hash it observed;
-- this function serializes writes per organization and rejects stale hashes.

create or replace function public.create_ai_incident_with_audit_atomic(
  p_incident_id uuid,
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_ai_system_id uuid,
  p_title text,
  p_summary text,
  p_category text,
  p_severity text,
  p_detected_at timestamptz,
  p_report_status text,
  p_authority text,
  p_internal_owner text,
  p_deadline_plan jsonb,
  p_next_actions jsonb,
  p_audit_id uuid,
  p_audit_metadata jsonb,
  p_audit_created_at timestamptz,
  p_previous_hash text,
  p_event_hash text,
  p_hash_signature text default null
)
returns table(outcome text, incident jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous_hash text;
  v_incident public.ai_incidents;
begin
  if p_incident_id is null or p_organization_id is null or p_actor_user_id is null or p_audit_id is null then
    return query select 'invalid_input'::text, null::jsonb;
    return;
  end if;

  if length(trim(coalesce(p_title, ''))) = 0
    or length(trim(coalesce(p_summary, ''))) = 0
    or p_event_hash !~ '^[0-9a-f]{64}$'
    or (p_previous_hash is not null and p_previous_hash !~ '^[0-9a-f]{64}$')
    or (p_hash_signature is not null and p_hash_signature !~ '^[0-9a-f]{64}$') then
    return query select 'invalid_input'::text, null::jsonb;
    return;
  end if;

  if p_ai_system_id is not null and not exists (
    select 1
    from public.ai_systems s
    where s.id = p_ai_system_id
      and s.organization_id = p_organization_id
  ) then
    return query select 'invalid_ai_system'::text, null::jsonb;
    return;
  end if;

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

  insert into public.ai_incidents (
    id,
    organization_id,
    ai_system_id,
    title,
    summary,
    category,
    severity,
    detected_at,
    report_status,
    authority,
    internal_owner,
    deadline_plan,
    next_actions,
    created_by
  ) values (
    p_incident_id,
    p_organization_id,
    p_ai_system_id,
    p_title,
    p_summary,
    p_category,
    p_severity,
    p_detected_at,
    p_report_status,
    p_authority,
    p_internal_owner,
    coalesce(p_deadline_plan, '[]'::jsonb),
    coalesce(p_next_actions, '[]'::jsonb),
    p_actor_user_id
  )
  returning * into v_incident;

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
    p_audit_id,
    p_organization_id,
    p_actor_user_id,
    'ai_incident_created',
    'ai_incident',
    p_incident_id::text,
    coalesce(p_audit_metadata, '{}'::jsonb),
    p_audit_created_at,
    v_previous_hash,
    p_event_hash,
    'sha256',
    p_hash_signature
  );

  return query select 'created'::text, to_jsonb(v_incident);
end;
$$;

revoke all on function public.create_ai_incident_with_audit_atomic(uuid, uuid, uuid, uuid, text, text, text, text, timestamptz, text, text, text, jsonb, jsonb, uuid, jsonb, timestamptz, text, text, text) from public;
revoke all on function public.create_ai_incident_with_audit_atomic(uuid, uuid, uuid, uuid, text, text, text, text, timestamptz, text, text, text, jsonb, jsonb, uuid, jsonb, timestamptz, text, text, text) from anon;
revoke all on function public.create_ai_incident_with_audit_atomic(uuid, uuid, uuid, uuid, text, text, text, text, timestamptz, text, text, text, jsonb, jsonb, uuid, jsonb, timestamptz, text, text, text) from authenticated;
grant execute on function public.create_ai_incident_with_audit_atomic(uuid, uuid, uuid, uuid, text, text, text, text, timestamptz, text, text, text, jsonb, jsonb, uuid, jsonb, timestamptz, text, text, text) to service_role;

comment on function public.create_ai_incident_with_audit_atomic(uuid, uuid, uuid, uuid, text, text, text, text, timestamptz, text, text, text, jsonb, jsonb, uuid, jsonb, timestamptz, text, text, text)
  is 'Creates one AI incident and its chained audit event atomically with organization-scoped serialization.';
