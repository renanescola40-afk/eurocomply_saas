-- P1 AI-governance integrity: compensate an AI-system reassessment when the
-- cross-cutting audit event cannot be durably persisted.
--
-- The compensation is concurrency-safe: it restores only when the system is
-- still at the exact updated_at produced by the failed-audit reassessment. It
-- also removes only the matching reassessment history snapshot.

create or replace function public.compensate_ai_system_reassessment_audit_failure(
  p_system_id uuid,
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_failed_updated_at timestamptz,
  p_previous jsonb
)
returns table (
  outcome text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current public.ai_systems%rowtype;
begin
  if p_system_id is null
    or p_organization_id is null
    or p_actor_user_id is null
    or p_failed_updated_at is null
    or p_previous is null
    or jsonb_typeof(p_previous) <> 'object'
  then
    return query select 'invalid_input'::text;
    return;
  end if;

  select s.*
    into v_current
  from public.ai_systems as s
  where s.id = p_system_id
    and s.organization_id = p_organization_id
  for update;

  if not found then
    return query select 'not_found'::text;
    return;
  end if;

  if v_current.updated_at is distinct from p_failed_updated_at then
    return query select 'state_changed'::text;
    return;
  end if;

  update public.ai_systems as s
  set
    name = p_previous ->> 'name',
    owner_team = nullif(p_previous ->> 'owner_team', ''),
    category = nullif(p_previous ->> 'category', ''),
    country_market = nullif(p_previous ->> 'country_market', ''),
    processed_data = nullif(p_previous ->> 'processed_data', ''),
    vendor_name = nullif(p_previous ->> 'vendor_name', ''),
    model_name = nullif(p_previous ->> 'model_name', ''),
    use_case = p_previous ->> 'use_case',
    role = p_previous ->> 'role',
    lifecycle_status = p_previous ->> 'lifecycle_status',
    risk_domain = p_previous ->> 'risk_domain',
    uses_personal_data = (p_previous ->> 'uses_personal_data')::boolean,
    interacts_with_people = (p_previous ->> 'interacts_with_people')::boolean,
    generates_content = (p_previous ->> 'generates_content')::boolean,
    biometric_identification = (p_previous ->> 'biometric_identification')::boolean,
    manipulative_or_exploitative = (p_previous ->> 'manipulative_or_exploitative')::boolean,
    risk_level = p_previous ->> 'risk_level',
    classification_summary = p_previous ->> 'classification_summary',
    obligations = coalesce(p_previous -> 'obligations', '[]'::jsonb),
    next_actions = coalesce(p_previous -> 'next_actions', '[]'::jsonb),
    last_reassessed_at = nullif(p_previous ->> 'last_reassessed_at', '')::timestamptz,
    updated_at = (p_previous ->> 'updated_at')::timestamptz
  where s.id = p_system_id
    and s.organization_id = p_organization_id
    and s.updated_at is not distinct from p_failed_updated_at;

  if not found then
    return query select 'state_changed'::text;
    return;
  end if;

  delete from public.ai_system_history as h
  where h.ai_system_id = p_system_id
    and h.organization_id = p_organization_id
    and h.actor_user_id = p_actor_user_id
    and h.action = 'reassessed'
    and (h.snapshot ->> 'updatedAt')::timestamptz is not distinct from p_failed_updated_at;

  return query select 'restored'::text;
end;
$$;

revoke all on function public.compensate_ai_system_reassessment_audit_failure(uuid, uuid, uuid, timestamptz, jsonb) from public;
revoke all on function public.compensate_ai_system_reassessment_audit_failure(uuid, uuid, uuid, timestamptz, jsonb) from anon;
revoke all on function public.compensate_ai_system_reassessment_audit_failure(uuid, uuid, uuid, timestamptz, jsonb) from authenticated;
grant execute on function public.compensate_ai_system_reassessment_audit_failure(uuid, uuid, uuid, timestamptz, jsonb) to service_role;

notify pgrst, 'reload schema';
