alter function public.append_audit_event_chained(uuid, uuid, uuid, text, text, text, jsonb, timestamptz, text, text, text, text)
  set search_path = pg_catalog;

alter function public.apply_enterprise_entitlement_snapshot_atomic(uuid, uuid, text, bigint, text, integer, integer, integer, jsonb, text, timestamptz, timestamptz, timestamptz, uuid)
  set search_path = pg_catalog;

alter function public.consume_enterprise_seat_reservation_atomic(uuid, uuid, uuid, bigint, uuid)
  set search_path = pg_catalog;

alter function public.reserve_enterprise_seat_atomic(uuid, text, text, bigint, uuid, uuid, text, integer)
  set search_path = pg_catalog;

do $$
declare
  bad_search_path integer;
  exposed_execute integer;
  missing_service_role integer;
begin
  select count(*) into bad_search_path
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('append_audit_event_chained','apply_enterprise_entitlement_snapshot_atomic','consume_enterprise_seat_reservation_atomic','reserve_enterprise_seat_atomic')
    and not ('search_path=pg_catalog' = any(coalesce(p.proconfig, array[]::text[])));
  if bad_search_path <> 0 then raise exception 'security definer search_path hardening verification failed'; end if;

  select count(*) into exposed_execute
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('append_audit_event_chained','apply_enterprise_entitlement_snapshot_atomic','consume_enterprise_seat_reservation_atomic','reserve_enterprise_seat_atomic')
    and (pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') or pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  if exposed_execute <> 0 then raise exception 'security definer client execute boundary verification failed'; end if;

  select count(*) into missing_service_role
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('append_audit_event_chained','apply_enterprise_entitlement_snapshot_atomic','consume_enterprise_seat_reservation_atomic','reserve_enterprise_seat_atomic')
    and not pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE');
  if missing_service_role <> 0 then raise exception 'security definer service role execute boundary verification failed'; end if;
end $$;
