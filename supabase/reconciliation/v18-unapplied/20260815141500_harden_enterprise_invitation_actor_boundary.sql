begin;

-- Defense-in-depth wrapper for the forward Enterprise invitation authority.
-- The reconciled implementation remains private; the canonical RPC verifies
-- that the inviter is an active owner/admin before any quota or invitation work.

do $preflight$
begin
  if to_regprocedure('public.create_organization_invitation_with_seat_atomic(uuid,text,text,text,text,uuid,timestamptz)') is null then
    raise exception 'reconciled Enterprise invitation creation RPC is missing';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'organization_members' and column_name = 'status'
  ) then
    raise exception 'organization membership status is missing';
  end if;
end
$preflight$;

alter function public.create_organization_invitation_with_seat_atomic(
  uuid, text, text, text, text, uuid, timestamptz
) rename to create_organization_invitation_with_seat_atomic_reconciled;

revoke all on function public.create_organization_invitation_with_seat_atomic_reconciled(
  uuid, text, text, text, text, uuid, timestamptz
) from public, anon, authenticated, service_role;

create or replace function public.create_organization_invitation_with_seat_atomic(
  p_organization_id uuid,
  p_email text,
  p_role text,
  p_seat_type text,
  p_token text,
  p_invited_by uuid,
  p_expires_at timestamptz
)
returns table (
  outcome text,
  invitation_id uuid,
  organization_id uuid,
  email text,
  applied_role text,
  applied_seat_type text,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor_role text;
  v_actor_status text;
begin
  select lower(trim(member.role)), lower(trim(member.status))
  into v_actor_role, v_actor_status
  from public.organization_members as member
  where member.organization_id = p_organization_id
    and member.user_id = p_invited_by;

  if v_actor_status is distinct from 'active'
     or coalesce(v_actor_role, '') not in ('owner', 'admin') then
    return query select
      'forbidden'::text,
      null::uuid,
      p_organization_id,
      lower(trim(coalesce(p_email, ''))),
      lower(trim(coalesce(p_role, ''))),
      lower(trim(coalesce(p_seat_type, ''))),
      null::timestamptz,
      null::timestamptz;
    return;
  end if;

  return query
  select *
  from public.create_organization_invitation_with_seat_atomic_reconciled(
    p_organization_id,
    p_email,
    p_role,
    p_seat_type,
    p_token,
    p_invited_by,
    p_expires_at
  );
end;
$$;

revoke all on function public.create_organization_invitation_with_seat_atomic(
  uuid, text, text, text, text, uuid, timestamptz
) from public, anon, authenticated;
grant execute on function public.create_organization_invitation_with_seat_atomic(
  uuid, text, text, text, text, uuid, timestamptz
) to service_role;

comment on function public.create_organization_invitation_with_seat_atomic(
  uuid, text, text, text, text, uuid, timestamptz
) is 'Backend-only Enterprise invitation authority with active owner/admin actor gate and delegated quota enforcement.';

do $verify$
declare
  wrapper_oid oid := to_regprocedure('public.create_organization_invitation_with_seat_atomic(uuid,text,text,text,text,uuid,timestamptz)');
  inner_oid oid := to_regprocedure('public.create_organization_invitation_with_seat_atomic_reconciled(uuid,text,text,text,text,uuid,timestamptz)');
begin
  if wrapper_oid is null or inner_oid is null then
    raise exception 'Enterprise invitation actor-boundary functions are incomplete';
  end if;

  if has_function_privilege('anon', wrapper_oid, 'EXECUTE')
     or has_function_privilege('authenticated', wrapper_oid, 'EXECUTE')
     or not has_function_privilege('service_role', wrapper_oid, 'EXECUTE') then
    raise exception 'Enterprise invitation actor wrapper privileges are not canonical';
  end if;

  if has_function_privilege('anon', inner_oid, 'EXECUTE')
     or has_function_privilege('authenticated', inner_oid, 'EXECUTE')
     or has_function_privilege('service_role', inner_oid, 'EXECUTE') then
    raise exception 'reconciled Enterprise invitation implementation remains externally executable';
  end if;

  if not exists (
    select 1
    from pg_proc p
    cross join lateral unnest(coalesce(p.proconfig, array[]::text[])) setting
    where p.oid = wrapper_oid
      and p.prosecdef
      and setting = 'search_path=pg_catalog, public'
  ) then
    raise exception 'Enterprise invitation actor wrapper search path is not fixed';
  end if;
end
$verify$;

notify pgrst, 'reload schema';
commit;
