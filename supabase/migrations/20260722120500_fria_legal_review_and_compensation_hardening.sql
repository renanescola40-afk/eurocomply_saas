begin;

alter table public.ai_fria_assessments
  add column if not exists legal_reviewer_id uuid;

alter table public.ai_fria_assessments
  drop constraint if exists ai_fria_legal_review_actor_required;
alter table public.ai_fria_assessments
  add constraint ai_fria_legal_review_actor_required
  check (
    legal_review_completed_at is null
    or legal_reviewer_id is not null
  ) not valid;

alter table public.ai_fria_assessments
  drop constraint if exists ai_fria_legal_reviewer_separation;
alter table public.ai_fria_assessments
  add constraint ai_fria_legal_reviewer_separation
  check (
    legal_reviewer_id is null
    or legal_reviewer_id <> owner_id
  ) not valid;

create or replace function public.enforce_fria_member_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  scoped_user_id uuid;
  scoped_users uuid[] := array[]::uuid[];
begin
  if tg_table_name = 'ai_fria_assessments' then
    scoped_users := array[
      new.owner_id,
      new.reviewer_id,
      new.approver_id,
      new.legal_reviewer_id
    ];
  elsif tg_table_name = 'ai_fria_evidence' then
    scoped_users := array[new.submitted_by, new.reviewed_by];
  elsif tg_table_name = 'ai_fria_decisions' then
    scoped_users := array[new.actor_id];
  else
    raise exception 'unsupported_fria_member_scope_table'
      using errcode = 'check_violation';
  end if;

  foreach scoped_user_id in array scoped_users loop
    if scoped_user_id is null then
      continue;
    end if;

    if not exists (
      select 1
      from public.organization_members membership
      where membership.organization_id = new.organization_id
        and membership.user_id = scoped_user_id
    ) then
      raise exception 'fria_user_not_organization_member'
        using errcode = 'check_violation';
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function public.enforce_fria_member_scope() from public;
revoke all on function public.enforce_fria_member_scope() from anon;
revoke all on function public.enforce_fria_member_scope() from authenticated;

drop trigger if exists enforce_fria_assessment_member_scope
  on public.ai_fria_assessments;
create trigger enforce_fria_assessment_member_scope
before insert or update of organization_id, owner_id, reviewer_id, approver_id, legal_reviewer_id
on public.ai_fria_assessments
for each row
execute function public.enforce_fria_member_scope();

create or replace function public.set_fria_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.current_setting('app.fria_preserve_updated_at', true) = 'on' then
    return new;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.approve_fria_assessment_atomic(
  p_organization_id uuid,
  p_assessment_id uuid,
  p_expected_updated_at timestamptz,
  p_actor_user_id uuid,
  p_rationale text
)
returns table (
  outcome text,
  assessment jsonb,
  decision_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.ai_fria_assessments%rowtype;
  v_updated public.ai_fria_assessments%rowtype;
  v_decision_id uuid;
  v_full_assessment_required boolean;
begin
  if p_organization_id is null
    or p_assessment_id is null
    or p_expected_updated_at is null
    or p_actor_user_id is null
    or nullif(pg_catalog.btrim(p_rationale), '') is null
  then
    return query select 'invalid_input'::text, null::jsonb, null::uuid;
    return;
  end if;

  select assessment_record.*
    into v_current
  from public.ai_fria_assessments assessment_record
  where assessment_record.organization_id = p_organization_id
    and assessment_record.id = p_assessment_id
  for update;

  if not found then
    return query select 'not_found'::text, null::jsonb, null::uuid;
    return;
  end if;

  if v_current.updated_at is distinct from p_expected_updated_at then
    return query select 'state_changed'::text, null::jsonb, null::uuid;
    return;
  end if;

  if v_current.approver_id is distinct from p_actor_user_id then
    return query select 'approver_required'::text, null::jsonb, null::uuid;
    return;
  end if;

  v_full_assessment_required := v_current.applicability = 'required';

  if v_current.stage in ('approved', 'retired')
    or v_current.applicability = 'uncertain'
    or v_current.reviewer_id is null
    or v_current.approver_id is null
    or v_current.reviewer_id = v_current.owner_id
    or v_current.approver_id = v_current.owner_id
    or v_current.approver_id = v_current.reviewer_id
    or nullif(pg_catalog.btrim(coalesce(v_current.context ->> 'intendedPurpose', '')), '') is null
    or (
      v_current.applicability = 'not_required'
      and (
        v_current.legal_reviewer_id is null
        or v_current.legal_review_completed_at is null
      )
    )
    or (
      v_full_assessment_required
      and (
        coalesce((v_current.context ->> 'vulnerableGroupsConsidered')::boolean, false) is false
        or jsonb_typeof(v_current.affected_groups) <> 'array'
        or jsonb_array_length(v_current.affected_groups) = 0
        or jsonb_typeof(v_current.rights_map) <> 'array'
        or jsonb_array_length(v_current.rights_map) = 0
        or jsonb_typeof(v_current.impact_analysis) <> 'object'
        or v_current.impact_analysis = '{}'::jsonb
        or jsonb_typeof(v_current.mitigation_plan) <> 'object'
        or v_current.mitigation_plan = '{}'::jsonb
        or jsonb_typeof(v_current.oversight_plan) <> 'object'
        or v_current.oversight_plan = '{}'::jsonb
        or jsonb_typeof(v_current.complaints_redress) <> 'object'
        or v_current.complaints_redress = '{}'::jsonb
        or coalesce((v_current.context ->> 'monitoringPlanComplete')::boolean, false) is false
        or coalesce((v_current.context ->> 'dataProtectionCoordinationComplete')::boolean, false) is false
        or v_current.highest_residual_impact = 'unknown'
        or (
          v_current.highest_residual_impact in ('high', 'critical')
          and (
            v_current.legal_reviewer_id is null
            or v_current.legal_review_completed_at is null
          )
        )
      )
    )
  then
    return query select 'requirements_not_met'::text, null::jsonb, null::uuid;
    return;
  end if;

  update public.ai_fria_assessments assessment_record
  set
    stage = 'approved',
    approved_at = now()
  where assessment_record.organization_id = p_organization_id
    and assessment_record.id = p_assessment_id
    and assessment_record.updated_at is not distinct from p_expected_updated_at
  returning assessment_record.* into v_updated;

  if not found then
    return query select 'state_changed'::text, null::jsonb, null::uuid;
    return;
  end if;

  insert into public.ai_fria_decisions (
    organization_id,
    assessment_id,
    decision,
    rationale,
    actor_id
  ) values (
    p_organization_id,
    p_assessment_id,
    'approved',
    pg_catalog.btrim(p_rationale),
    p_actor_user_id
  )
  returning id into v_decision_id;

  return query select 'approved'::text, to_jsonb(v_updated), v_decision_id;
end;
$$;

revoke all on function public.approve_fria_assessment_atomic(uuid, uuid, timestamptz, uuid, text) from public;
revoke all on function public.approve_fria_assessment_atomic(uuid, uuid, timestamptz, uuid, text) from anon;
revoke all on function public.approve_fria_assessment_atomic(uuid, uuid, timestamptz, uuid, text) from authenticated;
grant execute on function public.approve_fria_assessment_atomic(uuid, uuid, timestamptz, uuid, text) to service_role;

create or replace function public.compensate_fria_approval_audit_failure(
  p_organization_id uuid,
  p_assessment_id uuid,
  p_decision_id uuid,
  p_approved_updated_at timestamptz,
  p_previous_stage text,
  p_previous_approved_at timestamptz,
  p_previous_updated_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.ai_fria_assessments%rowtype;
begin
  if p_organization_id is null
    or p_assessment_id is null
    or p_decision_id is null
    or p_approved_updated_at is null
    or p_previous_stage is null
    or p_previous_updated_at is null
  then
    return false;
  end if;

  select assessment_record.*
    into v_current
  from public.ai_fria_assessments assessment_record
  where assessment_record.organization_id = p_organization_id
    and assessment_record.id = p_assessment_id
  for update;

  if not found or v_current.updated_at is distinct from p_approved_updated_at then
    return false;
  end if;

  if not exists (
    select 1
    from public.ai_fria_decisions decision_record
    where decision_record.organization_id = p_organization_id
      and decision_record.assessment_id = p_assessment_id
      and decision_record.id = p_decision_id
      and decision_record.decision = 'approved'
  ) then
    return false;
  end if;

  delete from public.ai_fria_decisions decision_record
  where decision_record.organization_id = p_organization_id
    and decision_record.assessment_id = p_assessment_id
    and decision_record.id = p_decision_id;

  perform pg_catalog.set_config('app.fria_preserve_updated_at', 'on', true);

  update public.ai_fria_assessments assessment_record
  set
    stage = p_previous_stage,
    approved_at = p_previous_approved_at,
    updated_at = p_previous_updated_at
  where assessment_record.organization_id = p_organization_id
    and assessment_record.id = p_assessment_id;

  return found;
end;
$$;

revoke all on function public.compensate_fria_approval_audit_failure(uuid, uuid, uuid, timestamptz, text, timestamptz, timestamptz) from public;
revoke all on function public.compensate_fria_approval_audit_failure(uuid, uuid, uuid, timestamptz, text, timestamptz, timestamptz) from anon;
revoke all on function public.compensate_fria_approval_audit_failure(uuid, uuid, uuid, timestamptz, text, timestamptz, timestamptz) from authenticated;
grant execute on function public.compensate_fria_approval_audit_failure(uuid, uuid, uuid, timestamptz, text, timestamptz, timestamptz) to service_role;

notify pgrst, 'reload schema';

commit;
