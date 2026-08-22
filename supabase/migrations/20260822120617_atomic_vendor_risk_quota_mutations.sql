begin;

-- P0 commercial entitlement integrity.
--
-- Vendor/risk create and delete operations change commercial quota usage. The
-- application resolves the authoritative paid-plan capacity, while this
-- service-role-only RPC serializes the final quota decision, mutation and audit
-- persistence in one PostgreSQL transaction.
--
-- It deliberately uses the exact organization advisory-lock key used by
-- append_audit_event_chained. That makes create/delete, audit ordering and
-- compensating audit failures one serialized database authority instead of
-- separate application requests.
--
-- Repository migration presence is not evidence that production applied it.

create or replace function public.mutate_commercial_resource_with_audit_atomic(
  p_resource_type text,
  p_operation text,
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_entity_id uuid,
  p_payload jsonb,
  p_max_count integer,
  p_expected_review_version integer,
  p_audit_id uuid,
  p_audit_metadata jsonb,
  p_audit_created_at timestamptz,
  p_previous_hash text,
  p_event_hash text,
  p_hash_signature text default null
)
returns table (
  outcome text,
  resource_record jsonb,
  current_count integer,
  max_count integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_previous_hash text;
  v_count integer := 0;
  v_record jsonb;
  v_review_status text;
begin
  if p_resource_type not in ('vendor', 'risk')
    or p_operation not in ('create', 'delete')
    or p_organization_id is null
    or p_actor_user_id is null
    or p_entity_id is null
    or p_audit_id is null
    or p_audit_created_at is null
    or p_event_hash !~ '^[0-9a-f]{64}$'
    or (p_previous_hash is not null and p_previous_hash !~ '^[0-9a-f]{64}$')
    or (p_hash_signature is not null and p_hash_signature !~ '^[0-9a-f]{64}$')
    or (p_operation = 'create' and (p_payload is null or jsonb_typeof(p_payload) <> 'object'))
    or (p_operation = 'create' and p_max_count is not null and p_max_count < 0)
  then
    return query select 'invalid_input'::text, null::jsonb, 0, p_max_count;
    return;
  end if;

  if p_operation = 'create' and p_resource_type = 'vendor'
    and nullif(trim(coalesce(p_payload ->> 'name', '')), '') is null
  then
    return query select 'invalid_input'::text, null::jsonb, 0, p_max_count;
    return;
  end if;

  if p_operation = 'create' and p_resource_type = 'risk'
    and (
      nullif(trim(coalesce(p_payload ->> 'title', '')), '') is null
      or coalesce(p_payload ->> 'likelihood', '') !~ '^[1-5]$'
      or coalesce(p_payload ->> 'impact', '') !~ '^[1-5]$'
    )
  then
    return query select 'invalid_input'::text, null::jsonb, 0, p_max_count;
    return;
  end if;

  -- Same key as append_audit_event_chained: all organization-scoped audit
  -- appends and quota-changing mutations are serialized for this transaction.
  perform pg_advisory_xact_lock(hashtext(p_organization_id::text));

  select ae.event_hash into v_previous_hash
  from public.audit_events ae
  where ae.organization_id = p_organization_id
    and ae.event_hash is not null
  order by ae.created_at desc, ae.id desc
  limit 1;

  if coalesce(v_previous_hash, '') <> coalesce(p_previous_hash, '') then
    raise exception 'audit chain previous hash mismatch' using errcode = '40001';
  end if;

  if p_operation = 'create' and p_resource_type = 'vendor' then
    select count(*)::integer into v_count
    from public.vendors
    where organization_id = p_organization_id;

    if p_max_count is not null and v_count >= p_max_count then
      return query select 'quota_exceeded'::text, null::jsonb, v_count, p_max_count;
      return;
    end if;

    v_review_status := coalesce(nullif(trim(p_payload ->> 'review_status'), ''), 'pending');

    insert into public.vendors (
      id,
      organization_id,
      created_by,
      name,
      website,
      country,
      category,
      data_access_level,
      risk_level,
      review_status,
      dpa_signed,
      last_reviewed_at,
      next_review_at,
      approved_at,
      approved_by
    ) values (
      p_entity_id,
      p_organization_id,
      p_actor_user_id,
      trim(p_payload ->> 'name'),
      nullif(trim(coalesce(p_payload ->> 'website', '')), ''),
      nullif(trim(coalesce(p_payload ->> 'country', '')), ''),
      coalesce(nullif(trim(p_payload ->> 'category'), ''), 'general'),
      coalesce(nullif(trim(p_payload ->> 'data_access_level'), ''), 'low'),
      coalesce(nullif(trim(p_payload ->> 'risk_level'), ''), 'medium'),
      v_review_status,
      coalesce((p_payload ->> 'dpa_signed')::boolean, false),
      nullif(trim(coalesce(p_payload ->> 'last_reviewed_at', '')), '')::date,
      nullif(trim(coalesce(p_payload ->> 'next_review_at', '')), '')::date,
      case when v_review_status = 'approved' then now() else null end,
      case when v_review_status = 'approved' then p_actor_user_id else null end
    )
    returning to_jsonb(vendors.*) into v_record;

    v_count := v_count + 1;

  elsif p_operation = 'create' and p_resource_type = 'risk' then
    select count(*)::integer into v_count
    from public.risks
    where organization_id = p_organization_id;

    if p_max_count is not null and v_count >= p_max_count then
      return query select 'quota_exceeded'::text, null::jsonb, v_count, p_max_count;
      return;
    end if;

    insert into public.risks (
      id,
      organization_id,
      created_by,
      owner_user_id,
      title,
      description,
      category,
      likelihood,
      impact,
      status,
      mitigation,
      due_date
    ) values (
      p_entity_id,
      p_organization_id,
      p_actor_user_id,
      nullif(trim(coalesce(p_payload ->> 'owner_user_id', '')), '')::uuid,
      trim(p_payload ->> 'title'),
      nullif(p_payload ->> 'description', ''),
      coalesce(nullif(trim(p_payload ->> 'category'), ''), 'general'),
      (p_payload ->> 'likelihood')::integer,
      (p_payload ->> 'impact')::integer,
      coalesce(nullif(trim(p_payload ->> 'status'), ''), 'open'),
      nullif(p_payload ->> 'mitigation', ''),
      nullif(trim(coalesce(p_payload ->> 'due_date', '')), '')::date
    )
    returning to_jsonb(risks.*) into v_record;

    v_count := v_count + 1;

  elsif p_operation = 'delete' and p_resource_type = 'vendor' then
    delete from public.vendors
    where id = p_entity_id
      and organization_id = p_organization_id
      and (p_expected_review_version is null or review_version = p_expected_review_version)
    returning to_jsonb(vendors.*) into v_record;

    if v_record is null then
      return query select 'not_found_or_conflict'::text, null::jsonb, 0, p_max_count;
      return;
    end if;

    select count(*)::integer into v_count
    from public.vendors
    where organization_id = p_organization_id;

  elsif p_operation = 'delete' and p_resource_type = 'risk' then
    delete from public.risks
    where id = p_entity_id
      and organization_id = p_organization_id
    returning to_jsonb(risks.*) into v_record;

    if v_record is null then
      return query select 'not_found_or_conflict'::text, null::jsonb, 0, p_max_count;
      return;
    end if;

    select count(*)::integer into v_count
    from public.risks
    where organization_id = p_organization_id;
  end if;

  -- The legacy stream and the canonical chained stream are committed together
  -- with the resource mutation. Any audit write failure aborts the mutation.
  insert into public.audit_logs (
    id,
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata,
    created_at
  ) values (
    p_audit_id,
    p_organization_id,
    p_actor_user_id,
    p_resource_type || '.' || p_operation,
    p_resource_type,
    p_entity_id::text,
    coalesce(p_audit_metadata, '{}'::jsonb),
    p_audit_created_at
  );

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
    p_resource_type || '.' || p_operation,
    p_resource_type,
    p_entity_id::text,
    coalesce(p_audit_metadata, '{}'::jsonb),
    p_audit_created_at,
    v_previous_hash,
    p_event_hash,
    'sha256',
    p_hash_signature
  );

  return query select
    case when p_operation = 'create' then 'created' else 'deleted' end,
    v_record,
    v_count,
    p_max_count;
end;
$$;

revoke all on function public.mutate_commercial_resource_with_audit_atomic(
  text, text, uuid, uuid, uuid, jsonb, integer, integer, uuid, jsonb,
  timestamptz, text, text, text
) from public, anon, authenticated;

grant execute on function public.mutate_commercial_resource_with_audit_atomic(
  text, text, uuid, uuid, uuid, jsonb, integer, integer, uuid, jsonb,
  timestamptz, text, text, text
) to service_role;

comment on function public.mutate_commercial_resource_with_audit_atomic(
  text, text, uuid, uuid, uuid, jsonb, integer, integer, uuid, jsonb,
  timestamptz, text, text, text
) is 'Service-role-only vendor/risk create/delete authority with organization-scoped serialization, transactional quota enforcement and dual audit persistence.';

commit;
