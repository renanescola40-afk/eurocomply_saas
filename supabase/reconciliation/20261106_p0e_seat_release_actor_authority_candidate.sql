-- RISCK COMPLY P0-E forward SQL CANDIDATE, NOT AUTOMATIC MIGRATION OR RELEASE.
-- Reproduced QA PG17: unaffiliated actor released an ordinary member.
-- QA transient CREATE OR REPLACE + eight synthetic tests PASSED and ROLLED BACK.
-- Requires review, generated versioned migration, isolated QA replay, CI, and human approval.
-- Absolutely no Production DDL or DML authorized by this file.
begin;
do $preflight$
declare v_oid oid := to_regprocedure('public.release_organization_seat_atomic(uuid,uuid,uuid,text,text)');
begin
 if v_oid is null or md5(pg_get_functiondef(v_oid)) <> 'd4714bb9382ae0322376ed433e859162' then
  raise exception 'P0E_SOURCE_FINGERPRINT_DRIFT_REVIEW_REQUIRED';
 end if;
 if has_function_privilege('anon',v_oid,'EXECUTE')
    or has_function_privilege('authenticated',v_oid,'EXECUTE')
    or not has_function_privilege('service_role',v_oid,'EXECUTE') then
  raise exception 'P0E_RPC_PRIVILEGE_DRIFT_REVIEW_REQUIRED';
 end if;
end $preflight$;

CREATE OR REPLACE FUNCTION public.release_organization_seat_atomic(p_organization_id uuid, p_member_id uuid, p_actor_user_id uuid, p_idempotency_key text, p_source text DEFAULT 'admin'::text)
 RETURNS TABLE(outcome text, membership_id uuid, released_seat_type text, active_members integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_membership public.organization_members%rowtype;
  v_operation_id uuid;
  v_source text := lower(trim(coalesce(p_source,'')));
  v_active_members integer := 0;
  v_full_users integer := 0;
  v_participants integer := 0;
  v_viewers integer := 0;
  v_active_admins integer := 0;
  v_actor_role text;
  v_active_owner_count integer := 0;
begin
  if p_organization_id is null or p_member_id is null or p_actor_user_id is null
     or length(trim(coalesce(p_idempotency_key,''))) not between 8 and 200 then
    return query select 'invalid_input'::text,null::uuid,null::text,0; return;
  end if;
  if v_source not in ('invitation','csv','scim','sso','api','platform','admin','reactivation') then
    return query select 'invalid_source'::text,null::uuid,null::text,0; return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || ':' || p_idempotency_key,0));
  insert into public.enterprise_seat_operations (organization_id,idempotency_key,operation,source,actor_user_id)
  values (p_organization_id,p_idempotency_key,'release',v_source,p_actor_user_id)
  on conflict (organization_id,idempotency_key) do nothing returning id into v_operation_id;
  if v_operation_id is null then return query select 'duplicate'::text,null::uuid,null::text,0; return; end if;

  insert into public.organization_usage (organization_id) values (p_organization_id)
  on conflict (organization_id) do nothing;
  perform 1 from public.organization_usage as usage where usage.organization_id=p_organization_id for update;

  -- Serialize owner state across concurrent owner removals/role changes.
  -- Use the same deterministic tenant membership row order as P0-B/P0-D.
  perform 1 from public.organization_members as member
  where member.organization_id=p_organization_id
  order by member.id for update;

  -- P0-E: all seat releases require a current, same-tenant owner/admin actor.
  -- Owner targets retain the existing stricter owner-only requirement.
  -- The existing usage-then-ordered-membership locks serialize actor authority.
  select actor.role into v_actor_role
  from public.organization_members as actor
  where actor.organization_id=p_organization_id
    and actor.user_id=p_actor_user_id
    and actor.status='active'
    and lower(trim(coalesce(actor.role,''))) in ('owner','admin')
  order by case when lower(trim(coalesce(actor.role,'')))='owner' then 0 else 1 end,actor.id
  limit 1;
  if not found then
    delete from public.enterprise_seat_operations where id=v_operation_id;
    return query select 'permission_denied'::text,null::uuid,null::text,0;
    return;
  end if;

  select member.* into v_membership from public.organization_members as member
  where member.organization_id=p_organization_id and member.id=p_member_id for update;
  if not found then
    update public.enterprise_seat_operations set outcome='not_found',completed_at=now() where id=v_operation_id;
    return query select 'not_found'::text,p_member_id,null::text,0; return;
  end if;
  if v_membership.status<>'active' then
    select count(*)::integer into v_active_members from public.organization_members
    where organization_id=p_organization_id and status='active';
    update public.enterprise_seat_operations set outcome='already_released',membership_id=v_membership.id,completed_at=now() where id=v_operation_id;
    return query select 'already_released'::text,v_membership.id,v_membership.seat_type,v_active_members; return;
  end if;

  -- An owner may not be suspended/deprovisioned by a non-owner actor, and
  -- an organization must never lose its final ACTIVE owner through this lane.
  -- A blocked attempt must not consume the idempotency key indefinitely.
  if lower(coalesce(v_membership.role,''))='owner' then
    select actor.role into v_actor_role
    from public.organization_members as actor
    where actor.organization_id=p_organization_id
      and actor.user_id=p_actor_user_id
      and actor.status='active'
      and lower(coalesce(actor.role,''))='owner'
    limit 1;

    if not found then
      delete from public.enterprise_seat_operations where id=v_operation_id;
      return query select 'permission_denied'::text,v_membership.id,v_membership.seat_type,0;
      return;
    end if;

    select count(*)::integer into v_active_owner_count
    from public.organization_members as owner_member
    where owner_member.organization_id=p_organization_id
      and owner_member.status='active'
      and lower(coalesce(owner_member.role,''))='owner';

    if v_active_owner_count<=1 then
      delete from public.enterprise_seat_operations where id=v_operation_id;
      return query select 'last_owner'::text,v_membership.id,v_membership.seat_type,0;
      return;
    end if;
  end if;

  update public.organization_members set status=case when v_source='scim' then 'deprovisioned' else 'suspended' end,updated_at=now()
  where id=v_membership.id and organization_id=p_organization_id;

  select count(*) filter (where member.status='active')::integer,
    count(*) filter (where member.status='active' and member.seat_type='full')::integer,
    count(*) filter (where member.status='active' and member.seat_type='participant')::integer,
    count(*) filter (where member.status='active' and member.seat_type='viewer')::integer,
    count(*) filter (where member.status='active' and lower(coalesce(member.role,'')) in ('owner','admin'))::integer
  into v_active_members,v_full_users,v_participants,v_viewers,v_active_admins
  from public.organization_members as member where member.organization_id=p_organization_id;

  update public.organization_usage set active_members=v_active_members,full_users=v_full_users,
    participants=v_participants,viewers=v_viewers,active_admins=v_active_admins,last_reconciled_at=now(),updated_at=now()
  where organization_id=p_organization_id;

  insert into public.audit_logs (organization_id,actor_id,action,entity_type,entity_id,metadata)
  values (p_organization_id,p_actor_user_id,'enterprise.seat_released','organization_member',v_membership.id::text,
    jsonb_build_object('source',v_source,'seat_type',v_membership.seat_type));

  update public.enterprise_seat_operations set outcome='released',membership_id=v_membership.id,completed_at=now(),
    metadata=jsonb_build_object('active_members',v_active_members) where id=v_operation_id;
  return query select 'released'::text,v_membership.id,v_membership.seat_type,v_active_members;
end;
$function$
;

revoke execute on function public.release_organization_seat_atomic(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.release_organization_seat_atomic(uuid,uuid,uuid,text,text) to service_role;
commit;
