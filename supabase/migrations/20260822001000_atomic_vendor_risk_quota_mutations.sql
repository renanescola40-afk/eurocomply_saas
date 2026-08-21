begin;

-- Final commercial-capacity hardening for vendor/risk mutations.
-- The active application computes authoritative plan capacity from the billing
-- authority. This RPC is service-role only and serializes the resulting write,
-- quota check and canonical audit-chain append in one database transaction.
-- It intentionally shares the organization advisory-lock key used by
-- append_audit_event_chained so audit order and commercial mutations cannot race.

-- Reconcile the active risk action schema without rewriting historical migration
-- bytes. The current production lineage may still expose the older text-based
-- risk shape; this forward migration is bounded and fail-closed.
alter table public.risks
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null,
  add column if not exists mitigation text,
  add column if not exists due_date date;

do $$
declare
  v_likelihood_type text;
  v_impact_type text;
begin
  select data_type into v_likelihood_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'risks' and column_name = 'likelihood';

  select data_type into v_impact_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'risks' and column_name = 'impact';

  if v_likelihood_type = 'text' then
    if exists (
      select 1 from public.risks
      where likelihood is not null and likelihood !~ '^[1-5]$'
    ) then
      raise exception 'risk likelihood contains values outside 1..5; refusing forward conversion';
    end if;
    alter table public.risks
      alter column likelihood type integer using coalesce(nullif(likelihood, '')::integer, 3);
  end if;

  if v_impact_type = 'text' then
    if exists (
      select 1 from public.risks
      where impact is not null and impact !~ '^[1-5]$'
    ) then
      raise exception 'risk impact contains values outside 1..5; refusing forward conversion';
    end if;
    alter table public.risks
      alter column impact type integer using coalesce(nullif(impact, '')::integer, 3);
  end if;
end;
$$;

update public.risks set likelihood = 3 where likelihood is null;
update public.risks set impact = 3 where impact is null;

alter table public.risks
  alter column likelihood set default 3,
  alter column likelihood set not null,
  alter column impact set default 3,
  alter column impact set not null;

alter table public.risks
  drop constraint if exists risks_likelihood_check,
  add constraint risks_likelihood_check check (likelihood between 1 and 5) not valid,
  drop constraint if exists risks_impact_check,
  add constraint risks_impact_check check (impact between 1 and 5) not valid;

create or replace function public.enforce_risk_actor_member_scope()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  scoped_user_id uuid;
begin
  if tg_argv[0] = 'created_by' then
    scoped_user_id := new.created_by;
  elsif tg_argv[0] = 'owner_user_id' then
    scoped_user_id := new.owner_user_id;
  else
    raise exception 'unsupported_risk_actor_scope' using errcode = '22023';
  end if;

  if scoped_user_id is null then return new; end if;

  if not exists (
    select 1 from public.organization_members membership
    where membership.organization_id = new.organization_id
      and membership.user_id = scoped_user_id
  ) then
    raise exception 'risk_actor_not_organization_member' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_risk_actor_member_scope() from public, anon, authenticated;
grant execute on function public.enforce_risk_actor_member_scope() to service_role;

drop trigger if exists enforce_risk_creator_member_scope on public.risks;
create trigger enforce_risk_creator_member_scope
before insert or update of organization_id, created_by on public.risks
for each row execute function public.enforce_risk_actor_member_scope('created_by');

drop trigger if exists enforce_risk_owner_member_scope on public.risks;
create trigger enforce_risk_owner_member_scope
before insert or update of organization_id, owner_user_id on public.risks
for each row execute function public.enforce_risk_actor_member_scope('owner_user_id');

-- Older production lineage stores risk_score as a normal integer. Keep it
-- deterministic there without touching installations where it is generated.
create or replace function public.set_risk_score_from_factors()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.risk_score := new.likelihood * new.impact;
  return new;
end;
$$;
revoke all on function public.set_risk_score_from_factors() from public, anon, authenticated;
grant execute on function public.set_risk_score_from_factors() to service_role;

do $$
declare
  v_generated text;
begin
  select is_generated into v_generated
  from information_schema.columns
  where table_schema = 'public' and table_name = 'risks' and column_name = 'risk_score';

  drop trigger if exists set_risk_score_from_factors on public.risks;
  if coalesce(v_generated, 'NEVER') = 'NEVER' then
    create trigger set_risk_score_from_factors
    before insert or update of likelihood, impact on public.risks
    for each row execute function public.set_risk_score_from_factors();
    update public.risks set risk_score = likelihood * impact;
  end if;
end;
$$;

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
    or (p_operation = 'create' and p_payload is null)
    or (p_operation = 'create' and p_max_count is not null and p_max_count < 0) then
    return query select 'invalid_input'::text, null::jsonb, 0, p_max_count;
    return;
  end if;

  -- Same key as append_audit_event_chained: serializes all organization audit
  -- appends together with vendor/risk quota mutations.
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
    from public.vendors where organization_id = p_organization_id;

    if p_max_count is not null and v_count >= p_max_count then
      return query select 'quota_exceeded'::text, null::jsonb, v_count, p_max_count;
      return;
    end if;

    insert into public.vendors (
      id, organization_id, created_by, name, website, country, category,
      data_access_level, risk_level, review_status, dpa_signed,
      last_reviewed_at, next_review_at, approved_at, approved_by
    ) values (
      p_entity_id,
      p_organization_id,
      p_actor_user_id,
      p_payload->>'name',
      p_payload->>'website',
      p_payload->>'country',
      coalesce(nullif(p_payload->>'category', ''), 'general'),
      coalesce(nullif(p_payload->>'data_access_level', ''), 'low'),
      coalesce(nullif(p_payload->>'risk_level', ''), 'medium'),
      coalesce(nullif(p_payload->>'review_status', ''), 'pending'),
      coalesce((p_payload->>'dpa_signed')::boolean, false),
      nullif(p_payload->>'last_reviewed_at', '')::date,
      nullif(p_payload->>'next_review_at', '')::date,
      nullif(p_payload->>'approved_at', '')::timestamptz,
      nullif(p_payload->>'approved_by', '')::uuid
    ) returning to_jsonb(vendors.*) into v_record;

    v_count := v_count + 1;

  elsif p_operation = 'create' and p_resource_type = 'risk' then
    select count(*)::integer into v_count
    from public.risks where organization_id = p_organization_id;

    if p_max_count is not null and v_count >= p_max_count then
      return query select 'quota_exceeded'::text, null::jsonb, v_count, p_max_count;
      return;
    end if;

    insert into public.risks (
      id, organization_id, created_by, owner_user_id, title, description,
      category, likelihood, impact, status, mitigation, due_date
    ) values (
      p_entity_id,
      p_organization_id,
      p_actor_user_id,
      nullif(p_payload->>'owner_user_id', '')::uuid,
      p_payload->>'title',
      p_payload->>'description',
      coalesce(nullif(p_payload->>'category', ''), 'general'),
      (p_payload->>'likelihood')::integer,
      (p_payload->>'impact')::integer,
      coalesce(nullif(p_payload->>'status', ''), 'open'),
      p_payload->>'mitigation',
      nullif(p_payload->>'due_date', '')::date
    ) returning to_jsonb(risks.*) into v_record;

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
    from public.vendors where organization_id = p_organization_id;

  elsif p_operation = 'delete' and p_resource_type = 'risk' then
    delete from public.risks
    where id = p_entity_id and organization_id = p_organization_id
    returning to_jsonb(risks.*) into v_record;

    if v_record is null then
      return query select 'not_found_or_conflict'::text, null::jsonb, 0, p_max_count;
      return;
    end if;

    select count(*)::integer into v_count
    from public.risks where organization_id = p_organization_id;
  end if;

  insert into public.audit_events (
    id, organization_id, actor_user_id, action, entity_type, entity_id,
    metadata, created_at, previous_hash, event_hash, hash_algorithm, hash_signature
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
) is 'Service-role-only vendor/risk create/delete authority with organization-scoped serialization, transactional quota enforcement and canonical chained audit append.';

commit;
