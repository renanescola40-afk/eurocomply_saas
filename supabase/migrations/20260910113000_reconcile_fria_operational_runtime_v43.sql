begin;

-- Forward-only reconciliation for the FRIA runtime contract that is consumed by
-- the current application but absent from Production. Do not replay the
-- historical migration wholesale: Production already owns newer RLS/payment
-- policies and this migration must not weaken or replace them.

do $prerequisites$
begin
  if to_regclass('public.ai_systems') is null
     or to_regclass('public.ai_fria_assessments') is null
     or to_regclass('public.ai_fria_evidence') is null
     or to_regclass('public.ai_fria_decisions') is null then
    raise exception 'FRIA base relations are required before runtime reconciliation';
  end if;
end
$prerequisites$;

create unique index if not exists ai_systems_organization_id_id_uidx
  on public.ai_systems (organization_id, id);

-- Production evidence on 2026-09-10 showed no orphaned rows for either scope.
-- Install and validate the missing assessment ownership/system constraints.
do $constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ai_fria_assessments'::regclass
      and conname = 'ai_fria_assessments_organization_fk'
  ) then
    alter table public.ai_fria_assessments
      add constraint ai_fria_assessments_organization_fk
      foreign key (organization_id)
      references public.organizations(id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ai_fria_assessments'::regclass
      and conname = 'ai_fria_assessments_system_scope_fk'
  ) then
    alter table public.ai_fria_assessments
      add constraint ai_fria_assessments_system_scope_fk
      foreign key (organization_id, ai_system_id)
      references public.ai_systems(organization_id, id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ai_fria_assessments'::regclass
      and conname = 'ai_fria_legal_review_actor_required'
  ) then
    alter table public.ai_fria_assessments
      add constraint ai_fria_legal_review_actor_required
      check (legal_review_completed_at is null or legal_reviewer_id is not null)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ai_fria_assessments'::regclass
      and conname = 'ai_fria_legal_reviewer_separation'
  ) then
    alter table public.ai_fria_assessments
      add constraint ai_fria_legal_reviewer_separation
      check (legal_reviewer_id is null or legal_reviewer_id <> owner_id)
      not valid;
  end if;
end
$constraints$;

alter table public.ai_fria_assessments validate constraint ai_fria_assessments_organization_fk;
alter table public.ai_fria_assessments validate constraint ai_fria_assessments_system_scope_fk;
alter table public.ai_fria_assessments validate constraint ai_fria_legal_review_actor_required;
alter table public.ai_fria_assessments validate constraint ai_fria_legal_reviewer_separation;

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
    scoped_users := array[new.owner_id, new.reviewer_id, new.approver_id, new.legal_reviewer_id];
  elsif tg_table_name = 'ai_fria_evidence' then
    scoped_users := array[new.submitted_by, new.reviewed_by];
  elsif tg_table_name = 'ai_fria_decisions' then
    scoped_users := array[new.actor_id];
  else
    raise exception 'unsupported_fria_member_scope_table' using errcode = 'check_violation';
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
        and lower(coalesce(membership.status, '')) = 'active'
    ) then
      raise exception 'fria_user_not_active_organization_member'
        using errcode = 'check_violation';
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function public.enforce_fria_member_scope() from public, anon, authenticated;

drop trigger if exists enforce_fria_assessment_member_scope on public.ai_fria_assessments;
create trigger enforce_fria_assessment_member_scope
before insert or update of organization_id, owner_id, reviewer_id, approver_id, legal_reviewer_id
on public.ai_fria_assessments
for each row execute function public.enforce_fria_member_scope();

drop trigger if exists enforce_fria_evidence_member_scope on public.ai_fria_evidence;
create trigger enforce_fria_evidence_member_scope
before insert or update of organization_id, submitted_by, reviewed_by
on public.ai_fria_evidence
for each row execute function public.enforce_fria_member_scope();

drop trigger if exists enforce_fria_decision_member_scope on public.ai_fria_decisions;
create trigger enforce_fria_decision_member_scope
before insert or update of organization_id, actor_id
on public.ai_fria_decisions
for each row execute function public.enforce_fria_member_scope();

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

revoke all on function public.set_fria_updated_at() from public, anon, authenticated;

drop trigger if exists set_fria_assessment_updated_at on public.ai_fria_assessments;
create trigger set_fria_assessment_updated_at
before update on public.ai_fria_assessments
for each row execute function public.set_fria_updated_at();

create or replace function public.create_fria_assessment_atomic(
  p_organization_id uuid,
  p_ai_system_id uuid,
  p_actor_user_id uuid,
  p_applicability text,
  p_context jsonb,
  p_review_due_at timestamptz default null
)
returns table (outcome text, assessment jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version integer;
  v_assessment public.ai_fria_assessments%rowtype;
begin
  if p_organization_id is null
    or p_ai_system_id is null
    or p_actor_user_id is null
    or p_applicability not in ('required', 'not_required', 'uncertain')
    or p_context is null
    or jsonb_typeof(p_context) <> 'object'
  then
    return query select 'invalid_input'::text, null::jsonb;
    return;
  end if;

  if not exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = p_organization_id
      and membership.user_id = p_actor_user_id
      and lower(coalesce(membership.status, '')) = 'active'
  ) then
    return query select 'actor_not_member'::text, null::jsonb;
    return;
  end if;

  if not exists (
    select 1 from public.ai_systems system_record
    where system_record.organization_id = p_organization_id
      and system_record.id = p_ai_system_id
  ) then
    return query select 'system_not_found'::text, null::jsonb;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_organization_id::text || ':' || p_ai_system_id::text, 0)
  );

  select coalesce(max(existing.version), 0) + 1
    into v_version
  from public.ai_fria_assessments existing
  where existing.organization_id = p_organization_id
    and existing.ai_system_id = p_ai_system_id;

  insert into public.ai_fria_assessments (
    organization_id, ai_system_id, version, applicability, stage, context,
    owner_id, highest_residual_impact, review_due_at
  ) values (
    p_organization_id, p_ai_system_id, v_version, p_applicability,
    case when p_applicability = 'uncertain' then 'applicability_review' else 'draft' end,
    p_context, p_actor_user_id, 'unknown', p_review_due_at
  ) returning * into v_assessment;

  return query select 'created'::text, to_jsonb(v_assessment);
end;
$$;

revoke all on function public.create_fria_assessment_atomic(uuid, uuid, uuid, text, jsonb, timestamptz)
  from public, anon, authenticated;
grant execute on function public.create_fria_assessment_atomic(uuid, uuid, uuid, text, jsonb, timestamptz)
  to service_role;

create or replace function public.approve_fria_assessment_atomic(
  p_organization_id uuid,
  p_assessment_id uuid,
  p_expected_updated_at timestamptz,
  p_actor_user_id uuid,
  p_rationale text
)
returns table (outcome text, assessment jsonb, decision_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.ai_fria_assessments%rowtype;
  v_updated public.ai_fria_assessments%rowtype;
  v_decision_id uuid;
  v_full_assessment_required boolean;
  v_required_control_ids text[];
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

  select assessment_record.* into v_current
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
  v_required_control_ids := case
    when v_full_assessment_required then
      array['FRIA-01','FRIA-02','FRIA-03','FRIA-04','FRIA-05','FRIA-06','FRIA-07','FRIA-08','FRIA-09','FRIA-10','FRIA-11','FRIA-12','FRIA-13','FRIA-14']::text[]
    else array['FRIA-01','FRIA-15']::text[]
  end;

  if v_current.highest_residual_impact in ('high', 'critical')
    and not ('FRIA-15' = any(v_required_control_ids)) then
    v_required_control_ids := pg_catalog.array_append(v_required_control_ids, 'FRIA-15');
  end if;

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
      and (v_current.legal_reviewer_id is null or v_current.legal_review_completed_at is null)
    )
    or (
      v_full_assessment_required and (
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
          and (v_current.legal_reviewer_id is null or v_current.legal_review_completed_at is null)
        )
      )
    )
    or exists (
      select 1
      from pg_catalog.unnest(v_required_control_ids) required_control(control_id)
      where not exists (
        select 1
        from public.ai_fria_evidence evidence_record
        where evidence_record.organization_id = p_organization_id
          and evidence_record.assessment_id = p_assessment_id
          and evidence_record.control_id = required_control.control_id
          and evidence_record.status in ('submitted', 'accepted')
          and (
            nullif(pg_catalog.btrim(coalesce(evidence_record.storage_reference, '')), '') is not null
            or evidence_record.sha256_digest is not null
          )
      )
    )
  then
    return query select 'requirements_not_met'::text, null::jsonb, null::uuid;
    return;
  end if;

  update public.ai_fria_assessments assessment_record
  set stage = 'approved', approved_at = now()
  where assessment_record.organization_id = p_organization_id
    and assessment_record.id = p_assessment_id
    and assessment_record.updated_at is not distinct from p_expected_updated_at
  returning assessment_record.* into v_updated;

  if not found then
    return query select 'state_changed'::text, null::jsonb, null::uuid;
    return;
  end if;

  insert into public.ai_fria_decisions (
    organization_id, assessment_id, decision, rationale, actor_id
  ) values (
    p_organization_id, p_assessment_id, 'approved', pg_catalog.btrim(p_rationale), p_actor_user_id
  ) returning id into v_decision_id;

  return query select 'approved'::text, to_jsonb(v_updated), v_decision_id;
end;
$$;

revoke all on function public.approve_fria_assessment_atomic(uuid, uuid, timestamptz, uuid, text)
  from public, anon, authenticated;
grant execute on function public.approve_fria_assessment_atomic(uuid, uuid, timestamptz, uuid, text)
  to service_role;

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

  select assessment_record.* into v_current
  from public.ai_fria_assessments assessment_record
  where assessment_record.organization_id = p_organization_id
    and assessment_record.id = p_assessment_id
  for update;

  if not found or v_current.updated_at is distinct from p_approved_updated_at then
    return false;
  end if;

  if not exists (
    select 1 from public.ai_fria_decisions decision_record
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
  set stage = p_previous_stage,
      approved_at = p_previous_approved_at,
      updated_at = p_previous_updated_at
  where assessment_record.organization_id = p_organization_id
    and assessment_record.id = p_assessment_id;

  return found;
end;
$$;

revoke all on function public.compensate_fria_approval_audit_failure(uuid, uuid, uuid, timestamptz, text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.compensate_fria_approval_audit_failure(uuid, uuid, uuid, timestamptz, text, timestamptz, timestamptz)
  to service_role;

-- Preserve the current paid/read RLS model; this migration intentionally does
-- not replace the live payment_first_commercial_authority or member policies.
alter table public.ai_fria_assessments enable row level security;
alter table public.ai_fria_assessments force row level security;
alter table public.ai_fria_evidence enable row level security;
alter table public.ai_fria_evidence force row level security;
alter table public.ai_fria_decisions enable row level security;
alter table public.ai_fria_decisions force row level security;

revoke insert, update, delete on public.ai_fria_assessments from anon, authenticated;
revoke insert, update, delete on public.ai_fria_evidence from anon, authenticated;
revoke insert, update, delete on public.ai_fria_decisions from anon, authenticated;

do $verify$
begin
  if to_regprocedure('public.create_fria_assessment_atomic(uuid,uuid,uuid,text,jsonb,timestamptz)') is null
     or to_regprocedure('public.approve_fria_assessment_atomic(uuid,uuid,timestamptz,uuid,text)') is null
     or to_regprocedure('public.compensate_fria_approval_audit_failure(uuid,uuid,uuid,timestamptz,text,timestamptz,timestamptz)') is null then
    raise exception 'FRIA runtime RPC reconciliation incomplete';
  end if;

  if has_function_privilege('anon', 'public.create_fria_assessment_atomic(uuid,uuid,uuid,text,jsonb,timestamptz)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.create_fria_assessment_atomic(uuid,uuid,uuid,text,jsonb,timestamptz)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.create_fria_assessment_atomic(uuid,uuid,uuid,text,jsonb,timestamptz)', 'EXECUTE') then
    raise exception 'FRIA create RPC ACL is not service-role-only';
  end if;
end
$verify$;

notify pgrst, 'reload schema';
commit;
