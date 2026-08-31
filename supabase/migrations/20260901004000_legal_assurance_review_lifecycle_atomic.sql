begin;

-- Atomic professional-review lifecycle. All functions remain service-role-only.
-- Application code must additionally enforce feature gating, authenticated actor
-- authority, rate limits, trusted origin and central audit persistence.

do $preconditions$
begin
  if to_regclass('public.legal_review_packages') is null
     or to_regclass('public.legal_review_package_items') is null
     or to_regclass('public.legal_review_decisions') is null
     or to_regclass('public.legal_review_remediation_items') is null
     or to_regclass('public.legal_review_information_requests') is null
     or to_regclass('public.legal_review_information_responses') is null then
    raise exception 'legal assurance lifecycle schema is incomplete';
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
returns table(outcome text, package_id uuid, package_version integer, review_status text, review_updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_row public.legal_review_requests%rowtype;
  new_package_id uuid;
  new_version integer;
  item jsonb;
  seen_identifiers text[] := '{}'::text[];
  stable_id text;
begin
  if p_review_id is null or p_expected_updated_at is null
     or coalesce(p_product_release_sha, '') !~ '^[a-f0-9]{40}$'
     or coalesce(p_package_manifest_digest, '') !~ '^[a-f0-9]{64}$'
     or jsonb_typeof(p_manifest) <> 'object'
     or jsonb_typeof(p_items) <> 'array'
     or num_nonnulls(p_created_by_user_id, p_created_by_clerk_user_id) <> 1 then
    return query select 'invalid_input'::text, null::uuid, null::integer, null::text, null::timestamptz;
    return;
  end if;

  select * into current_row
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
  if current_row.status not in ('ACCEPTED_FOR_REVIEW','PACKAGE_PREPARING','RESUBMITTED') then
    return query select 'invalid_state'::text, null::uuid, null::integer, current_row.status, current_row.updated_at;
    return;
  end if;
  if current_row.assigned_counsel_id is null or current_row.law_firm_id is null
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
       or nullif(btrim(item->>'capturedAt'), '') is null then
      return query select 'invalid_item'::text, null::uuid, null::integer, current_row.status, current_row.updated_at;
      return;
    end if;
    if stable_id = any(seen_identifiers) then
      return query select 'duplicate_item'::text, null::uuid, null::integer, current_row.status, current_row.updated_at;
      return;
    end if;
    seen_identifiers := array_append(seen_identifiers, stable_id);
  end loop;

  select coalesce(max(p.package_version), 0) + 1
  into new_version
  from public.legal_review_packages p
  where p.review_id = current_row.id;

  insert into public.legal_review_packages (
    review_id, package_version, product_release_sha, methodology_version,
    regulatory_rules_version, manifest, package_manifest_digest,
    created_by_user_id, created_by_clerk_user_id
  ) values (
    current_row.id, new_version, p_product_release_sha, btrim(p_methodology_version),
    btrim(p_regulatory_rules_version), p_manifest, p_package_manifest_digest,
    p_created_by_user_id, p_created_by_clerk_user_id
  ) returning id into new_package_id;

  for item in select value from jsonb_array_elements(p_items) loop
    insert into public.legal_review_package_items (
      package_id, stable_identifier, content_reference, content_snapshot,
      content_digest, source_version, captured_at
    ) values (
      new_package_id,
      btrim(item->>'stableIdentifier'),
      nullif(btrim(item->>'contentReference'), ''),
      item->'contentSnapshot',
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

  return query select 'created'::text, new_package_id, new_version, current_row.status, current_row.updated_at;
exception
  when invalid_datetime_format then
    return query select 'invalid_item_timestamp'::text, null::uuid, null::integer, current_row.status, current_row.updated_at;
end
$$;

create or replace function public.request_legal_review_information_atomic(
  p_review_id uuid,
  p_expected_updated_at timestamptz,
  p_counsel_profile_id uuid,
  p_prompt text
)
returns table(outcome text, information_request_id uuid, review_status text, review_updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_row public.legal_review_requests%rowtype;
  request_id uuid;
begin
  select * into current_row from public.legal_review_requests where id = p_review_id for update;
  if not found then return query select 'not_found'::text, null::uuid, null::text, null::timestamptz; return; end if;
  if current_row.updated_at <> p_expected_updated_at then return query select 'state_changed'::text, null::uuid, current_row.status, current_row.updated_at; return; end if;
  if current_row.status <> 'IN_REVIEW' then return query select 'invalid_state'::text, null::uuid, current_row.status, current_row.updated_at; return; end if;
  if char_length(btrim(coalesce(p_prompt, ''))) < 2 then return query select 'invalid_input'::text, null::uuid, current_row.status, current_row.updated_at; return; end if;
  if current_row.assigned_counsel_id is distinct from p_counsel_profile_id
     or not exists (select 1 from public.legal_review_access_grants lag where lag.review_id = current_row.id and lag.counsel_profile_id = p_counsel_profile_id and lag.grant_scope = 'REVIEW' and lag.active and lag.revoked_at is null) then
    return query select 'counsel_not_authorized'::text, null::uuid, current_row.status, current_row.updated_at; return;
  end if;

  insert into public.legal_review_information_requests(review_id, requested_by_counsel_id, prompt)
  values (current_row.id, p_counsel_profile_id, btrim(p_prompt)) returning id into request_id;
  update public.legal_review_requests set status = 'INFORMATION_REQUESTED', updated_at = now() where id = current_row.id
  returning status, updated_at into current_row.status, current_row.updated_at;
  return query select 'requested'::text, request_id, current_row.status, current_row.updated_at;
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
returns table(outcome text, response_id uuid, review_status text, review_updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_row public.legal_review_requests%rowtype;
  new_response_id uuid;
begin
  if jsonb_typeof(p_response) <> 'object' or num_nonnulls(p_submitted_by_user_id, p_submitted_by_clerk_user_id) <> 1 then
    return query select 'invalid_input'::text, null::uuid, null::text, null::timestamptz; return;
  end if;
  select * into current_row from public.legal_review_requests where id = p_review_id and organization_id = p_organization_id for update;
  if not found then return query select 'not_found'::text, null::uuid, null::text, null::timestamptz; return; end if;
  if current_row.updated_at <> p_expected_updated_at then return query select 'state_changed'::text, null::uuid, current_row.status, current_row.updated_at; return; end if;
  if current_row.status <> 'INFORMATION_REQUESTED' then return query select 'invalid_state'::text, null::uuid, current_row.status, current_row.updated_at; return; end if;
  if not exists (select 1 from public.legal_review_information_requests ir where ir.id = p_information_request_id and ir.review_id = current_row.id and ir.status = 'OPEN') then
    return query select 'information_request_not_open'::text, null::uuid, current_row.status, current_row.updated_at; return;
  end if;

  insert into public.legal_review_information_responses(information_request_id, organization_id, response, submitted_by_user_id, submitted_by_clerk_user_id)
  values (p_information_request_id, p_organization_id, p_response, p_submitted_by_user_id, p_submitted_by_clerk_user_id)
  returning id into new_response_id;
  update public.legal_review_information_requests set status = 'ANSWERED', answered_at = now() where id = p_information_request_id;
  update public.legal_review_requests set status = 'IN_REVIEW', updated_at = now() where id = current_row.id
  returning status, updated_at into current_row.status, current_row.updated_at;
  return query select 'answered'::text, new_response_id, current_row.status, current_row.updated_at;
end
$$;

create or replace function public.issue_legal_review_decision_atomic(
  p_review_id uuid,
  p_expected_updated_at timestamptz,
  p_counsel_profile_id uuid,
  p_decision text,
  p_scope jsonb,
  p_jurisdiction text,
  p_rationale text,
  p_conditions jsonb,
  p_exclusions jsonb,
  p_valid_until timestamptz,
  p_signed_artifact_reference text,
  p_decision_digest text,
  p_remediation_items jsonb default '[]'::jsonb
)
returns table(outcome text, decision_id uuid, review_status text, review_updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_row public.legal_review_requests%rowtype;
  latest_package public.legal_review_packages%rowtype;
  new_decision_id uuid;
  item jsonb;
begin
  if p_decision not in ('ACCEPTED','ACCEPTED_WITH_CONDITIONS','REMEDIATION_REQUIRED','REJECTED','OUTSIDE_SCOPE')
     or jsonb_typeof(p_scope) <> 'object' or jsonb_typeof(p_conditions) <> 'array' or jsonb_typeof(p_exclusions) <> 'array'
     or jsonb_typeof(p_remediation_items) <> 'array' or char_length(btrim(coalesce(p_rationale, ''))) < 10
     or coalesce(p_decision_digest, '') !~ '^[a-f0-9]{64}$' then
    return query select 'invalid_input'::text, null::uuid, null::text, null::timestamptz; return;
  end if;
  select * into current_row from public.legal_review_requests where id = p_review_id for update;
  if not found then return query select 'not_found'::text, null::uuid, null::text, null::timestamptz; return; end if;
  if current_row.updated_at <> p_expected_updated_at then return query select 'state_changed'::text, null::uuid, current_row.status, current_row.updated_at; return; end if;
  if current_row.status <> 'IN_REVIEW' then return query select 'invalid_state'::text, null::uuid, current_row.status, current_row.updated_at; return; end if;
  if current_row.assigned_counsel_id is distinct from p_counsel_profile_id or current_row.law_firm_id is null
     or not exists (select 1 from public.legal_review_access_grants lag where lag.review_id = current_row.id and lag.counsel_profile_id = p_counsel_profile_id and lag.grant_scope = 'REVIEW' and lag.active and lag.revoked_at is null) then
    return query select 'counsel_not_authorized'::text, null::uuid, current_row.status, current_row.updated_at; return;
  end if;
  select * into latest_package from public.legal_review_packages p where p.review_id = current_row.id and p.finalized_at is not null order by p.package_version desc limit 1;
  if not found then return query select 'package_required'::text, null::uuid, current_row.status, current_row.updated_at; return; end if;
  if p_valid_until is not null and p_valid_until <= now() then return query select 'invalid_validity'::text, null::uuid, current_row.status, current_row.updated_at; return; end if;
  if p_decision = 'REMEDIATION_REQUIRED' and jsonb_array_length(p_remediation_items) = 0 then
    return query select 'remediation_items_required'::text, null::uuid, current_row.status, current_row.updated_at; return;
  end if;

  insert into public.legal_review_decisions(review_id, package_id, law_firm_id, counsel_id, decision, scope, jurisdiction, rationale, conditions, exclusions, valid_until, signed_artifact_reference, decision_digest)
  values (current_row.id, latest_package.id, current_row.law_firm_id, p_counsel_profile_id, p_decision, p_scope, btrim(p_jurisdiction), btrim(p_rationale), p_conditions, p_exclusions, p_valid_until, nullif(btrim(coalesce(p_signed_artifact_reference, '')), ''), p_decision_digest)
  returning id into new_decision_id;

  if p_decision = 'REMEDIATION_REQUIRED' then
    for item in select value from jsonb_array_elements(p_remediation_items) loop
      if nullif(btrim(item->>'stableFindingId'), '') is null or nullif(btrim(item->>'title'), '') is null or nullif(btrim(item->>'requiredAction'), '') is null
         or coalesce(item->>'severity', '') not in ('LOW','MEDIUM','HIGH','CRITICAL') then
        raise exception 'invalid remediation item';
      end if;
      insert into public.legal_review_remediation_items(review_id, decision_id, stable_finding_id, title, required_action, severity)
      values (current_row.id, new_decision_id, btrim(item->>'stableFindingId'), btrim(item->>'title'), btrim(item->>'requiredAction'), item->>'severity');
    end loop;
    update public.legal_review_requests set status = 'REMEDIATION_REQUIRED', updated_at = now() where id = current_row.id
    returning status, updated_at into current_row.status, current_row.updated_at;
  else
    update public.legal_review_requests set status = 'COMPLETED', completed_at = now(), updated_at = now() where id = current_row.id
    returning status, updated_at into current_row.status, current_row.updated_at;
  end if;

  return query select 'issued'::text, new_decision_id, current_row.status, current_row.updated_at;
end
$$;

create or replace function public.update_legal_review_remediation_atomic(
  p_review_id uuid,
  p_organization_id uuid,
  p_remediation_id uuid,
  p_expected_review_updated_at timestamptz,
  p_customer_response jsonb,
  p_mark_ready boolean
)
returns table(outcome text, remediation_status text, review_updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_row public.legal_review_requests%rowtype;
  next_status text;
begin
  if jsonb_typeof(p_customer_response) <> 'object' then return query select 'invalid_input'::text, null::text, null::timestamptz; return; end if;
  select * into current_row from public.legal_review_requests where id = p_review_id and organization_id = p_organization_id for update;
  if not found then return query select 'not_found'::text, null::text, null::timestamptz; return; end if;
  if current_row.updated_at <> p_expected_review_updated_at then return query select 'state_changed'::text, null::text, current_row.updated_at; return; end if;
  if current_row.status <> 'REMEDIATION_REQUIRED' then return query select 'invalid_state'::text, null::text, current_row.updated_at; return; end if;
  if not exists (select 1 from public.legal_review_remediation_items r where r.id = p_remediation_id and r.review_id = current_row.id and r.status in ('OPEN','IN_PROGRESS','READY_FOR_RESUBMISSION')) then
    return query select 'remediation_not_editable'::text, null::text, current_row.updated_at; return;
  end if;
  next_status := case when p_mark_ready then 'READY_FOR_RESUBMISSION' else 'IN_PROGRESS' end;
  update public.legal_review_remediation_items set customer_response = p_customer_response, status = next_status, updated_at = now() where id = p_remediation_id;
  update public.legal_review_requests set updated_at = now() where id = current_row.id returning updated_at into current_row.updated_at;
  return query select 'updated'::text, next_status, current_row.updated_at;
end
$$;

create or replace function public.resubmit_legal_review_atomic(
  p_review_id uuid,
  p_organization_id uuid,
  p_expected_updated_at timestamptz
)
returns table(outcome text, review_status text, review_updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_row public.legal_review_requests%rowtype;
begin
  select * into current_row from public.legal_review_requests where id = p_review_id and organization_id = p_organization_id for update;
  if not found then return query select 'not_found'::text, null::text, null::timestamptz; return; end if;
  if current_row.updated_at <> p_expected_updated_at then return query select 'state_changed'::text, current_row.status, current_row.updated_at; return; end if;
  if current_row.status <> 'REMEDIATION_REQUIRED' then return query select 'invalid_state'::text, current_row.status, current_row.updated_at; return; end if;
  if exists (select 1 from public.legal_review_remediation_items r where r.review_id = current_row.id and r.status not in ('READY_FOR_RESUBMISSION','ACCEPTED','CLOSED')) then
    return query select 'remediation_incomplete'::text, current_row.status, current_row.updated_at; return;
  end if;
  update public.legal_review_remediation_items set status = 'RESUBMITTED', updated_at = now() where review_id = current_row.id and status = 'READY_FOR_RESUBMISSION';
  update public.legal_review_requests set status = 'RESUBMITTED', updated_at = now() where id = current_row.id
  returning status, updated_at into current_row.status, current_row.updated_at;
  return query select 'resubmitted'::text, current_row.status, current_row.updated_at;
end
$$;

forbidden: -- marker intentionally invalid? no

-- Restrict every lifecycle RPC to the trusted backend.
revoke all on function public.create_legal_review_package_atomic(uuid,timestamptz,text,text,text,jsonb,text,jsonb,uuid,text) from public, anon, authenticated;
grant execute on function public.create_legal_review_package_atomic(uuid,timestamptz,text,text,text,jsonb,text,jsonb,uuid,text) to service_role;
revoke all on function public.request_legal_review_information_atomic(uuid,timestamptz,uuid,text) from public, anon, authenticated;
grant execute on function public.request_legal_review_information_atomic(uuid,timestamptz,uuid,text) to service_role;
revoke all on function public.respond_legal_review_information_atomic(uuid,timestamptz,uuid,uuid,jsonb,uuid,text) from public, anon, authenticated;
grant execute on function public.respond_legal_review_information_atomic(uuid,timestamptz,uuid,uuid,jsonb,uuid,text) to service_role;
revoke all on function public.issue_legal_review_decision_atomic(uuid,timestamptz,uuid,text,jsonb,text,text,jsonb,jsonb,timestamptz,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.issue_legal_review_decision_atomic(uuid,timestamptz,uuid,text,jsonb,text,text,jsonb,jsonb,timestamptz,text,text,jsonb) to service_role;
revoke all on function public.update_legal_review_remediation_atomic(uuid,uuid,uuid,timestamptz,jsonb,boolean) from public, anon, authenticated;
grant execute on function public.update_legal_review_remediation_atomic(uuid,uuid,uuid,timestamptz,jsonb,boolean) to service_role;
revoke all on function public.resubmit_legal_review_atomic(uuid,uuid,timestamptz) from public, anon, authenticated;
grant execute on function public.resubmit_legal_review_atomic(uuid,uuid,timestamptz) to service_role;

commit;
