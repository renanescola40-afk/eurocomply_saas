begin;

-- Legal Assurance package + information lifecycle.
-- Repository-side authority only. No Production push is authorized by this file.

do $preconditions$
begin
  if to_regclass('public.legal_review_requests') is null
     or to_regclass('public.legal_review_packages') is null
     or to_regclass('public.legal_review_package_items') is null
     or to_regclass('public.legal_review_information_requests') is null
     or to_regclass('public.legal_review_information_responses') is null
     or to_regclass('public.legal_review_access_grants') is null then
    raise exception 'legal assurance package dependency spine is incomplete';
  end if;
end
$preconditions$;

create or replace function public.create_legal_review_package_atomic(
  p_review_id uuid,
  p_expected_updated_at timestamptz,
  p_product_release_sha text,
  p_methodology_version text,
  p_regulatory_rules_version text,
  p_manifest jsonb,
  p_package_manifest_digest text,
  p_items jsonb,
  p_created_by_user_id uuid default null,
  p_created_by_clerk_user_id text default null
)
returns table(
  outcome text,
  package_id uuid,
  package_version integer,
  review_status text,
  review_updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_row public.legal_review_requests%rowtype;
  new_package_id uuid;
  new_version integer;
  item jsonb;
  stable_id text;
  seen_identifiers text[] := '{}'::text[];
begin
  if p_review_id is null
     or p_expected_updated_at is null
     or coalesce(p_product_release_sha, '') !~ '^[a-f0-9]{40}$'
     or nullif(btrim(coalesce(p_methodology_version, '')), '') is null
     or nullif(btrim(coalesce(p_regulatory_rules_version, '')), '') is null
     or jsonb_typeof(p_manifest) <> 'object'
     or coalesce(p_package_manifest_digest, '') !~ '^[a-f0-9]{64}$'
     or jsonb_typeof(p_items) <> 'array'
     or num_nonnulls(p_created_by_user_id, p_created_by_clerk_user_id) <> 1 then
    return query select 'invalid_input'::text, null::uuid, null::integer, null::text, null::timestamptz;
    return;
  end if;

  select *
  into current_row
  from public.legal_review_requests
  where id = p_review_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, null::integer, null::text, null::timestamptz;
    return;
  end if;

  if current_row.updated_at <> p_expected_updated_at then
    return query select 'state_changed'::text, null::uuid, null::integer, current_row.status, current_row.updated_at;
    return;
  end if;

  if current_row.status not in ('ACCEPTED_FOR_REVIEW', 'PACKAGE_PREPARING', 'RESUBMITTED') then
    return query select 'invalid_state'::text, null::uuid, null::integer, current_row.status, current_row.updated_at;
    return;
  end if;

  if current_row.assigned_counsel_id is null
     or current_row.law_firm_id is null
     or current_row.engagement_status <> 'ACCEPTED' then
    return query select 'engagement_required'::text, null::uuid, null::integer, current_row.status, current_row.updated_at;
    return;
  end if;

  if jsonb_array_length(p_items) = 0 then
    return query select 'items_required'::text, null::uuid, null::integer, current_row.status, current_row.updated_at;
    return;
  end if;

  for item in select value from jsonb_array_elements(p_items) loop
    stable_id := nullif(btrim(item->>'stableIdentifier'), '');

    if stable_id is null
       or coalesce(item->>'contentDigest', '') !~ '^[a-f0-9]{64}$'
       or nullif(btrim(item->>'sourceVersion'), '') is null
       or nullif(btrim(item->>'capturedAt'), '') is null
       or (
         nullif(btrim(item->>'contentReference'), '') is null
         and (not (item ? 'contentSnapshot') or item->'contentSnapshot' = 'null'::jsonb)
       ) then
      return query select 'invalid_item'::text, null::uuid, null::integer, current_row.status, current_row.updated_at;
      return;
    end if;

    if stable_id = any(seen_identifiers) then
      return query select 'duplicate_item'::text, null::uuid, null::integer, current_row.status, current_row.updated_at;
      return;
    end if;

    seen_identifiers := array_append(seen_identifiers, stable_id);
  end loop;

  update public.legal_review_requests
  set status = 'PACKAGE_PREPARING', updated_at = now()
  where id = current_row.id;

  select coalesce(max(p.package_version), 0) + 1
  into new_version
  from public.legal_review_packages p
  where p.review_id = current_row.id;

  insert into public.legal_review_packages (
    review_id,
    package_version,
    product_release_sha,
    methodology_version,
    regulatory_rules_version,
    manifest,
    package_manifest_digest,
    created_by_user_id,
    created_by_clerk_user_id
  ) values (
    current_row.id,
    new_version,
    p_product_release_sha,
    btrim(p_methodology_version),
    btrim(p_regulatory_rules_version),
    p_manifest,
    p_package_manifest_digest,
    p_created_by_user_id,
    p_created_by_clerk_user_id
  )
  returning id into new_package_id;

  for item in select value from jsonb_array_elements(p_items) loop
    insert into public.legal_review_package_items (
      package_id,
      stable_identifier,
      content_reference,
      content_snapshot,
      content_digest,
      source_version,
      captured_at
    ) values (
      new_package_id,
      btrim(item->>'stableIdentifier'),
      nullif(btrim(item->>'contentReference'), ''),
      case when item ? 'contentSnapshot' then item->'contentSnapshot' else null end,
      item->>'contentDigest',
      btrim(item->>'sourceVersion'),
      (item->>'capturedAt')::timestamptz
    );
  end loop;

  update public.legal_review_packages
  set finalized_at = now()
  where id = new_package_id;

  update public.legal_review_requests
  set status = 'READY_FOR_REVIEW', updated_at = now()
  where id = current_row.id
  returning status, updated_at into current_row.status, current_row.updated_at;

  return query
    select 'created'::text, new_package_id, new_version, current_row.status, current_row.updated_at;
end
$$;

create or replace function public.request_legal_review_information_atomic(
  p_review_id uuid,
  p_expected_updated_at timestamptz,
  p_counsel_profile_id uuid,
  p_prompt text
)
returns table(
  outcome text,
  information_request_id uuid,
  review_status text,
  review_updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_row public.legal_review_requests%rowtype;
  request_id uuid;
begin
  if p_review_id is null
     or p_expected_updated_at is null
     or p_counsel_profile_id is null
     or char_length(btrim(coalesce(p_prompt, ''))) < 2 then
    return query select 'invalid_input'::text, null::uuid, null::text, null::timestamptz;
    return;
  end if;

  select *
  into current_row
  from public.legal_review_requests
  where id = p_review_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, null::text, null::timestamptz;
    return;
  end if;

  if current_row.updated_at <> p_expected_updated_at then
    return query select 'state_changed'::text, null::uuid, current_row.status, current_row.updated_at;
    return;
  end if;

  if current_row.status <> 'IN_REVIEW' then
    return query select 'invalid_state'::text, null::uuid, current_row.status, current_row.updated_at;
    return;
  end if;

  if current_row.assigned_counsel_id is distinct from p_counsel_profile_id
     or not exists (
       select 1
       from public.legal_review_access_grants lag
       where lag.review_id = current_row.id
         and lag.counsel_profile_id = p_counsel_profile_id
         and lag.law_firm_id = current_row.law_firm_id
         and lag.grant_scope = 'REVIEW'
         and lag.active = true
         and lag.revoked_at is null
     ) then
    return query select 'counsel_not_authorized'::text, null::uuid, current_row.status, current_row.updated_at;
    return;
  end if;

  insert into public.legal_review_information_requests (
    review_id,
    requested_by_counsel_id,
    prompt
  ) values (
    current_row.id,
    p_counsel_profile_id,
    btrim(p_prompt)
  )
  returning id into request_id;

  update public.legal_review_requests
  set status = 'INFORMATION_REQUESTED', updated_at = now()
  where id = current_row.id
  returning status, updated_at into current_row.status, current_row.updated_at;

  return query
    select 'requested'::text, request_id, current_row.status, current_row.updated_at;
end
$$;

create or replace function public.respond_legal_review_information_atomic(
  p_review_id uuid,
  p_expected_updated_at timestamptz,
  p_information_request_id uuid,
  p_organization_id uuid,
  p_response jsonb,
  p_submitted_by_user_id uuid default null,
  p_submitted_by_clerk_user_id text default null
)
returns table(
  outcome text,
  response_id uuid,
  review_status text,
  review_updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_row public.legal_review_requests%rowtype;
  new_response_id uuid;
begin
  if p_review_id is null
     or p_expected_updated_at is null
     or p_information_request_id is null
     or p_organization_id is null
     or jsonb_typeof(p_response) <> 'object'
     or num_nonnulls(p_submitted_by_user_id, p_submitted_by_clerk_user_id) <> 1 then
    return query select 'invalid_input'::text, null::uuid, null::text, null::timestamptz;
    return;
  end if;

  select *
  into current_row
  from public.legal_review_requests
  where id = p_review_id
    and organization_id = p_organization_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, null::text, null::timestamptz;
    return;
  end if;

  if current_row.updated_at <> p_expected_updated_at then
    return query select 'state_changed'::text, null::uuid, current_row.status, current_row.updated_at;
    return;
  end if;

  if current_row.status <> 'INFORMATION_REQUESTED' then
    return query select 'invalid_state'::text, null::uuid, current_row.status, current_row.updated_at;
    return;
  end if;

  if not exists (
    select 1
    from public.legal_review_information_requests ir
    where ir.id = p_information_request_id
      and ir.review_id = current_row.id
      and ir.status = 'OPEN'
  ) then
    return query select 'information_request_not_open'::text, null::uuid, current_row.status, current_row.updated_at;
    return;
  end if;

  insert into public.legal_review_information_responses (
    information_request_id,
    organization_id,
    response,
    submitted_by_user_id,
    submitted_by_clerk_user_id
  ) values (
    p_information_request_id,
    p_organization_id,
    p_response,
    p_submitted_by_user_id,
    p_submitted_by_clerk_user_id
  )
  returning id into new_response_id;

  update public.legal_review_information_requests
  set status = 'ANSWERED', answered_at = now()
  where id = p_information_request_id;

  update public.legal_review_requests
  set status = 'IN_REVIEW', updated_at = now()
  where id = current_row.id
  returning status, updated_at into current_row.status, current_row.updated_at;

  return query
    select 'answered'::text, new_response_id, current_row.status, current_row.updated_at;
end
$$;

revoke all on function public.create_legal_review_package_atomic(uuid,timestamptz,text,text,text,jsonb,text,jsonb,uuid,text)
  from public, anon, authenticated;
grant execute on function public.create_legal_review_package_atomic(uuid,timestamptz,text,text,text,jsonb,text,jsonb,uuid,text)
  to service_role;

revoke all on function public.request_legal_review_information_atomic(uuid,timestamptz,uuid,text)
  from public, anon, authenticated;
grant execute on function public.request_legal_review_information_atomic(uuid,timestamptz,uuid,text)
  to service_role;

revoke all on function public.respond_legal_review_information_atomic(uuid,timestamptz,uuid,uuid,jsonb,uuid,text)
  from public, anon, authenticated;
grant execute on function public.respond_legal_review_information_atomic(uuid,timestamptz,uuid,uuid,jsonb,uuid,text)
  to service_role;

do $postconditions$
begin
  if has_function_privilege(
       'authenticated',
       'public.create_legal_review_package_atomic(uuid,timestamptz,text,text,text,jsonb,text,jsonb,uuid,text)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.request_legal_review_information_atomic(uuid,timestamptz,uuid,text)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.respond_legal_review_information_atomic(uuid,timestamptz,uuid,uuid,jsonb,uuid,text)',
       'EXECUTE'
     ) then
    raise exception 'legal assurance package/information authority must remain backend-only';
  end if;
end
$postconditions$;

commit;
