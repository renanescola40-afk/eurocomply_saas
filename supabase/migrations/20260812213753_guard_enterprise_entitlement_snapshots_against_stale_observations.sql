create or replace function public.reject_stale_enterprise_entitlement_snapshot()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.organization_id::text || ':entitlement-reconcile', 0)
  );

  if exists (
    select 1
    from public.enterprise_entitlement_snapshots as existing
    where existing.organization_id = new.organization_id
      and existing.observed_at > new.observed_at
  ) then
    raise exception 'stale enterprise entitlement observation'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.reject_stale_enterprise_entitlement_snapshot() from public, anon, authenticated;
grant execute on function public.reject_stale_enterprise_entitlement_snapshot() to service_role;

drop trigger if exists enterprise_entitlement_snapshot_freshness_guard
  on public.enterprise_entitlement_snapshots;

create trigger enterprise_entitlement_snapshot_freshness_guard
before insert on public.enterprise_entitlement_snapshots
for each row
execute function public.reject_stale_enterprise_entitlement_snapshot();
