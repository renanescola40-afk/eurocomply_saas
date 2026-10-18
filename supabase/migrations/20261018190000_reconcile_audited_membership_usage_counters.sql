-- P0-F: forward-only signed-audit membership counter reconciliation.
-- Requires MFA + P0-B/C/D/E, and independent isolated PostgreSQL tests.
-- Legacy service_role entrypoints MUST be retired only at controlled cutover.
-- Database/runtime changes are NOT authorized by merely reviewing this file.
begin;
do $preflight$
declare v_remove text; v_role text;
begin
  if to_regprocedure('public.remove_organization_member_audited_atomic(uuid,uuid,uuid,text,uuid,uuid,timestamptz,text,text,text,jsonb)') is null
    or to_regprocedure('public.change_organization_member_role_audited_atomic(uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,text,text,text,jsonb)') is null
    or to_regclass('public.organization_usage') is null then
    raise exception 'P0-F requires P0-C/P0-D audited membership RPCs';
  end if;
  select pg_get_functiondef('public.remove_organization_member_audited_atomic(uuid,uuid,uuid,text,uuid,uuid,timestamptz,text,text,text,jsonb)'::regprocedure) into v_remove;
  select pg_get_functiondef('public.change_organization_member_role_audited_atomic(uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,text,text,text,jsonb)'::regprocedure) into v_role;
  if position('append_audit_event_chained' in v_remove)=0
    or position('team.member_removed' in v_remove)=0
    or position('append_audit_event_chained' in v_role)=0
    or position('team_member_role_changed' in v_role)=0 then
    raise exception 'P0-F existing atomic writer implementation drift';
  end if;
  if (select count(*) from information_schema.columns
    where table_schema='public' and table_name='organization_usage'
      and column_name in ('active_members','full_users','participants','viewers','active_admins','last_reconciled_at','updated_at')) <> 7 then
    raise exception 'P0-F required usage columns absent';
  end if;
end $preflight$;

create or replace function public.remove_organization_member_audited_atomic(
  p_organization_id uuid,
  p_member_id uuid,
  p_expected_user_id uuid,
  p_expected_role text,
  p_actor_user_id uuid,
  p_audit_id uuid,
  p_audit_created_at timestamptz,
  p_audit_previous_hash text,
  p_audit_event_hash text,
  p_audit_hash_signature text,
  p_audit_metadata jsonb
)
returns table (
  outcome text,
  affected_member_id uuid,
  affected_user_id uuid,
  previous_role text
)
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_outcome text;
  v_member_id uuid;
  v_user_id uuid;
  v_role text;
  v_actor_role text;
  v_target_role text;
begin
  if p_organization_id is null or p_member_id is null
     or p_expected_user_id is null or p_expected_role is null
     or p_actor_user_id is null or p_actor_user_id = p_expected_user_id
     or p_audit_id is null or p_audit_created_at is null
     or p_audit_created_at not between now() - interval '5 minutes' and now() + interval '1 minute'
     or p_audit_event_hash is null or p_audit_event_hash !~ '^[a-f0-9]{64}$'
     or p_audit_hash_signature is null or p_audit_hash_signature !~ '^[a-f0-9]{64}$'
     or (p_audit_previous_hash is not null and p_audit_previous_hash !~ '^[a-f0-9]{64}$')
     or p_audit_metadata is null or jsonb_typeof(p_audit_metadata) <> 'object'
  then
    return query select 'invalid_input'::text, null::uuid, null::uuid, null::text;
    return;
  end if;

  -- P0-F: lock usage FIRST, then tenant members in sorted ID order.
  -- Match P0-D role changes and P0-E seat suspension to avoid deadlocks.
  insert into public.organization_usage (organization_id)
  values (p_organization_id) on conflict (organization_id) do nothing;
  perform 1 from public.organization_usage as usage
  where usage.organization_id = p_organization_id for update;

  -- Lock tenant rows before authorization and removal to prevent TOCTOU.
  perform 1 from public.organization_members as om
  where om.organization_id = p_organization_id
  order by om.id for update;

  select m.role into v_actor_role
  from public.organization_members as m
  where m.organization_id = p_organization_id
    and m.user_id = p_actor_user_id
    and m.status = 'active'
    and lower(m.role) in ('owner', 'admin');

  if not found then
    return query select 'permission_denied'::text, null::uuid, null::uuid, null::text;
    return;
  end if;

  select m.role into v_target_role
  from public.organization_members as m
  where m.organization_id = p_organization_id and m.id = p_member_id;

  if lower(coalesce(v_target_role, '')) = 'owner' and lower(v_actor_role) <> 'owner' then
    return query select 'permission_denied'::text, null::uuid, null::uuid, null::text;
    return;
  end if;

  -- P0-B guards last ACTIVE owner and compares expected member state.
  select r.outcome, r.affected_member_id, r.affected_user_id, r.previous_role
  into v_outcome, v_member_id, v_user_id, v_role
  from public.remove_organization_member_atomic(
    p_organization_id, p_member_id, p_expected_user_id, p_expected_role
  ) as r;

  if v_outcome is distinct from 'removed' then
    return query select coalesce(v_outcome, 'unavailable'), v_member_id, v_user_id, v_role;
    return;
  end if;

  -- P0-F: quota/seat/admin counters share the same transaction as
  -- the membership mutation and signed audit event.
  with counted as (
    select count(*) filter (where m.status = 'active')::integer as active_members,
      count(*) filter (where m.status = 'active' and m.seat_type = 'full')::integer as full_users,
      count(*) filter (where m.status = 'active' and m.seat_type = 'participant')::integer as participants,
      count(*) filter (where m.status = 'active' and m.seat_type = 'viewer')::integer as viewers,
      count(*) filter (where m.status = 'active'
        and lower(coalesce(m.role, '')) in ('owner','admin'))::integer as active_admins
    from public.organization_members as m
    where m.organization_id = p_organization_id
  )
  update public.organization_usage as usage
  set active_members = counted.active_members,
    full_users = counted.full_users,
    participants = counted.participants,
    viewers = counted.viewers,
    active_admins = counted.active_admins,
    last_reconciled_at = now(),
    updated_at = now()
  from counted where usage.organization_id = p_organization_id;
  if not found then
    raise exception 'P0-F organization usage reconciliation failed';
  end if;

  -- Existing canonical app writer computes signed chain record.
  -- append_audit_event_chained enforces the canonical previous-hash CAS.
  -- Any error rolls this entire statement back (including FK SET NULL effects).
  perform public.append_audit_event_chained(
    p_audit_id, p_organization_id, p_actor_user_id,
    'team.member_removed'::text, 'organization_member'::text,
    p_member_id::text, p_audit_metadata, p_audit_created_at,
    p_audit_previous_hash, p_audit_event_hash,
    p_audit_hash_signature, 'sha256'::text
  );

  insert into public.audit_logs (
    organization_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    p_organization_id, p_actor_user_id, 'team.member_removed',
    'organization_member', p_member_id::text, p_audit_metadata
  );

  return query select 'removed'::text, v_member_id, v_user_id, v_role;
end;
$function$;

create or replace function public.change_organization_member_role_audited_atomic(
  p_organization_id uuid,
  p_member_id uuid,
  p_expected_user_id uuid,
  p_expected_role text,
  p_next_role text,
  p_actor_user_id uuid,
  p_audit_id uuid,
  p_audit_created_at timestamptz,
  p_audit_previous_hash text,
  p_audit_event_hash text,
  p_audit_hash_signature text,
  p_audit_metadata jsonb
)
returns table (
  outcome text,
  affected_member_id uuid,
  affected_user_id uuid,
  previous_role text,
  applied_role text
)
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_actor_role text;
  v_target_role text;
  v_target_user_id uuid;
  v_outcome text;
  v_member_id uuid;
  v_user_id uuid;
  v_previous_role text;
  v_applied_role text;
begin
  if p_organization_id is null or p_member_id is null or p_expected_user_id is null
     or nullif(btrim(p_expected_role), '') is null
     or lower(btrim(coalesce(p_next_role, ''))) not in ('owner','admin','editor','member','viewer')
     or p_actor_user_id is null or p_actor_user_id = p_expected_user_id
     or p_audit_id is null or p_audit_created_at is null
     or p_audit_created_at not between now() - interval '5 minutes' and now() + interval '1 minute'
     or p_audit_event_hash is null or p_audit_event_hash !~ '^[a-f0-9]{64}$'
     or p_audit_hash_signature is null or p_audit_hash_signature !~ '^[a-f0-9]{64}$'
     or (p_audit_previous_hash is not null and p_audit_previous_hash !~ '^[a-f0-9]{64}$')
     or p_audit_metadata is null or jsonb_typeof(p_audit_metadata) <> 'object'
  then
    return query select 'invalid_input'::text, null::uuid, null::uuid, null::text, null::text;
    return;
  end if;

  -- Existing role changes serialize on usage before membership. Preserve that
  -- order, THEN acquire every tenant membership row in a deterministic ID order.
  -- P0-B/P0-C removal acquires those same member locks in ID order. Without
  -- this shared order, locking actor first and target second may deadlock when
  -- a concurrent removal holds the target first and waits for the actor.
  insert into public.organization_usage (organization_id)
  values (p_organization_id) on conflict (organization_id) do nothing;
  perform 1 from public.organization_usage as u
   where u.organization_id = p_organization_id for update;

  perform 1
  from public.organization_members as m
  where m.organization_id = p_organization_id
  order by m.id
  for update;

  select m.role into v_actor_role
  from public.organization_members as m
  where m.organization_id = p_organization_id
    and m.user_id = p_actor_user_id
    and m.status = 'active'
    and lower(coalesce(m.role,'')) in ('owner','admin')
  for update;

  if not found then
    return query select 'permission_denied'::text, null::uuid, null::uuid, null::text, null::text;
    return;
  end if;

  select m.role, m.user_id into v_target_role, v_target_user_id
  from public.organization_members as m
  where m.organization_id = p_organization_id and m.id = p_member_id
  for update;

  if not found then
    return query select 'not_found'::text, p_member_id, null::uuid, null::text, null::text;
    return;
  end if;

  if v_target_user_id is distinct from p_expected_user_id
     or v_target_role is distinct from p_expected_role then
    return query select 'state_changed'::text, p_member_id, v_target_user_id, v_target_role, null::text;
    return;
  end if;

  if (lower(v_target_role) = 'owner' or lower(p_next_role) = 'owner')
     and lower(v_actor_role) <> 'owner' then
    return query select 'permission_denied'::text, p_member_id, v_target_user_id, v_target_role, null::text;
    return;
  end if;

  -- This function invokes the canonical contract/admin-limit/last-owner RPC.
  -- The subsequent chained event and legacy log join the SAME transaction.
  select r.outcome, r.affected_member_id, r.affected_user_id, r.previous_role, r.applied_role
  into v_outcome, v_member_id, v_user_id, v_previous_role, v_applied_role
  from public.change_organization_member_role_atomic(
    p_organization_id, p_member_id, p_expected_role, p_next_role
  ) as r;

  if v_outcome is distinct from 'changed' then
    return query select coalesce(v_outcome, 'unavailable'), v_member_id, v_user_id, v_previous_role, v_applied_role;
    return;
  end if;

  -- P0-F: quota/seat/admin counters share the same transaction as
  -- the membership mutation and signed audit event.
  with counted as (
    select count(*) filter (where m.status = 'active')::integer as active_members,
      count(*) filter (where m.status = 'active' and m.seat_type = 'full')::integer as full_users,
      count(*) filter (where m.status = 'active' and m.seat_type = 'participant')::integer as participants,
      count(*) filter (where m.status = 'active' and m.seat_type = 'viewer')::integer as viewers,
      count(*) filter (where m.status = 'active'
        and lower(coalesce(m.role, '')) in ('owner','admin'))::integer as active_admins
    from public.organization_members as m
    where m.organization_id = p_organization_id
  )
  update public.organization_usage as usage
  set active_members = counted.active_members,
    full_users = counted.full_users,
    participants = counted.participants,
    viewers = counted.viewers,
    active_admins = counted.active_admins,
    last_reconciled_at = now(),
    updated_at = now()
  from counted where usage.organization_id = p_organization_id;
  if not found then
    raise exception 'P0-F organization usage reconciliation failed';
  end if;

  -- A failed chain CAS, insert, trigger or FK forces the role update to roll back.
  perform public.append_audit_event_chained(
    p_audit_id, p_organization_id, p_actor_user_id,
    'team_member_role_changed', 'organization_member',
    p_member_id::text, p_audit_metadata, p_audit_created_at,
    p_audit_previous_hash, p_audit_event_hash, p_audit_hash_signature,
    'sha256'
  );
  insert into public.audit_logs
    (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  values
    (p_organization_id, p_actor_user_id, 'team_member_role_changed',
     'organization_member', p_member_id::text, p_audit_metadata);

  return query select 'changed'::text, v_member_id, v_user_id, v_previous_role, v_applied_role;
end;
$function$;

revoke all on function public.remove_organization_member_audited_atomic(
  uuid,uuid,uuid,text,uuid,uuid,timestamptz,text,text,text,jsonb
) from public, anon, authenticated;
grant execute on function public.remove_organization_member_audited_atomic(
  uuid,uuid,uuid,text,uuid,uuid,timestamptz,text,text,text,jsonb
) to service_role;
revoke all on function public.change_organization_member_role_audited_atomic(
  uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,text,text,text,jsonb
) from public, anon, authenticated;
grant execute on function public.change_organization_member_role_audited_atomic(
  uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,text,text,text,jsonb
) to service_role;
notify pgrst, 'reload schema';
commit;
