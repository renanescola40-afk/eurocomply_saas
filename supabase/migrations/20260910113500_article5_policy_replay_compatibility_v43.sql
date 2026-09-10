begin;

-- V43 clean-replay compatibility only.
-- Production currently has no Article 5 prohibited-practice relations, so this
-- block is a no-op there. Full-history replay materializes the historical
-- Article 5 policies before the V43 forward reconciliation. Remove exactly the
-- five replaceable member-read policies so 20260910114000 can recreate them
-- with the canonical active-membership authority without SQLSTATE 42710.
do $compatibility$
begin
  if to_regclass('public.ai_prohibited_practice_reviews') is not null then
    drop policy if exists ai_prohibited_reviews_member_select on public.ai_prohibited_practice_reviews;
  end if;
  if to_regclass('public.ai_prohibited_practice_signal_assessments') is not null then
    drop policy if exists ai_prohibited_signals_member_select on public.ai_prohibited_practice_signal_assessments;
  end if;
  if to_regclass('public.ai_prohibited_practice_exception_claims') is not null then
    drop policy if exists ai_prohibited_exceptions_member_select on public.ai_prohibited_practice_exception_claims;
  end if;
  if to_regclass('public.ai_prohibited_practice_evidence') is not null then
    drop policy if exists ai_prohibited_evidence_member_select on public.ai_prohibited_practice_evidence;
  end if;
  if to_regclass('public.ai_prohibited_practice_decisions') is not null then
    drop policy if exists ai_prohibited_decisions_member_select on public.ai_prohibited_practice_decisions;
  end if;
end
$compatibility$;

commit;
