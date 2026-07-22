begin;

create or replace function public.create_prohibited_practices_review_atomic(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_system_reference text,
  p_applicability text
)
returns table (outcome text, review jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version integer;
  v_review public.ai_prohibited_practice_reviews%rowtype;
  v_signal text;
begin
  if p_organization_id is null or p_actor_user_id is null
    or char_length(pg_catalog.btrim(coalesce(p_system_reference, ''))) < 3
    or p_applicability not in ('required','not_required','uncertain') then
    return query select 'invalid_input'::text, null::jsonb; return;
  end if;
  if not exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = p_actor_user_id) then
    return query select 'actor_not_member'::text, null::jsonb; return;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || ':' || pg_catalog.btrim(p_system_reference), 0));
  select coalesce(max(r.review_version), 0) + 1 into v_version
  from public.ai_prohibited_practice_reviews r
  where r.organization_id = p_organization_id and r.system_reference = pg_catalog.btrim(p_system_reference);
  insert into public.ai_prohibited_practice_reviews (
    organization_id, system_reference, review_version, applicability, status, owner_user_id,
    unknown_signal_count, unresolved_signal_count, last_material_change_at
  ) values (
    p_organization_id, pg_catalog.btrim(p_system_reference), v_version, p_applicability,
    case when p_applicability = 'uncertain' then 'applicability_review' else 'draft' end,
    p_actor_user_id, 8, 8, now()
  ) returning * into v_review;
  foreach v_signal in array array[
    'subliminal_manipulation','vulnerability_exploitation','social_scoring','criminal_risk_prediction',
    'untargeted_facial_scraping','emotion_inference_workplace_education',
    'biometric_categorisation_sensitive_traits','real_time_remote_biometric_public_space'
  ] loop
    insert into public.ai_prohibited_practice_signal_assessments (
      organization_id, review_id, signal_code, owner_user_id, last_material_change_at
    ) values (p_organization_id, v_review.id, v_signal, p_actor_user_id, now());
  end loop;
  return query select 'created'::text, to_jsonb(v_review);
end;
$$;

revoke all on function public.create_prohibited_practices_review_atomic(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.create_prohibited_practices_review_atomic(uuid, uuid, text, text) to service_role;

create or replace function public.approve_prohibited_practices_review_atomic(
  p_organization_id uuid,
  p_review_id uuid,
  p_expected_updated_at timestamptz,
  p_actor_user_id uuid,
  p_rationale text
)
returns table (outcome text, review jsonb, decision_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.ai_prohibited_practice_reviews%rowtype;
  v_updated public.ai_prohibited_practice_reviews%rowtype;
  v_decision_id uuid;
  v_signal_count integer;
  v_ready_count integer;
begin
  if p_organization_id is null or p_review_id is null or p_expected_updated_at is null
    or p_actor_user_id is null or char_length(pg_catalog.btrim(coalesce(p_rationale, ''))) < 10 then
    return query select 'invalid_input'::text, null::jsonb, null::uuid; return;
  end if;
  select r.* into v_current from public.ai_prohibited_practice_reviews r
  where r.organization_id = p_organization_id and r.id = p_review_id for update;
  if not found then return query select 'not_found'::text, null::jsonb, null::uuid; return; end if;
  if v_current.updated_at is distinct from p_expected_updated_at then
    return query select 'state_changed'::text, null::jsonb, null::uuid; return;
  end if;
  if v_current.approver_user_id is distinct from p_actor_user_id then
    return query select 'approver_required'::text, null::jsonb, null::uuid; return;
  end if;
  select count(*), count(*) filter (where s.status = 'approved' and s.answer <> 'unknown' and s.evidence_count > 0
    and s.content_digest is not null and s.reviewer_user_id is not null and s.reviewed_at is not null
    and (s.answer = 'no' or (s.answer = 'yes' and s.legal_conclusion in ('not_prohibited','exception_supported')
      and s.legal_reviewer_user_id is not null and s.legal_reviewed_at is not null)))
  into v_signal_count, v_ready_count
  from public.ai_prohibited_practice_signal_assessments s
  where s.organization_id = p_organization_id and s.review_id = p_review_id;
  if v_current.applicability <> 'required' or v_signal_count <> 8 or v_ready_count <> 8
    or v_current.open_high_findings <> 0 or v_current.open_critical_findings <> 0
    or v_current.reviewer_user_id is null or v_current.review_digest is null
    or v_current.prohibited_signal_count <> 0 or v_current.unknown_signal_count <> 0
    or v_current.unresolved_signal_count <> 0 then
    return query select 'requirements_not_met'::text, null::jsonb, null::uuid; return;
  end if;
  update public.ai_prohibited_practice_reviews r set status = 'approved', approved_at = now(), reviewed_at = coalesce(reviewed_at, now())
  where r.organization_id = p_organization_id and r.id = p_review_id and r.updated_at is not distinct from p_expected_updated_at
  returning r.* into v_updated;
  if not found then return query select 'state_changed'::text, null::jsonb, null::uuid; return; end if;
  insert into public.ai_prohibited_practice_decisions (
    organization_id, review_id, decision_type, outcome, rationale, actor_user_id, evidence_digest
  ) values (
    p_organization_id, p_review_id, 'review_approved', 'approved', pg_catalog.btrim(p_rationale), p_actor_user_id, v_current.review_digest
  ) returning id into v_decision_id;
  return query select 'approved'::text, to_jsonb(v_updated), v_decision_id;
end;
$$;

revoke all on function public.approve_prohibited_practices_review_atomic(uuid, uuid, timestamptz, uuid, text) from public, anon, authenticated;
grant execute on function public.approve_prohibited_practices_review_atomic(uuid, uuid, timestamptz, uuid, text) to service_role;

notify pgrst, 'reload schema';
commit;
