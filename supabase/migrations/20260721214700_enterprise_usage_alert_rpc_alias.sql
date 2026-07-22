begin;

create or replace function public.evaluate_enterprise_usage_alerts_atomic(
  p_batch_size integer default 100
)
returns table (
  alert_id uuid,
  organization_id uuid,
  contract_id uuid,
  metric text,
  threshold_percent integer,
  current_value integer,
  limit_value integer
)
language sql
security definer
set search_path = public
as $$
  select *
  from public.evaluate_enterprise_usage_alerts_v2_atomic(p_batch_size);
$$;

revoke all on function public.evaluate_enterprise_usage_alerts_atomic(integer) from public, anon, authenticated;
grant execute on function public.evaluate_enterprise_usage_alerts_atomic(integer) to service_role;

notify pgrst, 'reload schema';

commit;
