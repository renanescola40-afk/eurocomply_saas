begin;

revoke all on function public.enforce_ai_annex_iv_package_actor_scope() from public, anon, authenticated;
revoke all on function public.enforce_ai_annex_iv_section_actor_scope() from public, anon, authenticated;
revoke all on function public.enforce_ai_annex_iv_evidence_actor_scope() from public, anon, authenticated;
revoke all on function public.enforce_ai_annex_iv_change_actor_scope() from public, anon, authenticated;
revoke all on function public.enforce_ai_annex_iv_decision_actor_scope() from public, anon, authenticated;

commit;
