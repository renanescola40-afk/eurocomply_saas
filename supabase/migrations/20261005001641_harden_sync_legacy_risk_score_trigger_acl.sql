begin;

revoke all on function public.sync_legacy_risk_score() from public;
revoke all on function public.sync_legacy_risk_score() from anon;
revoke all on function public.sync_legacy_risk_score() from authenticated;
grant execute on function public.sync_legacy_risk_score() to service_role;

commit;
