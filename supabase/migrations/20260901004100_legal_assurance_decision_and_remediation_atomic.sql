begin;

-- Legal Assurance professional decision + remediation lifecycle.
-- Professional conclusions remain authored by verified external Counsel; the
-- database only enforces identity, matter, package, version and state integrity.

do $preconditions$
begin
  if to_regclass('public.legal_review_requests') is null
     or to_regclass('public.legal_review_packages') is null
     or to_regclass('public.legal_review_decisions') is null
     or to_regclass('public.legal_review_remediation_items') is null
     or to_regclass('public.legal_review_access_grants') is null
     or to_regclass('public.counsel_profiles') is null then
    raise exception 'legal assurance decision dependency spine is incomplete';
  end if;
end
$preconditions$;

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
returns table(
  outcome text,
  decision_id uuid,
  review_status text,
  review_updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_row public.legal_review_requests%rowtype;
  latest_package public.legal_review_packages%rowtype;
  previous_decision_id uuid;
  new_decision_id uuid;
  item jsonb;
begin
  if p_review_id is null
     or p_expected_updated_at is null
     or p_counsel_profile_id is null
     or p_decision not in (
       'ACCEPTED',
       'ACCEPTED_WITH_CONDITIONS',
       'REMEDIATION_REQUIRED',
       'REJECTED',
       'OUTSIDE_SCOPE'
     )
     or jsonb_typeof(p_scope) <> 'object'
     or nullif(btrim(coalesce(p_jurisdiction, '')), '') is null
     or char_length(btrim(coalesce(p_rationale, ''))) < 10
     or jsonb_typeof(p_conditions) <> 'array'
     or jsonb_typeof(p_exclusions) <> 'array'
     or jsonb_typeof(p_remediation_items) <> 'array'
     or coalesce(p_decision_digest, '') !~ '^[a-f0-9]{64}$' then
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
     or current_row.law_firm_id is null
     or not exists (
       select 1
       from public.counsel_profiles cp
       where cp.id = p_counsel_profile_id
         and cp.law_firm_id = current_row.law_firm_id
         and cp.active = true
         and cp.verification_status = 'VERIFIED'
     )
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

  select *
  into latest_package
  from public.legal_review_packages p
  where p.review_id = current_row.id
    and p.finalized_at is not null
  order by p.package_version desc
  limit 1;

  if not found then
    return query select 'package_required'::text, null::uuid, current_row.status, current_row.updated_at;
    return;
  end if;

  if p_valid_until is not null and p_valid_until <= now() then
    return query select 'invalid_validity'::text, null::uuid, current_row.status, current_row.updated_at;
    return;
  end if;

  if p_decision = 'REMEDIATION_REQUIRED' and jsonb_array_length(p_remediation_items) = 0 then
    return query select 'remediation_items_required'::text, null::uuid, current_row.status, current_row.updated_at;
    return;
  end if;

  select d.id
  into previous_decision_id
  from public.legal_review_decisions d
  where d.review_id = current_row.id
  order by d.issued_at desc, d.created_at desc
  limit 1;

  insert into public.legal_review_decisions (
    review_id,
    package_id,
    law_firm_id,
    counsel_id,
    decision,
    scope,
    jurisdiction,
    rationale,
    conditions,
    exclusions,
    valid_until,
    signed_artifact_reference,
    decision_digest,
    supersedes_decision_id
  ) values (
    current_row.id,
    latest_package.id,
    current_row.law_firm_id,
    p_counsel_profile_id,
    p_decision,
    p_scope,
    btrim(p_jurisdiction),
    btrim(p_rationale),
    p_conditions,
    p_exclusions,
    p_valid_until,
    nullif(btrim(coalesce(p_signed_artifact_reference, '')), ''),
    p_decision_digest,
    previous_decision_id
  )
  returning id into new_decision_id;

  if p_decision = 'REMEDIATION_REQUIRED' then
    for item in select value from jsonb_array_elements(p_remediation_items) loop
      if nullif(btrim(item->>'stableFindingId'), '') is null
         or nullif(btrim(item->>'title'), '') is null
         or nullif(btrim(item->>'requiredAction'), '') is null
         or coalesce(item->>'severity', '') not in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') then
        raise exception 'invalid remediation item';
      end if;

      insert into public.legal_review_remediation_items (
        review_id,
        decision_id,
        stable_finding_id,
        title,
        required_action,
        severity,
        status,
        customer_response,
        updated_at
      ) values (
        current_row.id,
        new_decision_id,
        btrim(item->>'stableFindingId'),
        btrim(item->>'title'),
        btrim(item->>'requiredAction'),
        item->>'severity',
        'OPEN',
        '{}'::jsonb,
        now()
      )
      on conflict (review_id, stable_finding_id)
      do update set
        decision_id = excluded.decision_id,
        title = excluded.title,
        required_action = excluded.required_action,
        severity = excluded.severity,
        status = 'OPEN',
        customer_response = '{}'::jsonb,
        updated_at = now();
    end loop;

    update public.legal_review_requests
    set status = 'REMEDIATION_REQUIRED', updated_at = now()
    where id = current_row.id
    returning status, updated_at into current_row.status, current_row.updated_at;
  else
    update public.legal_review_requests
    set status = 'COMPLETED', completed_at = now(), updated_at = now()
    where id = current_row.id
    returning status, updated_at into current_row.status, current_row.updated_at;
  end if;

  return query
    select 'issued'::text, new_decision_id, current_row.status, current_row.updated_at;
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
returns table(
  outcome text,
  remediation_status text,
  review_updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_row public.legal_review_requests%rowtype;
  next_status text;
begin
  if p_review_id is null
     or p_organization_id is null
     or p_remediation_id is null
     or p_expected_review_updated_at is null
     or jsonb_typeof(p_customer_response) <> 'object'
     or p_mark_ready is null then
    return query select 'invalid_input'::text, null::text, null::timestamptz;
    return;
  end if;

  select *
  into current_row
  from public.legal_review_requests
  where id = p_review_id
    and organization_id = p_organization_id
  for update;

  if not found then
    return query select 'not_found'::text, null::text, null::timestamptz;
    return;
  end if;

  if current_row.updated_at <> p_expected_review_updated_at then
    return query select 'state_changed'::text, null::text, current_row.updated_at;
    return;
  end if;

  if current_row.status <> 'REMEDIATION_REQUIRED' then
    return query select 'invalid_state'::text, null::text, current_row.updated_at;
    return;
  end if;

  if not exists (
    select 1
    from public.legal_review_remediation_items r
    where r.id = p_remediation_id
      and r.review_id = current_row.id
      and r.status in ('OPEN', 'IN_PROGRESS', 'READY_FOR_RESUBMISSION')
  ) then
    return query select 'remediation_not_editable'::text, null::text, current_row.updated_at;
    return;
  end if;

  next_status := case
    when p_mark_ready then 'READY_FOR_RESUBMISSION'
    else 'IN_PROGRESS'
  end;

  update public.legal_review_remediation_items
  set customer_response = p_customer_response,
      status = next_status,
      updated_at = now()
  where id = p_remediation_id;

  update public.legal_review_requests
  set updated_at = now()
  where id = current_row.id
  returning updated_at into current_row.updated_at;

  return query
    select 'updated'::text, next_status, current_row.updated_at;
end
$$;

create or replace function public.resubmit_legal_review_atomic(
  p_review_id uuid,
  p_organization_id uuid,
  p_expected_updated_at timestamptz
)
returns table(
  outcome text,
  review_status text,
  review_updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_row public.legal_review_requests%rowtype;
begin
  if p_review_id is null
     or p_organization_id is null
     or p_expected_updated_at is null then
    return query select 'invalid_input'::text, null::text, null::timestamptz;
    return;
  end if;

  select *
  into current_row
  from public.legal_review_requests
  where id = p_review_id
    and organization_id = p_organization_id
  for update;

  if not found then
    return query select 'not_found'::text, null::text, null::timestamptz;
    return;
  end if;

  if current_row.updated_at <> p_expected_updated_at then
    return query select 'state_changed'::text, current_row.status, current_row.updated_at;
    return;
  end if;

  if current_row.status <> 'REMEDIATION_REQUIRED' then
    return query select 'invalid_state'::text, current_row.status, current_row.updated_at;
    return;
  end if;

  if not exists (
    select 1
    from public.legal_review_remediation_items r
    where r.review_id = current_row.id
  ) then
    return query select 'remediation_required'::text, current_row.status, current_row.updated_at;
    return;
  end if;

  if exists (
    select 1
    from public.legal_review_remediation_items r
    where r.review_id = current_row.id
      and r.status not in ('READY_FOR_RESUBMISSION', 'ACCEPTED', 'CLOSED')
  ) then
    return query select 'remediation_incomplete'::text, current_row.status, current_row.updated_at;
    return;
  end if;

  update public.legal_review_remediation_items
  set status = 'RESUBMITTED', updated_at = now()
  where review_id = current_row.id
    and status = 'READY_FOR_RESUBMISSION';

  update public.legal_review_requests
  set status = 'RESUBMITTED', updated_at = now()
  where id = current_row.id
  returning status, updated_at into current_row.status, current_row.updated_at;

  return query
    select 'resubmitted'::text, current_row.status, current_row.updated_at;
end
$$;

revoke all on function public.issue_legal_review_decision_atomic(uuid,timestamptz,uuid,text,jsonb,text,text,jsonb,jsonb,timestamptz,text,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.issue_legal_review_decision_atomic(uuid,timestamptz,uuid,text,jsonb,text,text,jsonb,jsonb,timestamptz,text,text,jsonb)
  to service_role;

revoke all on function public.update_legal_review_remediation_atomic(uuid,uuid,uuid,timestamptz,jsonb,boolean)
  from public, anon, authenticated;
grant execute on function public.update_legal_review_remediation_atomic(uuid,uuid,uuid,timestamptz,jsonb,boolean)
  to service_role;

revoke all on function public.resubmit_legal_review_atomic(uuid,uuid,timestamptz)
  from public, anon, authenticated;
grant execute on function public.resubmit_legal_review_atomic(uuid,uuid,timestamptz)
  to service_role;

do $postconditions$
begin
  if has_function_privilege(
       'authenticated',
       'public.issue_legal_review_decision_atomic(uuid,timestamptz,uuid,text,jsonb,text,text,jsonb,jsonb,timestamptz,text,text,jsonb)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.update_legal_review_remediation_atomic(uuid,uuid,uuid,timestamptz,jsonb,boolean)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.resubmit_legal_review_atomic(uuid,uuid,timestamptz)',
       'EXECUTE'
     ) then
    raise exception 'legal assurance decision/remediation authority must remain backend-only';
  end if;
end
$postconditions$;

commit;
