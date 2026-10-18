-- P0-D role transition and signed audit must be one PostgreSQL transaction.
-- Do NOT apply in production until isolated PG failure/concurrency/E2E tests pass
-- and P0-B/P0-C, MFA migration, exact SHA cutover and rollback are accepted.
begin;

do $preflight$
begin
  if to_regprocedure('public.change_organization_member_role_atomic(uuid,uuid,text,text)') is null
     or to_regprocedure('public.append_audit_event_chained(uuid,uuid,uuid,text,text,text,jsonb,timestamptz,text,text,text,text)') is null
     or to_regclass('public.organization_members') is null
     or to_regclass('public.organization_usage') is null
     or to_regclass('public.audit_events') is null
     or to_regclass('public.audit_logs') is null then
    raise exception 'P0-D required membership transition, usage or audit dependencies are missing';
  end if;
end $preflight$;

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

  -- Use the legacy atomic role transition lock order: usage first, then member.
  -- This serializes role changes with the existing entitlement/owner-count checks.
  insert into public.organization_usage (organization_id)
  values (p_organization_id) on conflict (organization_id) do nothing;
  perform 1 from public.organization_usage as u
   where u.organization_id = p_organization_id for update;

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

revoke all on function public.change_organization_member_role_audited_atomic(
  uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,text,text,text,jsonb
) from public, anon, authenticated;
grant execute on function public.change_organization_member_role_audited_atomic(
  uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,text,text,text,jsonb
) to service_role;

notify pgrst, 'reload schema';
commit;
