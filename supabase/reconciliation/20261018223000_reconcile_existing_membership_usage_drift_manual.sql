-- P0-F: MANUAL, POST-CUTOVER DATA-INTEGRITY RECONCILIATION. NOT A MIGRATION.
-- This file intentionally lives outside supabase/migrations.
-- Never execute without independently reviewed exact-SHA production promotion,
-- complete isolated concurrent PG tests, approved recovery/retest evidence,
-- protected maintenance window, owner authorization and a recent read-only
-- check confirming EXACTLY two drifting organization_usage rows.
-- Do not schedule, auto-apply, or run against LIVE during source verification.
--
-- Operator must bind these TWO settings in the same privileged DB session:
--   SET risck.p0f_reconcile_confirmation = 'APPROVED_MANUAL_P0F_REPAIR';
--   SET risck.p0f_release_sha = '<reviewed 40-character exact production SHA>';
-- These settings are safety prompts, NOT cryptographic human approval proof.
-- The protected release controller must independently verify those assertions.
\set ON_ERROR_STOP on
begin;
set local lock_timeout = '5s';
set local statement_timeout = '45s';

do $p0f_preflight$
declare
  v_release_sha text := current_setting('risck.p0f_release_sha', true);
begin
  if current_setting('risck.p0f_reconcile_confirmation', true)
       is distinct from 'APPROVED_MANUAL_P0F_REPAIR'
     or v_release_sha is null or v_release_sha !~ '^[a-f0-9]{40}$' then
    raise exception 'P0-F manual owner authorization and exact release SHA are required';
  end if;

  if (select count(*) from supabase_migrations.schema_migrations
      where version in (
        '20261015235500','20261018023000','20261018113000',
        '20261018160000','20261018183000','20261018190000'
      )) <> 6 then
    raise exception 'P0-F missing required forward migrations';
  end if;

  if to_regprocedure('public.remove_organization_member_audited_atomic(uuid,uuid,uuid,text,uuid,uuid,timestamptz,text,text,text,jsonb)') is null
    or to_regprocedure('public.change_organization_member_role_audited_atomic(uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,text,text,text,jsonb)') is null
    or to_regprocedure('public.remove_organization_member_atomic(uuid,uuid,uuid,text)') is null
    or to_regprocedure('public.change_organization_member_role_atomic(uuid,uuid,text,text)') is null then
    raise exception 'P0-F required audited or canonical member RPC missing';
  end if;

  -- Direct legacy service_role entrypoints must already have been retired.
  -- Audited SECURITY DEFINER owners may still invoke their canonical inner RPC.
  if has_function_privilege('service_role',
       'public.remove_organization_member_atomic(uuid,uuid,uuid,text)'::regprocedure,'EXECUTE')
     or has_function_privilege('service_role',
       'public.change_organization_member_role_atomic(uuid,uuid,text,text)'::regprocedure,'EXECUTE')
     or not has_function_privilege('service_role',
       'public.remove_organization_member_audited_atomic(uuid,uuid,uuid,text,uuid,uuid,timestamptz,text,text,text,jsonb)'::regprocedure,'EXECUTE')
     or not has_function_privilege('service_role',
       'public.change_organization_member_role_audited_atomic(uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,text,text,text,jsonb)'::regprocedure,'EXECUTE') then
    raise exception 'P0-F audited writer cutover was not accepted';
  end if;

  -- The migration ledger alone is not proof that the CURRENT RPC bodies
  -- actually reconcile usage; require the reviewed implementation signature.
  if position('last_reconciled_at' in pg_get_functiondef(
       'public.remove_organization_member_audited_atomic(uuid,uuid,uuid,text,uuid,uuid,timestamptz,text,text,text,jsonb)'::regprocedure)) = 0
    or position('last_reconciled_at' in pg_get_functiondef(
       'public.change_organization_member_role_audited_atomic(uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,text,text,text,jsonb)'::regprocedure)) = 0
    or has_function_privilege('anon',
       'public.remove_organization_member_audited_atomic(uuid,uuid,uuid,text,uuid,uuid,timestamptz,text,text,text,jsonb)'::regprocedure,'EXECUTE')
    or has_function_privilege('authenticated',
       'public.remove_organization_member_audited_atomic(uuid,uuid,uuid,text,uuid,uuid,timestamptz,text,text,text,jsonb)'::regprocedure,'EXECUTE')
    or has_function_privilege('anon',
       'public.change_organization_member_role_audited_atomic(uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,text,text,text,jsonb)'::regprocedure,'EXECUTE')
    or has_function_privilege('authenticated',
       'public.change_organization_member_role_audited_atomic(uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,text,text,text,jsonb)'::regprocedure,'EXECUTE') then
    raise exception 'P0-F audited writer implementation or ACL failed verified preflight';
  end if;
end $p0f_preflight$;

-- Lock BOTH relations against all DML for a strictly bounded maintenance
-- transaction. Acquire usage before membership, matching P0-F writer order.
-- A conflicting old transaction causes the short lock timeout to fail closed.
lock table public.organization_usage in share row exclusive mode;
lock table public.organization_members in share row exclusive mode;

do $p0f_repair$
declare
  v_release_sha text := current_setting('risck.p0f_release_sha', true);
  v_missing_usage integer;
  v_drift integer;
  v_drift_with_member_rows integer;
  v_reviewed_type_a integer;
  v_reviewed_type_b integer;
  v_remaining integer;
  v_updated integer := 0;
  v_affected integer;
  v_target record;
begin
  -- Do NOT manufacture organization_usage rows in this repair; unexpected
  -- missing rows require a separately reviewed incident/data migration.
  select count(*)::integer into v_missing_usage
  from (select distinct organization_id from public.organization_members) m
  left join public.organization_usage u on u.organization_id=m.organization_id
  where u.organization_id is null;
  if v_missing_usage <> 0 then
    raise exception 'P0-F unexpected organization without usage row: %',v_missing_usage;
  end if;

  with actual as (
    select organization_id,
      count(*)::integer member_rows,
      count(*) filter(where status='active')::integer active_members,
      count(*) filter(where status='active' and seat_type='full')::integer full_users,
      count(*) filter(where status='active' and seat_type='participant')::integer participants,
      count(*) filter(where status='active' and seat_type='viewer')::integer viewers,
      count(*) filter(where status='active' and lower(coalesce(role,'')) in ('owner','admin'))::integer active_admins
    from public.organization_members group by organization_id
  )
  select count(*)::integer,
    count(*) filter(where coalesce(a.member_rows,0) > 0)::integer,
    count(*) filter(where a.organization_id is null and
      (u.active_members,u.full_users,u.participants,u.viewers,u.active_admins)
        = (2,2,0,0,1))::integer,
    count(*) filter(where a.organization_id is null and
      (u.active_members,u.full_users,u.participants,u.viewers,u.active_admins)
        = (1,1,0,0,1))::integer
    into v_drift,v_drift_with_member_rows,v_reviewed_type_a,v_reviewed_type_b
  from public.organization_usage u left join actual a on a.organization_id=u.organization_id
  where (u.active_members,u.full_users,u.participants,u.viewers,u.active_admins)
    is distinct from
    (coalesce(a.active_members,0),coalesce(a.full_users,0),
     coalesce(a.participants,0),coalesce(a.viewers,0),coalesce(a.active_admins,0));

  -- Bind repair to the read-only snapshot reviewed by the owner.
  -- If another number of tenants is affected, stop and re-review the plan.
  if v_drift <> 2 then
    raise exception 'P0-F expected exactly two drifting organizations; observed %',v_drift;
  end if;
  -- Observed LIVE subtype: both drifted organizations have zero members
  -- of ANY status (including suspended). Both relations are DML-locked.
  -- Fail closed if either drifts into a new operational scenario.
  if v_drift_with_member_rows <> 0 then
    raise exception 'P0-F unexpected member-linked drift: %',v_drift_with_member_rows;
  end if;
  -- Both drifted rows must match the reviewed 2026-10-21 distribution,
  -- not merely the same aggregate totals: (+2 full/members,+1 admin) and
  -- (+1 full/members,+1 admin), with no participant/viewer drift.
  -- No tenant identifiers are embedded in, or exposed by, this guard.
  if v_reviewed_type_a <> 1 or v_reviewed_type_b <> 1 then
    raise exception 'P0-F reviewed per-organization drift fingerprint changed';
  end if;

  for v_target in
    with actual as (
      select organization_id,
        count(*) filter(where status='active')::integer active_members,
        count(*) filter(where status='active' and seat_type='full')::integer full_users,
        count(*) filter(where status='active' and seat_type='participant')::integer participants,
        count(*) filter(where status='active' and seat_type='viewer')::integer viewers,
        count(*) filter(where status='active' and lower(coalesce(role,'')) in ('owner','admin'))::integer active_admins
      from public.organization_members group by organization_id
    )
    select u.organization_id,
      u.active_members old_members,u.full_users old_full,
      u.participants old_participants,u.viewers old_viewers,u.active_admins old_admins,
      coalesce(a.active_members,0) new_members,coalesce(a.full_users,0) new_full,
      coalesce(a.participants,0) new_participants,coalesce(a.viewers,0) new_viewers,
      coalesce(a.active_admins,0) new_admins
    from public.organization_usage u left join actual a on a.organization_id=u.organization_id
    where (u.active_members,u.full_users,u.participants,u.viewers,u.active_admins)
       is distinct from
      (coalesce(a.active_members,0),coalesce(a.full_users,0),
       coalesce(a.participants,0),coalesce(a.viewers,0),coalesce(a.active_admins,0))
    order by u.organization_id
  loop
    update public.organization_usage
    set active_members=v_target.new_members,full_users=v_target.new_full,
      participants=v_target.new_participants,viewers=v_target.new_viewers,
      active_admins=v_target.new_admins,last_reconciled_at=now(),updated_at=now()
    where organization_id=v_target.organization_id;
    get diagnostics v_affected = row_count;
    if v_affected <> 1 then raise exception 'P0-F correction update cardinality changed'; end if;

    -- This is an explicitly identified LEGACY administrative audit log;
    -- it is not a signed membership event in audit_events.
    insert into public.audit_logs(organization_id,action,entity_type,entity_id,metadata)
    values(v_target.organization_id,'enterprise.membership_usage_reconciled',
      'organization_usage',v_target.organization_id::text,
      jsonb_build_object('source','reviewed_manual_p0f_reconciliation',
        'release_sha',v_release_sha,
        'before',jsonb_build_object('active_members',v_target.old_members,
          'full_users',v_target.old_full,'participants',v_target.old_participants,
          'viewers',v_target.old_viewers,'active_admins',v_target.old_admins),
        'after',jsonb_build_object('active_members',v_target.new_members,
          'full_users',v_target.new_full,'participants',v_target.new_participants,
          'viewers',v_target.new_viewers,'active_admins',v_target.new_admins)));
    v_updated:=v_updated+1;
  end loop;

  with actual as (
    select organization_id,
      count(*) filter(where status='active')::integer active_members,
      count(*) filter(where status='active' and seat_type='full')::integer full_users,
      count(*) filter(where status='active' and seat_type='participant')::integer participants,
      count(*) filter(where status='active' and seat_type='viewer')::integer viewers,
      count(*) filter(where status='active' and lower(coalesce(role,'')) in ('owner','admin'))::integer active_admins
    from public.organization_members group by organization_id
  )
  select count(*)::integer into v_remaining
  from public.organization_usage u left join actual a on a.organization_id=u.organization_id
  where (u.active_members,u.full_users,u.participants,u.viewers,u.active_admins)
    is distinct from
    (coalesce(a.active_members,0),coalesce(a.full_users,0),
     coalesce(a.participants,0),coalesce(a.viewers,0),coalesce(a.active_admins,0));

  if v_updated <> v_drift or v_remaining <> 0 then
    raise exception 'P0-F postcondition failed; updated %, remaining %',v_updated,v_remaining;
  end if;
  raise notice 'P0-F reconciliation succeeded: % usage rows updated, zero remaining drift',v_updated;
end $p0f_repair$;
commit;
