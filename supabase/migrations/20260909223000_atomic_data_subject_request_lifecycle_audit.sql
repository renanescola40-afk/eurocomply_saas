begin;

-- A GDPR rights lifecycle transition and its audit-chain append are one logical
-- security event. Keep both writes in the same PostgreSQL transaction so an
-- audit append failure can never leave an unaudited lifecycle mutation behind.
create or replace function public.update_data_subject_request_with_audit_atomic(
  p_request_id uuid,
  p_organization_id uuid,
  p_expected_status text,
  p_expected_updated_at timestamptz,
  p_patch jsonb,
  p_audit_id uuid,
  p_actor_user_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_metadata jsonb,
  p_audit_created_at timestamptz,
  p_previous_hash text,
  p_event_hash text,
  p_hash_signature text default null,
  p_hash_algorithm text default 'sha256'
) returns public.data_subject_requests
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_updated public.data_subject_requests;
  v_key text;
  v_next_updated_at timestamptz;
begin
  if p_request_id is null or p_organization_id is null then
    raise exception 'request_id and organization_id are required' using errcode = '23502';
  end if;

  if p_expected_status is null or length(trim(p_expected_status)) = 0 or p_expected_updated_at is null then
    raise exception 'expected lifecycle version is required' using errcode = '22023';
  end if;

  if p_expected_status in ('completed', 'rejected', 'cancelled') then
    raise exception 'data subject request state conflict' using errcode = 'P0001';
  end if;

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'lifecycle patch must be a json object' using errcode = '22023';
  end if;

  for v_key in select jsonb_object_keys(p_patch)
  loop
    if v_key not in (
      'status',
      'identity_verification_state',
      'identity_verification_requested_at',
      'identity_verified_at',
      'role_route',
      'customer_controller_reference',
      'extension_reason',
      'extension_notified_at',
      'extended_due_at',
      'due_at',
      'decision',
      'decision_reason',
      'evidence_refs',
      'completed_at',
      'resolution_summary',
      'updated_at'
    ) then
      raise exception 'unsupported lifecycle patch field: %', v_key using errcode = '22023';
    end if;
  end loop;

  if not (p_patch ? 'updated_at') then
    raise exception 'updated_at lifecycle version is required' using errcode = '22023';
  end if;

  v_next_updated_at := (p_patch->>'updated_at')::timestamptz;
  if v_next_updated_at is null or v_next_updated_at <= p_expected_updated_at then
    raise exception 'updated_at lifecycle version must advance' using errcode = '22023';
  end if;

  -- Bind the audit record to the exact domain mutation performed by this RPC.
  if p_action <> 'gdpr_rights_request_lifecycle_changed'
     or p_entity_type <> 'data_subject_request'
     or p_entity_id is distinct from p_request_id::text then
    raise exception 'invalid lifecycle audit binding' using errcode = '22023';
  end if;

  update public.data_subject_requests as dsr
  set
    status = case when p_patch ? 'status' then p_patch->>'status' else dsr.status end,
    identity_verification_state = case when p_patch ? 'identity_verification_state' then p_patch->>'identity_verification_state' else dsr.identity_verification_state end,
    identity_verification_requested_at = case when p_patch ? 'identity_verification_requested_at' then (p_patch->>'identity_verification_requested_at')::timestamptz else dsr.identity_verification_requested_at end,
    identity_verified_at = case when p_patch ? 'identity_verified_at' then (p_patch->>'identity_verified_at')::timestamptz else dsr.identity_verified_at end,
    role_route = case when p_patch ? 'role_route' then p_patch->>'role_route' else dsr.role_route end,
    customer_controller_reference = case when p_patch ? 'customer_controller_reference' then p_patch->>'customer_controller_reference' else dsr.customer_controller_reference end,
    extension_reason = case when p_patch ? 'extension_reason' then p_patch->>'extension_reason' else dsr.extension_reason end,
    extension_notified_at = case when p_patch ? 'extension_notified_at' then (p_patch->>'extension_notified_at')::timestamptz else dsr.extension_notified_at end,
    extended_due_at = case when p_patch ? 'extended_due_at' then (p_patch->>'extended_due_at')::timestamptz else dsr.extended_due_at end,
    due_at = case when p_patch ? 'due_at' then (p_patch->>'due_at')::timestamptz else dsr.due_at end,
    decision = case when p_patch ? 'decision' then p_patch->>'decision' else dsr.decision end,
    decision_reason = case when p_patch ? 'decision_reason' then p_patch->>'decision_reason' else dsr.decision_reason end,
    evidence_refs = case when p_patch ? 'evidence_refs' then p_patch->'evidence_refs' else dsr.evidence_refs end,
    completed_at = case when p_patch ? 'completed_at' then (p_patch->>'completed_at')::timestamptz else dsr.completed_at end,
    resolution_summary = case when p_patch ? 'resolution_summary' then p_patch->>'resolution_summary' else dsr.resolution_summary end,
    updated_at = v_next_updated_at
  where dsr.id = p_request_id
    and dsr.organization_id = p_organization_id
    and dsr.status = p_expected_status
    and dsr.updated_at = p_expected_updated_at
  returning dsr.* into v_updated;

  if not found then
    raise exception 'data subject request state conflict' using errcode = 'P0001';
  end if;

  -- append_audit_event_chained uses an xact-scoped organization lock and raises
  -- on stale-head/contention. Because this call is inside this function's same
  -- transaction, any such error rolls back the lifecycle UPDATE above.
  perform public.append_audit_event_chained(
    p_audit_id,
    p_organization_id,
    p_actor_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    coalesce(p_metadata, '{}'::jsonb),
    p_audit_created_at,
    p_previous_hash,
    p_event_hash,
    p_hash_signature,
    p_hash_algorithm
  );

  return v_updated;
end;
$$;

revoke all on function public.update_data_subject_request_with_audit_atomic(
  uuid,uuid,text,timestamptz,jsonb,uuid,uuid,text,text,text,jsonb,timestamptz,text,text,text,text
) from public, anon, authenticated;

grant execute on function public.update_data_subject_request_with_audit_atomic(
  uuid,uuid,text,timestamptz,jsonb,uuid,uuid,text,text,text,jsonb,timestamptz,text,text,text,text
) to service_role;

comment on function public.update_data_subject_request_with_audit_atomic(
  uuid,uuid,text,timestamptz,jsonb,uuid,uuid,text,text,text,jsonb,timestamptz,text,text,text,text
) is 'Service-role-only GDPR lifecycle CAS plus canonical audit-chain append in one PostgreSQL transaction. Audit failure aborts and rolls back the lifecycle mutation.';

commit;
