begin;

create or replace function public.create_ai_system_atomic(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_system jsonb
)
returns table (outcome text, system jsonb)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_created public.ai_systems%rowtype;
  v_plan text;
  v_limit integer;
  v_count integer := 0;
begin
  if p_organization_id is null or p_actor_user_id is null or p_system is null or jsonb_typeof(p_system) <> 'object' then
    return query select 'invalid_input'::text, null::jsonb; return;
  end if;

  if jsonb_typeof(p_system -> 'name') <> 'string'
    or nullif(trim(p_system ->> 'name'), '') is null
    or jsonb_typeof(p_system -> 'use_case') <> 'string'
    or nullif(trim(p_system ->> 'use_case'), '') is null
    or jsonb_typeof(p_system -> 'role') <> 'string'
    or jsonb_typeof(p_system -> 'lifecycle_status') <> 'string'
    or jsonb_typeof(p_system -> 'risk_domain') <> 'string'
    or jsonb_typeof(p_system -> 'risk_level') <> 'string'
    or jsonb_typeof(p_system -> 'classification_summary') <> 'string'
    or jsonb_typeof(p_system -> 'uses_personal_data') <> 'boolean'
    or jsonb_typeof(p_system -> 'interacts_with_people') <> 'boolean'
    or jsonb_typeof(p_system -> 'generates_content') <> 'boolean'
    or jsonb_typeof(p_system -> 'biometric_identification') <> 'boolean'
    or jsonb_typeof(p_system -> 'manipulative_or_exploitative') <> 'boolean'
    or jsonb_typeof(p_system -> 'obligations') <> 'array'
    or jsonb_typeof(p_system -> 'next_actions') <> 'array' then
    return query select 'invalid_input'::text, null::jsonb; return;
  end if;

  -- The API invokes this SECURITY DEFINER function through service_role. RLS does
  -- not protect that path, so commercial authority must be reasserted here.
  v_plan := app_private.resolve_commercial_plan(p_organization_id);
  if v_plan is null then
    return query select 'subscription_required'::text, null::jsonb; return;
  end if;

  v_limit := case v_plan
    when 'starter' then 25
    when 'professional' then 250
    when 'business' then 1500
    when 'enterprise' then null
    else 0
  end;

  if v_limit = 0 then
    return query select 'subscription_required'::text, null::jsonb; return;
  end if;

  -- Use the same tenant-scoped advisory lock as the other commercial quota
  -- authorities. COUNT + capacity decision + INSERT therefore share one
  -- transaction boundary and concurrent requests cannot oversubscribe the plan.
  perform pg_advisory_xact_lock(hashtext(p_organization_id::text));

  if v_limit is not null then
    select count(*)::integer
      into v_count
    from public.ai_systems as ai_system
    where ai_system.organization_id = p_organization_id;

    if v_count >= v_limit then
      return query select 'quota_exceeded'::text, null::jsonb; return;
    end if;
  end if;

  insert into public.ai_systems (
    organization_id, created_by, name, owner_team, category, country_market,
    processed_data, vendor_name, model_name, use_case, role, lifecycle_status,
    risk_domain, uses_personal_data, interacts_with_people, generates_content,
    biometric_identification, manipulative_or_exploitative, risk_level,
    classification_summary, obligations, next_actions, last_reassessed_at
  ) values (
    p_organization_id,
    p_actor_user_id,
    trim(p_system ->> 'name'),
    nullif(trim(coalesce(p_system ->> 'owner_team', '')), ''),
    nullif(trim(coalesce(p_system ->> 'category', '')), ''),
    nullif(trim(coalesce(p_system ->> 'country_market', '')), ''),
    nullif(trim(coalesce(p_system ->> 'processed_data', '')), ''),
    nullif(trim(coalesce(p_system ->> 'vendor_name', '')), ''),
    nullif(trim(coalesce(p_system ->> 'model_name', '')), ''),
    trim(p_system ->> 'use_case'),
    lower(trim(p_system ->> 'role')),
    lower(trim(p_system ->> 'lifecycle_status')),
    trim(p_system ->> 'risk_domain'),
    (p_system ->> 'uses_personal_data')::boolean,
    (p_system ->> 'interacts_with_people')::boolean,
    (p_system ->> 'generates_content')::boolean,
    (p_system ->> 'biometric_identification')::boolean,
    (p_system ->> 'manipulative_or_exploitative')::boolean,
    lower(trim(p_system ->> 'risk_level')),
    p_system ->> 'classification_summary',
    p_system -> 'obligations',
    p_system -> 'next_actions',
    now()
  ) returning * into v_created;

  insert into public.ai_system_history(
    ai_system_id, organization_id, actor_user_id, action, snapshot
  ) values (
    v_created.id,
    v_created.organization_id,
    p_actor_user_id,
    'created',
    jsonb_build_object(
      'name', v_created.name,
      'riskLevel', v_created.risk_level,
      'lifecycleStatus', v_created.lifecycle_status,
      'riskDomain', v_created.risk_domain,
      'createdAt', v_created.created_at
    )
  );

  return query select 'created'::text, to_jsonb(v_created);
end;
$$;

revoke all on function public.create_ai_system_atomic(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.create_ai_system_atomic(uuid, uuid, jsonb) to service_role;

notify pgrst, 'reload schema';

commit;
