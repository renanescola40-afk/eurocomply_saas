begin;

-- Server-only lifecycle gates for external Counsel. These functions do not verify
-- a real-world lawyer or activate a law-firm partnership; they only enforce the
-- repository workflow once verified records legitimately exist.

do $preconditions$
begin
  if to_regclass('public.legal_review_requests') is null
     or to_regclass('public.legal_review_access_grants') is null
     or to_regclass('public.counsel_profiles') is null
     or to_regclass('public.law_firms') is null then
    raise exception 'legal assurance V1 schema must exist before counsel gate migration';
  end if;
end
$preconditions$;

create or replace function public.assign_legal_review_counsel_atomic(
  p_review_id uuid,
  p_expected_updated_at timestamptz,
  p_law_firm_id uuid,
  p_counsel_profile_id uuid
)
returns table(outcome text, review_id uuid, review_status text, review_updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_row public.legal_review_requests%rowtype;
begin
  if p_review_id is null or p_expected_updated_at is null or p_law_firm_id is null or p_counsel_profile_id is null then
    return query select 'invalid_input'::text, null::uuid, null::text, null::timestamptz;
    return;
  end if;

  select * into current_row
  from public.legal_review_requests
  where id = p_review_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, null::text, null::timestamptz;
    return;
  end if;

  if current_row.updated_at <> p_expected_updated_at then
    return query select 'state_changed'::text, current_row.id, current_row.status, current_row.updated_at;
    return;
  end if;

  if current_row.status <> 'REQUESTED' then
    return query select 'invalid_state'::text, current_row.id, current_row.status, current_row.updated_at;
    return;
  end if;

  if not exists (
    select 1
    from public.law_firms lf
    join public.counsel_profiles cp on cp.law_firm_id = lf.id
    where lf.id = p_law_firm_id
      and lf.status = 'ACTIVE'
      and cp.id = p_counsel_profile_id
      and cp.active = true
      and cp.verification_status = 'VERIFIED'
  ) then
    return query select 'counsel_not_verified'::text, current_row.id, current_row.status, current_row.updated_at;
    return;
  end if;

  update public.legal_review_requests
  set law_firm_id = p_law_firm_id,
      assigned_counsel_id = p_counsel_profile_id,
      status = 'CONFLICT_CHECK_PENDING',
      conflict_check_status = 'PENDING',
      engagement_status = 'NOT_STARTED',
      updated_at = now()
  where id = current_row.id
  returning id, status, updated_at into current_row.id, current_row.status, current_row.updated_at;

  insert into public.legal_review_access_grants (
    review_id, law_firm_id, counsel_profile_id, grant_scope, active, granted_at
  ) values (
    current_row.id, p_law_firm_id, p_counsel_profile_id, 'CONFLICT_CHECK', true, now()
  )
  on conflict (review_id, counsel_profile_id, grant_scope)
  do update set active = true, revoked_at = null, granted_at = now();

  return query select 'assigned'::text, current_row.id, current_row.status, current_row.updated_at;
end
$$;

create or replace function public.counsel_legal_review_gate_atomic(
  p_review_id uuid,
  p_expected_updated_at timestamptz,
  p_counsel_profile_id uuid,
  p_action text,
  p_engagement_reference text default null
)
returns table(outcome text, review_id uuid, review_status text, review_updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_row public.legal_review_requests%rowtype;
  normalized_reference text := nullif(btrim(coalesce(p_engagement_reference, '')), '');
begin
  if p_review_id is null or p_expected_updated_at is null or p_counsel_profile_id is null or p_action is null then
    return query select 'invalid_input'::text, null::uuid, null::text, null::timestamptz;
    return;
  end if;

  select * into current_row
  from public.legal_review_requests
  where id = p_review_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, null::text, null::timestamptz;
    return;
  end if;

  if current_row.updated_at <> p_expected_updated_at then
    return query select 'state_changed'::text, current_row.id, current_row.status, current_row.updated_at;
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
         and lag.active = true
         and lag.revoked_at is null
     ) then
    return query select 'counsel_not_authorized'::text, current_row.id, current_row.status, current_row.updated_at;
    return;
  end if;

  if p_action = 'CONFLICT_ACCEPT' then
    if current_row.status <> 'CONFLICT_CHECK_PENDING' then
      return query select 'invalid_state'::text, current_row.id, current_row.status, current_row.updated_at;
      return;
    end if;

    update public.legal_review_requests
    set status = 'ENGAGEMENT_PENDING',
        conflict_check_status = 'ACCEPTED',
        conflict_checked_at = now(),
        engagement_status = 'PENDING',
        updated_at = now()
    where id = current_row.id
    returning id, status, updated_at into current_row.id, current_row.status, current_row.updated_at;

    update public.legal_review_access_grants
    set grant_scope = 'ENGAGEMENT'
    where review_id = current_row.id
      and counsel_profile_id = p_counsel_profile_id
      and active = true;

    return query select 'conflict_accepted'::text, current_row.id, current_row.status, current_row.updated_at;
    return;
  end if;

  if p_action = 'CONFLICT_DECLINE' then
    if current_row.status <> 'CONFLICT_CHECK_PENDING' then
      return query select 'invalid_state'::text, current_row.id, current_row.status, current_row.updated_at;
      return;
    end if;

    update public.legal_review_requests
    set status = 'DECLINED',
        conflict_check_status = 'DECLINED',
        conflict_checked_at = now(),
        updated_at = now()
    where id = current_row.id
    returning id, status, updated_at into current_row.id, current_row.status, current_row.updated_at;

    update public.legal_review_access_grants
    set active = false, revoked_at = now()
    where review_id = current_row.id
      and counsel_profile_id = p_counsel_profile_id
      and active = true;

    return query select 'conflict_declined'::text, current_row.id, current_row.status, current_row.updated_at;
    return;
  end if;

  if p_action = 'ENGAGEMENT_ACCEPT' then
    if current_row.status <> 'ENGAGEMENT_PENDING' then
      return query select 'invalid_state'::text, current_row.id, current_row.status, current_row.updated_at;
      return;
    end if;
    if normalized_reference is null then
      return query select 'engagement_reference_required'::text, current_row.id, current_row.status, current_row.updated_at;
      return;
    end if;

    update public.legal_review_requests
    set status = 'ACCEPTED_FOR_REVIEW',
        engagement_status = 'ACCEPTED',
        engagement_reference = normalized_reference,
        engagement_accepted_at = now(),
        accepted_at = coalesce(accepted_at, now()),
        updated_at = now()
    where id = current_row.id
    returning id, status, updated_at into current_row.id, current_row.status, current_row.updated_at;

    update public.legal_review_access_grants
    set grant_scope = 'REVIEW'
    where review_id = current_row.id
      and counsel_profile_id = p_counsel_profile_id
      and active = true;

    return query select 'engagement_accepted'::text, current_row.id, current_row.status, current_row.updated_at;
    return;
  end if;

  if p_action = 'ENGAGEMENT_DECLINE' then
    if current_row.status <> 'ENGAGEMENT_PENDING' then
      return query select 'invalid_state'::text, current_row.id, current_row.status, current_row.updated_at;
      return;
    end if;

    update public.legal_review_requests
    set status = 'DECLINED',
        engagement_status = 'DECLINED',
        updated_at = now()
    where id = current_row.id
    returning id, status, updated_at into current_row.id, current_row.status, current_row.updated_at;

    update public.legal_review_access_grants
    set active = false, revoked_at = now()
    where review_id = current_row.id
      and counsel_profile_id = p_counsel_profile_id
      and active = true;

    return query select 'engagement_declined'::text, current_row.id, current_row.status, current_row.updated_at;
    return;
  end if;

  return query select 'unsupported_action'::text, current_row.id, current_row.status, current_row.updated_at;
end
$$;

revoke all on function public.assign_legal_review_counsel_atomic(uuid,timestamptz,uuid,uuid) from public, anon, authenticated;
grant execute on function public.assign_legal_review_counsel_atomic(uuid,timestamptz,uuid,uuid) to service_role;
revoke all on function public.counsel_legal_review_gate_atomic(uuid,timestamptz,uuid,text,text) from public, anon, authenticated;
grant execute on function public.counsel_legal_review_gate_atomic(uuid,timestamptz,uuid,text,text) to service_role;

do $postconditions$
begin
  if has_function_privilege('authenticated', 'public.assign_legal_review_counsel_atomic(uuid,timestamptz,uuid,uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.counsel_legal_review_gate_atomic(uuid,timestamptz,uuid,text,text)', 'EXECUTE') then
    raise exception 'Counsel lifecycle authority must remain backend-only';
  end if;
end
$postconditions$;

commit;
