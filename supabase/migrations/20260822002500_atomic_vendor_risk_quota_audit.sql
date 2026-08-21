-- P0 commercial entitlement integrity.
--
-- Vendor/risk create and delete operations change quota usage. They must be
-- serialized with the organization audit chain so a concurrent delete rollback
-- cannot reopen a slot after a create has already accepted it.
--
-- These backend-only RPCs hold the same organization-scoped advisory lock used
-- by append_audit_event_chained, perform the quota mutation, and persist both
-- legacy and chained audit evidence in one PostgreSQL transaction.

create or replace function public.append_commercial_mutation_audit_locked(
  p_audit_id uuid,
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_metadata jsonb,
  p_created_at timestamptz,
  p_previous_hash text,
  p_event_hash text,
  p_hash_signature text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_previous_hash text;
begin
  if p_audit_id is null
    or p_organization_id is null
    or p_created_at is null
    or nullif(trim(coalesce(p_action, '')), '') is null
    or nullif(trim(coalesce(p_entity_type, '')), '') is null
    or p_event_hash !~ '^[0-9a-f]{64}$'
    or (p_previous_hash is not null and p_previous_hash !~ '^[0-9a-f]{64}$')
    or (p_hash_signature is not null and p_hash_signature !~ '^[0-9a-f]{64}$')
  then
    raise exception 'invalid commercial mutation audit input' using errcode = '22023';
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
    p_action,
    p_entity_type,
    p_entity_id,
    coalesce(p_metadata, '{}'::jsonb),
    p_created_at
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
    p_action,
    p_entity_type,
    p_entity_id,
    coalesce(p_metadata, '{}'::jsonb),
    p_created_at,
    v_previous_hash,
    p_event_hash,
    'sha256',
    p_hash_signature
  );
end;
$$;

revoke all on function public.append_commercial_mutation_audit_locked(uuid, uuid, uuid, text, text, text, jsonb, timestamptz, text, text, text) from public;
revoke all on function public.append_commercial_mutation_audit_locked(uuid, uuid, uuid, text, text, text, jsonb, timestamptz, text, text, text) from anon;
revoke all on function public.append_commercial_mutation_audit_locked(uuid, uuid, uuid, text, text, text, jsonb, timestamptz, text, text, text) from authenticated;
revoke all on function public.append_commercial_mutation_audit_locked(uuid, uuid, uuid, text, text, text, jsonb, timestamptz, text, text, text) from service_role;

create or replace function public.create_vendor_with_quota_audit_atomic(
  p_vendor_id uuid,
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_max_allowed integer,
  p_vendor jsonb,
  p_audit_id uuid,
  p_audit_metadata jsonb,
  p_audit_created_at timestamptz,
  p_previous_hash text,
  p_event_hash text,
  p_hash_signature text default null
)
returns table(outcome text, record jsonb)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count bigint;
  v_created public.vendors%rowtype;
  v_review_status text;
begin
  if p_vendor_id is null
    or p_organization_id is null
    or p_actor_user_id is null
    or p_vendor is null
    or jsonb_typeof(p_vendor) <> 'object'
    or (p_max_allowed is not null and p_max_allowed < 0)
  then
    return query select 'invalid_input'::text, null::jsonb;
    return;
  end if;

  if nullif(trim(coalesce(p_vendor ->> 'name', '')), '') is null then
    return query select 'invalid_input'::text, null::jsonb;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_organization_id::text));

  if p_max_allowed is not null then
    select count(*) into v_count
    from public.vendors v
    where v.organization_id = p_organization_id;

    if v_count >= p_max_allowed then
      return query select 'quota_exceeded'::text, null::jsonb;
      return;
    end if;
  end if;

  v_review_status := coalesce(nullif(trim(p_vendor ->> 'review_status'), ''), 'pending');

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
    p_vendor_id,
    p_organization_id,
    p_actor_user_id,
    trim(p_vendor ->> 'name'),
    nullif(trim(coalesce(p_vendor ->> 'website', '')), ''),
    nullif(trim(coalesce(p_vendor ->> 'country', '')), ''),
    coalesce(nullif(trim(p_vendor ->> 'category'), ''), 'general'),
    coalesce(nullif(trim(p_vendor ->> 'data_access_level'), ''), 'low'),
    coalesce(nullif(trim(p_vendor ->> 'risk_level'), ''), 'medium'),
    v_review_status,
    coalesce((p_vendor ->> 'dpa_signed')::boolean, false),
    nullif(trim(coalesce(p_vendor ->> 'last_reviewed_at', '')), '')::date,
    nullif(trim(coalesce(p_vendor ->> 'next_review_at', '')), '')::date,
    case when v_review_status = 'approved' then now() else null end,
    case when v_review_status = 'approved' then p_actor_user_id else null end
  )
  returning * into v_created;

  perform public.append_commercial_mutation_audit_locked(
    p_audit_id,
    p_organization_id,
    p_actor_user_id,
    'vendor.create',
    'vendor',
    p_vendor_id::text,
    p_audit_metadata,
    p_audit_created_at,
    p_previous_hash,
    p_event_hash,
    p_hash_signature
  );

  return query select 'created'::text, to_jsonb(v_created);
end;
$$;

create or replace function public.delete_vendor_with_audit_atomic(
  p_vendor_id uuid,
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_expected_review_version integer,
  p_audit_id uuid,
  p_audit_metadata jsonb,
  p_audit_created_at timestamptz,
  p_previous_hash text,
  p_event_hash text,
  p_hash_signature text default null
)
returns table(outcome text, record jsonb)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted public.vendors%rowtype;
begin
  if p_vendor_id is null or p_organization_id is null or p_actor_user_id is null then
    return query select 'invalid_input'::text, null::jsonb;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_organization_id::text));

  select v.* into v_deleted
  from public.vendors v
  where v.id = p_vendor_id
    and v.organization_id = p_organization_id
    and (p_expected_review_version is null or v.review_version = p_expected_review_version)
  for update;

  if not found then
    return query select 'not_found_or_conflict'::text, null::jsonb;
    return;
  end if;

  delete from public.vendors v
  where v.id = p_vendor_id
    and v.organization_id = p_organization_id;

  perform public.append_commercial_mutation_audit_locked(
    p_audit_id,
    p_organization_id,
    p_actor_user_id,
    'vendor.delete',
    'vendor',
    p_vendor_id::text,
    p_audit_metadata,
    p_audit_created_at,
    p_previous_hash,
    p_event_hash,
    p_hash_signature
  );

  return query select 'deleted'::text, to_jsonb(v_deleted);
end;
$$;

create or replace function public.create_risk_with_quota_audit_atomic(
  p_risk_id uuid,
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_max_allowed integer,
  p_risk jsonb,
  p_audit_id uuid,
  p_audit_metadata jsonb,
  p_audit_created_at timestamptz,
  p_previous_hash text,
  p_event_hash text,
  p_hash_signature text default null
)
returns table(outcome text, record jsonb)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count bigint;
  v_created public.risks%rowtype;
begin
  if p_risk_id is null
    or p_organization_id is null
    or p_actor_user_id is null
    or p_risk is null
    or jsonb_typeof(p_risk) <> 'object'
    or (p_max_allowed is not null and p_max_allowed < 0)
  then
    return query select 'invalid_input'::text, null::jsonb;
    return;
  end if;

  if nullif(trim(coalesce(p_risk ->> 'title', '')), '') is null then
    return query select 'invalid_input'::text, null::jsonb;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_organization_id::text));

  if p_max_allowed is not null then
    select count(*) into v_count
    from public.risks r
    where r.organization_id = p_organization_id;

    if v_count >= p_max_allowed then
      return query select 'quota_exceeded'::text, null::jsonb;
      return;
    end if;
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
    p_risk_id,
    p_organization_id,
    p_actor_user_id,
    nullif(trim(coalesce(p_risk ->> 'owner_user_id', '')), '')::uuid,
    trim(p_risk ->> 'title'),
    nullif(p_risk ->> 'description', ''),
    coalesce(nullif(trim(p_risk ->> 'category'), ''), 'general'),
    (p_risk ->> 'likelihood')::integer,
    (p_risk ->> 'impact')::integer,
    coalesce(nullif(trim(p_risk ->> 'status'), ''), 'open'),
    nullif(p_risk ->> 'mitigation', ''),
    nullif(trim(coalesce(p_risk ->> 'due_date', '')), '')::date
  )
  returning * into v_created;

  perform public.append_commercial_mutation_audit_locked(
    p_audit_id,
    p_organization_id,
    p_actor_user_id,
    'risk.create',
    'risk',
    p_risk_id::text,
    p_audit_metadata,
    p_audit_created_at,
    p_previous_hash,
    p_event_hash,
    p_hash_signature
  );

  return query select 'created'::text, to_jsonb(v_created);
end;
$$;

create or replace function public.delete_risk_with_audit_atomic(
  p_risk_id uuid,
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_audit_id uuid,
  p_audit_metadata jsonb,
  p_audit_created_at timestamptz,
  p_previous_hash text,
  p_event_hash text,
  p_hash_signature text default null
)
returns table(outcome text, record jsonb)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted public.risks%rowtype;
begin
  if p_risk_id is null or p_organization_id is null or p_actor_user_id is null then
    return query select 'invalid_input'::text, null::jsonb;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_organization_id::text));

  select r.* into v_deleted
  from public.risks r
  where r.id = p_risk_id
    and r.organization_id = p_organization_id
  for update;

  if not found then
    return query select 'not_found_or_conflict'::text, null::jsonb;
    return;
  end if;

  delete from public.risks r
  where r.id = p_risk_id
    and r.organization_id = p_organization_id;

  perform public.append_commercial_mutation_audit_locked(
    p_audit_id,
    p_organization_id,
    p_actor_user_id,
    'risk.delete',
    'risk',
    p_risk_id::text,
    p_audit_metadata,
    p_audit_created_at,
    p_previous_hash,
    p_event_hash,
    p_hash_signature
  );

  return query select 'deleted'::text, to_jsonb(v_deleted);
end;
$$;

revoke all on function public.create_vendor_with_quota_audit_atomic(uuid, uuid, uuid, integer, jsonb, uuid, jsonb, timestamptz, text, text, text) from public;
revoke all on function public.create_vendor_with_quota_audit_atomic(uuid, uuid, uuid, integer, jsonb, uuid, jsonb, timestamptz, text, text, text) from anon;
revoke all on function public.create_vendor_with_quota_audit_atomic(uuid, uuid, uuid, integer, jsonb, uuid, jsonb, timestamptz, text, text, text) from authenticated;
grant execute on function public.create_vendor_with_quota_audit_atomic(uuid, uuid, uuid, integer, jsonb, uuid, jsonb, timestamptz, text, text, text) to service_role;

revoke all on function public.delete_vendor_with_audit_atomic(uuid, uuid, uuid, integer, uuid, jsonb, timestamptz, text, text, text) from public;
revoke all on function public.delete_vendor_with_audit_atomic(uuid, uuid, uuid, integer, uuid, jsonb, timestamptz, text, text, text) from anon;
revoke all on function public.delete_vendor_with_audit_atomic(uuid, uuid, uuid, integer, uuid, jsonb, timestamptz, text, text, text) from authenticated;
grant execute on function public.delete_vendor_with_audit_atomic(uuid, uuid, uuid, integer, uuid, jsonb, timestamptz, text, text, text) to service_role;

revoke all on function public.create_risk_with_quota_audit_atomic(uuid, uuid, uuid, integer, jsonb, uuid, jsonb, timestamptz, text, text, text) from public;
revoke all on function public.create_risk_with_quota_audit_atomic(uuid, uuid, uuid, integer, jsonb, uuid, jsonb, timestamptz, text, text, text) from anon;
revoke all on function public.create_risk_with_quota_audit_atomic(uuid, uuid, uuid, integer, jsonb, uuid, jsonb, timestamptz, text, text, text) from authenticated;
grant execute on function public.create_risk_with_quota_audit_atomic(uuid, uuid, uuid, integer, jsonb, uuid, jsonb, timestamptz, text, text, text) to service_role;

revoke all on function public.delete_risk_with_audit_atomic(uuid, uuid, uuid, uuid, jsonb, timestamptz, text, text, text) from public;
revoke all on function public.delete_risk_with_audit_atomic(uuid, uuid, uuid, uuid, jsonb, timestamptz, text, text, text) from anon;
revoke all on function public.delete_risk_with_audit_atomic(uuid, uuid, uuid, uuid, jsonb, timestamptz, text, text, text) from authenticated;
grant execute on function public.delete_risk_with_audit_atomic(uuid, uuid, uuid, uuid, jsonb, timestamptz, text, text, text) to service_role;

comment on function public.create_vendor_with_quota_audit_atomic(uuid, uuid, uuid, integer, jsonb, uuid, jsonb, timestamptz, text, text, text)
  is 'Creates one vendor under the canonical organization quota and persists its audit event atomically under the organization audit-chain lock.';
comment on function public.delete_vendor_with_audit_atomic(uuid, uuid, uuid, integer, uuid, jsonb, timestamptz, text, text, text)
  is 'Deletes one tenant-scoped vendor and persists its audit event atomically under the organization audit-chain lock.';
comment on function public.create_risk_with_quota_audit_atomic(uuid, uuid, uuid, integer, jsonb, uuid, jsonb, timestamptz, text, text, text)
  is 'Creates one risk under the canonical organization quota and persists its audit event atomically under the organization audit-chain lock.';
comment on function public.delete_risk_with_audit_atomic(uuid, uuid, uuid, uuid, jsonb, timestamptz, text, text, text)
  is 'Deletes one tenant-scoped risk and persists its audit event atomically under the organization audit-chain lock.';

notify pgrst, 'reload schema';
