begin;

create unique index if not exists ai_systems_organization_id_id_uidx
  on public.ai_systems (organization_id, id);

alter table public.ai_fria_assessments
  drop constraint if exists ai_fria_assessments_organization_fk;
alter table public.ai_fria_assessments
  add constraint ai_fria_assessments_organization_fk
  foreign key (organization_id)
  references public.organizations(id)
  on delete cascade
  not valid;

alter table public.ai_fria_assessments
  drop constraint if exists ai_fria_assessments_system_scope_fk;
alter table public.ai_fria_assessments
  add constraint ai_fria_assessments_system_scope_fk
  foreign key (organization_id, ai_system_id)
  references public.ai_systems(organization_id, id)
  on delete restrict
  not valid;

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
    scoped_users := array[new.owner_id, new.reviewer_id, new.approver_id];
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
before insert or update of organization_id, owner_id, reviewer_id, approver_id
on public.ai_fria_assessments
for each row
execute function public.enforce_fria_member_scope();

drop trigger if exists enforce_fria_evidence_member_scope
  on public.ai_fria_evidence;
create trigger enforce_fria_evidence_member_scope
before insert or update of organization_id, submitted_by, reviewed_by
on public.ai_fria_evidence
for each row
execute function public.enforce_fria_member_scope();

drop trigger if exists enforce_fria_decision_member_scope
  on public.ai_fria_decisions;
create trigger enforce_fria_decision_member_scope
before insert or update of organization_id, actor_id
on public.ai_fria_decisions
for each row
execute function public.enforce_fria_member_scope();

create or replace function public.set_fria_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_fria_assessment_updated_at
  on public.ai_fria_assessments;
create trigger set_fria_assessment_updated_at
before update on public.ai_fria_assessments
for each row
execute function public.set_fria_updated_at();

drop policy if exists "Organization members can read FRIA assessments"
  on public.ai_fria_assessments;
create policy "Organization members can read FRIA assessments"
on public.ai_fria_assessments
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = ai_fria_assessments.organization_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Organization members can read FRIA evidence"
  on public.ai_fria_evidence;
create policy "Organization members can read FRIA evidence"
on public.ai_fria_evidence
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = ai_fria_evidence.organization_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "Organization members can read FRIA decisions"
  on public.ai_fria_decisions;
create policy "Organization members can read FRIA decisions"
on public.ai_fria_decisions
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = ai_fria_decisions.organization_id
      and membership.user_id = auth.uid()
  )
);

grant select on public.ai_fria_assessments to authenticated;
grant select on public.ai_fria_evidence to authenticated;
grant select on public.ai_fria_decisions to authenticated;
revoke insert, update, delete on public.ai_fria_assessments from anon, authenticated;
revoke insert, update, delete on public.ai_fria_evidence from anon, authenticated;
revoke insert, update, delete on public.ai_fria_decisions from anon, authenticated;

create or replace function public.create_fria_assessment_atomic(
  p_organization_id uuid,
  p_ai_system_id uuid,
  p_actor_user_id uuid,
  p_applicability text,
  p_context jsonb,
  p_review_due_at timestamptz default null
)
returns table (
  outcome text,
  assessment jsonb
)
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
  ) then
    return query select 'actor_not_member'::text, null::jsonb;
    return;
  end if;

  if not exists (
    select 1
    from public.ai_systems system_record
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
    organization_id,
    ai_system_id,
    version,
    applicability,
    stage,
    context,
    owner_id,
    highest_residual_impact,
    review_due_at
  ) values (
    p_organization_id,
    p_ai_system_id,
    v_version,
    p_applicability,
    case when p_applicability = 'uncertain' then 'applicability_review' else 'draft' end,
    p_context,
    p_actor_user_id,
    'unknown',
    p_review_due_at
  )
  returning * into v_assessment;

  return query select 'created'::text, to_jsonb(v_assessment);
end;
$$;

revoke all on function public.create_fria_assessment_atomic(uuid, uuid, uuid, text, jsonb, timestamptz) from public;
revoke all on function public.create_fria_assessment_atomic(uuid, uuid, uuid, text, jsonb, timestamptz) from anon;
revoke all on function public.create_fria_assessment_atomic(uuid, uuid, uuid, text, jsonb, timestamptz) from authenticated;
grant execute on function public.create_fria_assessment_atomic(uuid, uuid, uuid, text, jsonb, timestamptz) to service_role;

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

  if v_current.stage = 'retired'
    or v_current.applicability = 'uncertain'
    or v_current.reviewer_id is null
    or v_current.approver_id is null
    or v_current.reviewer_id = v_current.owner_id
    or v_current.approver_id = v_current.owner_id
    or v_current.approver_id = v_current.reviewer_id
    or nullif(pg_catalog.btrim(coalesce(v_current.context ->> 'intendedPurpose', '')), '') is null
    or coalesce((v_current.context ->> 'vulnerableGroupsConsidered')::boolean, false) is false
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
      and v_current.legal_review_completed_at is null
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

  alter table public.ai_fria_assessments disable trigger set_fria_assessment_updated_at;
  update public.ai_fria_assessments assessment_record
  set
    stage = p_previous_stage,
    approved_at = p_previous_approved_at,
    updated_at = p_previous_updated_at
  where assessment_record.organization_id = p_organization_id
    and assessment_record.id = p_assessment_id;
  alter table public.ai_fria_assessments enable trigger set_fria_assessment_updated_at;

  return true;
exception
  when others then
    begin
      alter table public.ai_fria_assessments enable trigger set_fria_assessment_updated_at;
    exception when others then
      null;
    end;
    raise;
end;
$$;

revoke all on function public.compensate_fria_approval_audit_failure(uuid, uuid, uuid, timestamptz, text, timestamptz, timestamptz) from public;
revoke all on function public.compensate_fria_approval_audit_failure(uuid, uuid, uuid, timestamptz, text, timestamptz, timestamptz) from anon;
revoke all on function public.compensate_fria_approval_audit_failure(uuid, uuid, uuid, timestamptz, text, timestamptz, timestamptz) from authenticated;
grant execute on function public.compensate_fria_approval_audit_failure(uuid, uuid, uuid, timestamptz, text, timestamptz, timestamptz) to service_role;

notify pgrst, 'reload schema';

commit;
