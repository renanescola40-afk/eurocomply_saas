-- P1 AI-governance integrity: serialize reassessments and persist the updated
-- system plus its reassessment snapshot in one database transaction.
--
-- This RPC is backend-only. The Next.js route performs authentication,
-- organization resolution, RBAC, trusted-mutation, rate-limit and payload
-- validation before invoking it with the service-role client.

create or replace function public.reassess_ai_system_atomic(
  p_system_id uuid,
  p_organization_id uuid,
  p_expected_updated_at timestamptz,
  p_actor_user_id uuid,
  p_patch jsonb
)
returns table (
  outcome text,
  system jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current public.ai_systems%rowtype;
  v_updated public.ai_systems%rowtype;
begin
  if p_system_id is null
    or p_organization_id is null
    or p_expected_updated_at is null
    or p_actor_user_id is null
    or p_patch is null
    or jsonb_typeof(p_patch) <> 'object'
  then
    return query select 'invalid_input'::text, null::jsonb;
    return;
  end if;

  if jsonb_typeof(p_patch -> 'name') <> 'string'
    or nullif(trim(p_patch ->> 'name'), '') is null
    or jsonb_typeof(p_patch -> 'use_case') <> 'string'
    or nullif(trim(p_patch ->> 'use_case'), '') is null
    or jsonb_typeof(p_patch -> 'role') <> 'string'
    or jsonb_typeof(p_patch -> 'lifecycle_status') <> 'string'
    or jsonb_typeof(p_patch -> 'risk_domain') <> 'string'
    or jsonb_typeof(p_patch -> 'risk_level') <> 'string'
    or jsonb_typeof(p_patch -> 'classification_summary') <> 'string'
    or jsonb_typeof(p_patch -> 'uses_personal_data') <> 'boolean'
    or jsonb_typeof(p_patch -> 'interacts_with_people') <> 'boolean'
    or jsonb_typeof(p_patch -> 'generates_content') <> 'boolean'
    or jsonb_typeof(p_patch -> 'biometric_identification') <> 'boolean'
    or jsonb_typeof(p_patch -> 'manipulative_or_exploitative') <> 'boolean'
    or jsonb_typeof(p_patch -> 'obligations') <> 'array'
    or jsonb_typeof(p_patch -> 'next_actions') <> 'array'
  then
    return query select 'invalid_input'::text, null::jsonb;
    return;
  end if;

  select s.*
    into v_current
  from public.ai_systems as s
  where s.id = p_system_id
    and s.organization_id = p_organization_id
  for update;

  if not found then
    return query select 'not_found'::text, null::jsonb;
    return;
  end if;

  if v_current.updated_at is distinct from p_expected_updated_at then
    return query select 'state_changed'::text, null::jsonb;
    return;
  end if;

  update public.ai_systems as s
  set
    name = trim(p_patch ->> 'name'),
    owner_team = nullif(trim(coalesce(p_patch ->> 'owner_team', '')), ''),
    category = nullif(trim(coalesce(p_patch ->> 'category', '')), ''),
    country_market = nullif(trim(coalesce(p_patch ->> 'country_market', '')), ''),
    processed_data = nullif(trim(coalesce(p_patch ->> 'processed_data', '')), ''),
    vendor_name = nullif(trim(coalesce(p_patch ->> 'vendor_name', '')), ''),
    model_name = nullif(trim(coalesce(p_patch ->> 'model_name', '')), ''),
    use_case = trim(p_patch ->> 'use_case'),
    role = lower(trim(p_patch ->> 'role')),
    lifecycle_status = lower(trim(p_patch ->> 'lifecycle_status')),
    risk_domain = trim(p_patch ->> 'risk_domain'),
    uses_personal_data = (p_patch ->> 'uses_personal_data')::boolean,
    interacts_with_people = (p_patch ->> 'interacts_with_people')::boolean,
    generates_content = (p_patch ->> 'generates_content')::boolean,
    biometric_identification = (p_patch ->> 'biometric_identification')::boolean,
    manipulative_or_exploitative = (p_patch ->> 'manipulative_or_exploitative')::boolean,
    risk_level = lower(trim(p_patch ->> 'risk_level')),
    classification_summary = p_patch ->> 'classification_summary',
    obligations = p_patch -> 'obligations',
    next_actions = p_patch -> 'next_actions',
    last_reassessed_at = now()
  where s.id = p_system_id
    and s.organization_id = p_organization_id
    and s.updated_at is not distinct from p_expected_updated_at
  returning s.* into v_updated;

  if not found then
    return query select 'state_changed'::text, null::jsonb;
    return;
  end if;

  insert into public.ai_system_history (
    ai_system_id,
    organization_id,
    actor_user_id,
    action,
    snapshot
  ) values (
    v_updated.id,
    v_updated.organization_id,
    p_actor_user_id,
    'reassessed',
    jsonb_build_object(
      'name', v_updated.name,
      'riskLevel', v_updated.risk_level,
      'lifecycleStatus', v_updated.lifecycle_status,
      'riskDomain', v_updated.risk_domain,
      'updatedAt', v_updated.updated_at
    )
  );

  return query select 'updated'::text, to_jsonb(v_updated);
end;
$$;

revoke all on function public.reassess_ai_system_atomic(uuid, uuid, timestamptz, uuid, jsonb) from public;
revoke all on function public.reassess_ai_system_atomic(uuid, uuid, timestamptz, uuid, jsonb) from anon;
revoke all on function public.reassess_ai_system_atomic(uuid, uuid, timestamptz, uuid, jsonb) from authenticated;
grant execute on function public.reassess_ai_system_atomic(uuid, uuid, timestamptz, uuid, jsonb) to service_role;

notify pgrst, 'reload schema';
