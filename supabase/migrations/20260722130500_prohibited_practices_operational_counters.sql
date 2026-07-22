begin;

create or replace function public.refresh_prohibited_practice_review(p_organization_id uuid, p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_positive integer;
  v_unknown integer;
  v_prohibited integer;
  v_unresolved integer;
  v_supported integer;
begin
  select
    count(*) filter (where s.answer = 'yes'),
    count(*) filter (where s.answer = 'unknown'),
    count(*) filter (where s.answer = 'yes' and s.legal_conclusion = 'prohibited'),
    count(*) filter (where s.status <> 'approved'),
    count(*) filter (where s.answer = 'yes' and s.legal_conclusion = 'exception_supported' and s.exception_claimed)
  into v_positive, v_unknown, v_prohibited, v_unresolved, v_supported
  from public.ai_prohibited_practice_signal_assessments s
  where s.organization_id = p_organization_id and s.review_id = p_review_id;

  update public.ai_prohibited_practice_reviews r
  set positive_signal_count = coalesce(v_positive, 0),
      unknown_signal_count = coalesce(v_unknown, 0),
      prohibited_signal_count = coalesce(v_prohibited, 0),
      unresolved_signal_count = coalesce(v_unresolved, 0),
      supported_exception_count = coalesce(v_supported, 0),
      status = case
        when coalesce(v_prohibited, 0) > 0 then 'blocked'
        when coalesce(v_unknown, 0) > 0 then 'evidence_review'
        when coalesce(v_unresolved, 0) > 0 then 'evidence_review'
        else 'approval_pending'
      end
  where r.organization_id = p_organization_id and r.id = p_review_id
    and r.status not in ('approved','not_applicable','retired');
end;
$$;

revoke all on function public.refresh_prohibited_practice_review(uuid, uuid) from public, anon, authenticated;

create or replace function public.sync_prohibited_practice_signal_evidence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_review_id uuid;
  v_signal_id uuid;
  v_count integer;
begin
  v_organization_id := coalesce(new.organization_id, old.organization_id);
  v_review_id := coalesce(new.review_id, old.review_id);
  v_signal_id := coalesce(new.signal_assessment_id, old.signal_assessment_id);
  select count(*) into v_count
  from public.ai_prohibited_practice_evidence e
  where e.organization_id = v_organization_id and e.review_id = v_review_id and e.signal_assessment_id = v_signal_id;

  update public.ai_prohibited_practice_signal_assessments s
  set evidence_count = v_count,
      status = case
        when s.answer = 'yes' and s.legal_conclusion = 'prohibited' then 'prohibited'
        when v_count > 0 and s.answer <> 'unknown' and char_length(pg_catalog.btrim(s.rationale)) >= 10
          and char_length(pg_catalog.btrim(s.deployment_context)) >= 10
          and char_length(pg_catalog.btrim(s.consequence_analysis)) >= 10
          and s.reviewer_user_id is not null and s.content_digest is not null
          and (s.answer = 'no' or (s.legal_reviewer_user_id is not null and s.legal_reviewed_at is not null))
          then 'approved'
        else 'evidence_review'
      end,
      approved_at = case
        when v_count > 0 and s.answer <> 'unknown' and s.reviewer_user_id is not null and s.content_digest is not null
          and (s.answer = 'no' or (s.legal_reviewer_user_id is not null and s.legal_reviewed_at is not null))
          then coalesce(s.approved_at, now()) else null end
  where s.organization_id = v_organization_id and s.review_id = v_review_id and s.id = v_signal_id;

  perform public.refresh_prohibited_practice_review(v_organization_id, v_review_id);
  return coalesce(new, old);
end;
$$;

revoke all on function public.sync_prohibited_practice_signal_evidence() from public, anon, authenticated;

drop trigger if exists sync_prohibited_signal_after_evidence on public.ai_prohibited_practice_evidence;
create trigger sync_prohibited_signal_after_evidence
after insert or delete on public.ai_prohibited_practice_evidence
for each row execute function public.sync_prohibited_practice_signal_evidence();

create or replace function public.sync_prohibited_practice_review_after_signal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_prohibited_practice_review(new.organization_id, new.review_id);
  return new;
end;
$$;

revoke all on function public.sync_prohibited_practice_review_after_signal() from public, anon, authenticated;

drop trigger if exists sync_prohibited_review_after_signal on public.ai_prohibited_practice_signal_assessments;
create trigger sync_prohibited_review_after_signal
after update of answer, legal_conclusion, status, evidence_count on public.ai_prohibited_practice_signal_assessments
for each row execute function public.sync_prohibited_practice_review_after_signal();

commit;
