-- RISCK COMPLY P0: preserve the last ACTIVE owner in atomic membership removals.
-- Forward-only source migration; never rewrite an already applied migration.
-- Separate P0: deletion and audit-chain append must become one DB transaction.
begin;

do $preflight$
begin
  if to_regprocedure('public.remove_organization_member_atomic(uuid,uuid,uuid,text)') is null
     or to_regclass('public.organization_members') is null
     or not exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'organization_members'
         and column_name = 'status'
     ) then
    raise exception 'P0 last-active-owner guard dependencies missing';
  end if;
end
$preflight$;

create or replace function public.remove_organization_member_atomic(
  p_organization_id uuid,
  p_member_id uuid,
  p_expected_user_id uuid,
  p_expected_role text
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
  v_member public.organization_members%rowtype;
  v_active_owner_count integer;
begin
  -- Preserve the existing fail-closed legacy identity contract. A separately
  -- reviewed Clerk-only identity migration is required for nullable user_id.
  if p_organization_id is null or p_member_id is null or p_expected_user_id is null then
    return query select 'invalid_input'::text, null::uuid, null::uuid, null::text;
    return;
  end if;

  -- Ordered tenant locks serialize competing removals. Existing role-change
  -- functions must use a compatible lock ordering; verify in PostgreSQL.
  perform 1
  from public.organization_members as om
  where om.organization_id = p_organization_id
  order by om.id for update;

  select om.* into v_member
  from public.organization_members as om
  where om.id = p_member_id
    and om.organization_id = p_organization_id
  for update;

  if not found then
    return query select 'not_found'::text, p_member_id, null::uuid, null::text;
    return;
  end if;

  if v_member.user_id is distinct from p_expected_user_id
     or v_member.role is distinct from p_expected_role then
    return query select 'state_changed'::text, p_member_id, v_member.user_id, v_member.role;
    return;
  end if;

  -- Suspended/deprovisioned owners do not count toward remaining active owners.
  if lower(coalesce(v_member.role, '')) = 'owner'
     and v_member.status = 'active' then
    select count(*)::integer into v_active_owner_count
    from public.organization_members as om
    where om.organization_id = p_organization_id
      and lower(coalesce(om.role, '')) = 'owner'
      and om.status = 'active';

    if v_active_owner_count <= 1 then
      return query select 'last_owner'::text, p_member_id, v_member.user_id, v_member.role;
      return;
    end if;
  end if;

  delete from public.organization_members as om
  where om.id = p_member_id
    and om.organization_id = p_organization_id
    and om.user_id = p_expected_user_id
    and om.role is not distinct from p_expected_role
    and om.status is not distinct from v_member.status;

  if not found then
    return query select 'state_changed'::text, p_member_id, v_member.user_id, v_member.role;
    return;
  end if;

  return query select 'removed'::text, p_member_id, v_member.user_id, v_member.role;
end;
$function$;

revoke all on function public.remove_organization_member_atomic(uuid,uuid,uuid,text)
  from public, anon, authenticated;
grant execute on function public.remove_organization_member_atomic(uuid,uuid,uuid,text)
  to service_role;

notify pgrst, 'reload schema';
commit;
