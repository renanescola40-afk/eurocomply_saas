begin;

create or replace function public.assert_qms_mutable(p_organization_id uuid, p_qms_system_id uuid)
returns public.ai_qms_systems
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_qms public.ai_qms_systems;
begin
  select * into v_qms from public.ai_qms_systems
  where organization_id = p_organization_id and id = p_qms_system_id for update;
  if not found then raise exception 'qms_not_found'; end if;
  if v_qms.status in ('approved','retired') then raise exception 'qms_immutable_state'; end if;
  return v_qms;
end $$;

create or replace function public.configure_qms_system_atomic(
  p_organization_id uuid, p_qms_system_id uuid, p_expected_updated_at timestamptz,
  p_actor_user_id uuid, p_reviewer_user_id uuid, p_approver_user_id uuid
) returns setof public.ai_qms_systems
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_qms public.ai_qms_systems;
begin
  v_qms := public.assert_qms_mutable(p_organization_id, p_qms_system_id);
  if v_qms.updated_at <> p_expected_updated_at then raise exception 'qms_state_changed'; end if;
  if not public.ai_qms_actor_is_member(p_organization_id,p_actor_user_id)
    or not public.ai_qms_actor_is_member(p_organization_id,p_reviewer_user_id)
    or not public.ai_qms_actor_is_member(p_organization_id,p_approver_user_id) then raise exception 'qms_actor_not_member'; end if;
  if p_reviewer_user_id in (v_qms.owner_user_id,p_approver_user_id)
    or p_approver_user_id = v_qms.owner_user_id then raise exception 'qms_actor_separation_required'; end if;
  update public.ai_qms_systems set reviewer_user_id=p_reviewer_user_id, approver_user_id=p_approver_user_id,
    status='operating', updated_at=now()
  where organization_id=p_organization_id and id=p_qms_system_id returning * into v_qms;
  return next v_qms;
end $$;

create or replace function public.complete_qms_control_atomic(
  p_organization_id uuid, p_control_id uuid, p_expected_updated_at timestamptz,
  p_actor_user_id uuid, p_status text, p_rationale text, p_evidence_reference text, p_evidence_digest text
) returns setof public.ai_qms_controls
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_control public.ai_qms_controls; v_qms public.ai_qms_systems;
begin
  select * into v_control from public.ai_qms_controls where organization_id=p_organization_id and id=p_control_id for update;
  if not found then raise exception 'qms_control_not_found'; end if;
  v_qms := public.assert_qms_mutable(p_organization_id,v_control.qms_system_id);
  if v_control.updated_at <> p_expected_updated_at then raise exception 'qms_state_changed'; end if;
  if not public.ai_qms_actor_is_member(p_organization_id,p_actor_user_id) then raise exception 'qms_actor_not_member'; end if;
  if p_status not in ('effective','not_applicable') then raise exception 'qms_control_terminal_status_required'; end if;
  if char_length(btrim(p_rationale)) < 10 then raise exception 'qms_control_rationale_required'; end if;
  if p_status='effective' and (p_evidence_reference is null or p_evidence_digest !~ '^[a-f0-9]{64}$') then raise exception 'qms_control_evidence_required'; end if;
  update public.ai_qms_controls set status=p_status, rationale=btrim(p_rationale), evidence_reference=p_evidence_reference,
    evidence_digest=p_evidence_digest, last_tested_at=now(), updated_at=now()
  where organization_id=p_organization_id and id=p_control_id returning * into v_control;
  update public.ai_qms_systems set updated_at=now() where organization_id=p_organization_id and id=v_control.qms_system_id;
  return next v_control;
end $$;

create or replace function public.accept_qms_audit_atomic(
  p_organization_id uuid, p_audit_id uuid, p_expected_updated_at timestamptz, p_actor_user_id uuid,
  p_findings_count integer, p_high_findings_count integer, p_critical_findings_count integer,
  p_report_reference text, p_report_digest text
) returns setof public.ai_qms_audits
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_audit public.ai_qms_audits; v_qms public.ai_qms_systems;
begin
  select * into v_audit from public.ai_qms_audits where organization_id=p_organization_id and id=p_audit_id for update;
  if not found then raise exception 'qms_audit_not_found'; end if;
  v_qms := public.assert_qms_mutable(p_organization_id,v_audit.qms_system_id);
  if v_audit.updated_at <> p_expected_updated_at then raise exception 'qms_state_changed'; end if;
  if p_actor_user_id = v_audit.lead_auditor_user_id then raise exception 'qms_independent_reviewer_required'; end if;
  if not public.ai_qms_actor_is_member(p_organization_id,p_actor_user_id) then raise exception 'qms_actor_not_member'; end if;
  if p_high_findings_count <> 0 or p_critical_findings_count <> 0 then raise exception 'qms_audit_severe_findings'; end if;
  if p_report_digest !~ '^[a-f0-9]{64}$' or char_length(btrim(p_report_reference)) < 3 then raise exception 'qms_audit_report_required'; end if;
  update public.ai_qms_audits set status='accepted', reviewed_by_user_id=p_actor_user_id, completed_at=coalesce(completed_at,now()),
    accepted_at=now(), findings_count=p_findings_count, high_findings_count=p_high_findings_count,
    critical_findings_count=p_critical_findings_count, report_reference=btrim(p_report_reference), report_digest=p_report_digest, updated_at=now()
  where organization_id=p_organization_id and id=p_audit_id returning * into v_audit;
  update public.ai_qms_systems set updated_at=now() where organization_id=p_organization_id and id=v_audit.qms_system_id;
  return next v_audit;
end $$;

create or replace function public.approve_qms_management_review_atomic(
  p_organization_id uuid, p_review_id uuid, p_expected_updated_at timestamptz,
  p_actor_user_id uuid, p_reviewer_user_id uuid, p_inputs_summary text, p_decisions_summary text,
  p_evidence_reference text, p_evidence_digest text
) returns setof public.ai_qms_management_reviews
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_review public.ai_qms_management_reviews; v_qms public.ai_qms_systems;
begin
  select * into v_review from public.ai_qms_management_reviews where organization_id=p_organization_id and id=p_review_id for update;
  if not found then raise exception 'qms_management_review_not_found'; end if;
  v_qms := public.assert_qms_mutable(p_organization_id,v_review.qms_system_id);
  if v_review.updated_at <> p_expected_updated_at then raise exception 'qms_state_changed'; end if;
  if p_actor_user_id in (v_review.chair_user_id,p_reviewer_user_id) or p_reviewer_user_id=v_review.chair_user_id then raise exception 'qms_actor_separation_required'; end if;
  if not public.ai_qms_actor_is_member(p_organization_id,p_actor_user_id) or not public.ai_qms_actor_is_member(p_organization_id,p_reviewer_user_id) then raise exception 'qms_actor_not_member'; end if;
  if char_length(btrim(p_inputs_summary))<20 or char_length(btrim(p_decisions_summary))<20 then raise exception 'qms_management_review_incomplete'; end if;
  if p_evidence_digest !~ '^[a-f0-9]{64}$' or char_length(btrim(p_evidence_reference))<3 then raise exception 'qms_management_review_evidence_required'; end if;
  update public.ai_qms_management_reviews set status='approved', reviewer_user_id=p_reviewer_user_id,
    approved_by_user_id=p_actor_user_id, inputs_summary=btrim(p_inputs_summary), decisions_summary=btrim(p_decisions_summary),
    open_action_items_count=0, reviewed_at=now(), approved_at=now(), evidence_reference=btrim(p_evidence_reference),
    evidence_digest=p_evidence_digest, updated_at=now()
  where organization_id=p_organization_id and id=p_review_id returning * into v_review;
  update public.ai_qms_systems set management_reviewed_at=now(), updated_at=now()
  where organization_id=p_organization_id and id=v_review.qms_system_id;
  return next v_review;
end $$;

create or replace function public.close_qms_nonconformity_atomic(
  p_organization_id uuid, p_nonconformity_id uuid, p_expected_updated_at timestamptz,
  p_actor_user_id uuid, p_root_cause text, p_corrective_action text
) returns setof public.ai_qms_nonconformities
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_nc public.ai_qms_nonconformities; v_qms public.ai_qms_systems;
begin
  select * into v_nc from public.ai_qms_nonconformities where organization_id=p_organization_id and id=p_nonconformity_id for update;
  if not found then raise exception 'qms_nonconformity_not_found'; end if;
  v_qms := public.assert_qms_mutable(p_organization_id,v_nc.qms_system_id);
  if v_nc.updated_at <> p_expected_updated_at then raise exception 'qms_state_changed'; end if;
  if p_actor_user_id=v_nc.owner_user_id then raise exception 'qms_independent_verifier_required'; end if;
  if not public.ai_qms_actor_is_member(p_organization_id,p_actor_user_id) then raise exception 'qms_actor_not_member'; end if;
  if char_length(btrim(p_root_cause))<10 or char_length(btrim(p_corrective_action))<10 then raise exception 'qms_capa_incomplete'; end if;
  update public.ai_qms_nonconformities set status='closed', root_cause=btrim(p_root_cause), corrective_action=btrim(p_corrective_action),
    verified_by_user_id=p_actor_user_id, verified_at=now(), closed_at=now(), updated_at=now()
  where organization_id=p_organization_id and id=p_nonconformity_id returning * into v_nc;
  return next v_nc;
end $$;

create or replace function public.prevent_ai_qms_decision_mutation()
returns trigger language plpgsql as $$
begin
  if current_setting('app.qms_compensation', true) = 'on' then return old; end if;
  raise exception 'QMS decisions are append-only';
end $$;

create or replace function public.rollback_qms_approval_atomic(
  p_organization_id uuid, p_qms_system_id uuid, p_expected_updated_at timestamptz, p_actor_user_id uuid
) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_qms public.ai_qms_systems; v_decision_id uuid;
begin
  select * into v_qms from public.ai_qms_systems where organization_id=p_organization_id and id=p_qms_system_id for update;
  if not found or v_qms.status<>'approved' or v_qms.updated_at<>p_expected_updated_at then return false; end if;
  select id into v_decision_id from public.ai_qms_decisions where organization_id=p_organization_id and qms_system_id=p_qms_system_id
    and decision_type='qms_approved' and actor_user_id=p_actor_user_id order by created_at desc limit 1;
  perform set_config('app.qms_compensation','on',true);
  if v_decision_id is not null then delete from public.ai_qms_decisions where id=v_decision_id; end if;
  update public.ai_qms_systems set status='approval', approved_at=null, updated_at=now()
  where organization_id=p_organization_id and id=p_qms_system_id;
  return true;
end $$;

create or replace function public.guard_qms_child_mutation()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_system_id uuid; v_status text;
begin
  v_system_id := coalesce(new.qms_system_id,old.qms_system_id);
  select status into v_status from public.ai_qms_systems where organization_id=coalesce(new.organization_id,old.organization_id) and id=v_system_id;
  if v_status in ('approved','retired') then raise exception 'qms_immutable_state'; end if;
  return coalesce(new,old);
end $$;

drop trigger if exists ai_qms_control_parent_mutable on public.ai_qms_controls;
create trigger ai_qms_control_parent_mutable before insert or update or delete on public.ai_qms_controls
for each row execute function public.guard_qms_child_mutation();
drop trigger if exists ai_qms_nonconformity_parent_mutable on public.ai_qms_nonconformities;
create trigger ai_qms_nonconformity_parent_mutable before insert or update or delete on public.ai_qms_nonconformities
for each row execute function public.guard_qms_child_mutation();
drop trigger if exists ai_qms_audit_parent_mutable on public.ai_qms_audits;
create trigger ai_qms_audit_parent_mutable before insert or update or delete on public.ai_qms_audits
for each row execute function public.guard_qms_child_mutation();
drop trigger if exists ai_qms_management_review_parent_mutable on public.ai_qms_management_reviews;
create trigger ai_qms_management_review_parent_mutable before insert or update or delete on public.ai_qms_management_reviews
for each row execute function public.guard_qms_child_mutation();

revoke all on function public.assert_qms_mutable(uuid,uuid) from public,anon,authenticated;
revoke all on function public.configure_qms_system_atomic(uuid,uuid,timestamptz,uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.complete_qms_control_atomic(uuid,uuid,timestamptz,uuid,text,text,text,text) from public,anon,authenticated;
revoke all on function public.accept_qms_audit_atomic(uuid,uuid,timestamptz,uuid,integer,integer,integer,text,text) from public,anon,authenticated;
revoke all on function public.approve_qms_management_review_atomic(uuid,uuid,timestamptz,uuid,uuid,text,text,text,text) from public,anon,authenticated;
revoke all on function public.close_qms_nonconformity_atomic(uuid,uuid,timestamptz,uuid,text,text) from public,anon,authenticated;
revoke all on function public.rollback_qms_approval_atomic(uuid,uuid,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.configure_qms_system_atomic(uuid,uuid,timestamptz,uuid,uuid,uuid) to service_role;
grant execute on function public.complete_qms_control_atomic(uuid,uuid,timestamptz,uuid,text,text,text,text) to service_role;
grant execute on function public.accept_qms_audit_atomic(uuid,uuid,timestamptz,uuid,integer,integer,integer,text,text) to service_role;
grant execute on function public.approve_qms_management_review_atomic(uuid,uuid,timestamptz,uuid,uuid,text,text,text,text) to service_role;
grant execute on function public.close_qms_nonconformity_atomic(uuid,uuid,timestamptz,uuid,text,text) to service_role;
grant execute on function public.rollback_qms_approval_atomic(uuid,uuid,timestamptz,uuid) to service_role;

commit;
