begin;

-- Approval remains fail-closed even when invoked outside the Next.js route.
-- Every control required by the assessment state must have at least one usable
-- tenant-scoped evidence row before an approved decision can be persisted.
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
  v_required_control_ids := case
    when v_full_assessment_required then
      array[
        'FRIA-01','FRIA-02','FRIA-03','FRIA-04','FRIA-05','FRIA-06','FRIA-07',
        'FRIA-08','FRIA-09','FRIA-10','FRIA-11','FRIA-12','FRIA-13','FRIA-14'
      ]::text[]
    else array['FRIA-01','FRIA-15']::text[]
  end;

  if v_current.highest_residual_impact in ('high', 'critical')
    and not ('FRIA-15' = any(v_required_control_ids))
  then
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

notify pgrst, 'reload schema';

commit;
