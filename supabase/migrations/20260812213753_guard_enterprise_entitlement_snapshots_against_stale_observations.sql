-- enterprise-migration-review: approved
-- Historical clean-replay compatibility: the entitlement snapshot creator is not
-- guaranteed to exist in the production migration ledger. Keep the trigger
-- hardening fail-closed when the table exists, but do not abort when it is
-- legitimately absent from an isolated historical replay.

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

do $enterprise_entitlement_snapshot_trigger_apply$
begin
  if to_regclass('public.enterprise_entitlement_snapshots') is not null then
    execute 'drop trigger if exists enterprise_entitlement_snapshot_freshness_guard on public.enterprise_entitlement_snapshots';
    execute 'create trigger enterprise_entitlement_snapshot_freshness_guard before insert on public.enterprise_entitlement_snapshots for each row execute function public.reject_stale_enterprise_entitlement_snapshot()';
  end if;
end
$enterprise_entitlement_snapshot_trigger_apply$;

do $enterprise_entitlement_snapshot_trigger_guard$
begin
  if to_regclass('public.enterprise_entitlement_snapshots') is not null
     and not exists (
       select 1
       from pg_catalog.pg_trigger t
       join pg_catalog.pg_class c on c.oid = t.tgrelid
       join pg_catalog.pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public'
         and c.relname = 'enterprise_entitlement_snapshots'
         and t.tgname = 'enterprise_entitlement_snapshot_freshness_guard'
         and not t.tgisinternal
     ) then
    raise exception 'enterprise entitlement snapshot freshness trigger postcondition failed';
  end if;
end
$enterprise_entitlement_snapshot_trigger_guard$;
