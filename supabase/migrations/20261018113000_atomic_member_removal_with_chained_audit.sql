-- P0-C: membership deletion, tamper-evident chain append and legacy audit log
-- share one PostgreSQL transaction. Depends on 20261018023000 P0-B.
-- DO NOT migrate production until isolated PostgreSQL tests, exact-source cutover
-- and rollback evidence have been accepted.
begin;

do $preflight$
declare v_p0b text;
begin
  if to_regprocedure('public.remove_organization_member_atomic(uuid,uuid,uuid,text)') is null
     or to_regprocedure('public.append_audit_event_chained(uuid,uuid,uuid,text,text,text,jsonb,timestamptz,text,text,text,text)') is null
     or to_regclass('public.organization_members') is null
     or to_regclass('public.audit_events') is null
     or to_regclass('public.audit_logs') is null then
    raise exception 'P0-C required membership/audit relations or functions are missing';
  end if;
  select pg_get_functiondef('public.remove_organization_member_atomic(uuid,uuid,uuid,text)'::regprocedure) into v_p0b;
  if v_p0b not ilike '%v_active_owner_count%'
     or v_p0b not ilike '%om.status = ''active''%' then
    raise exception 'P0-C requires P0-B last-active-owner guard';
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

revoke all on function public.remove_organization_member_audited_atomic(
  uuid,uuid,uuid,text,uuid,uuid,timestamptz,text,text,text,jsonb
) from public, anon, authenticated;
grant execute on function public.remove_organization_member_audited_atomic(
  uuid,uuid,uuid,text,uuid,uuid,timestamptz,text,text,text,jsonb
) to service_role;
notify pgrst, 'reload schema';
commit;
