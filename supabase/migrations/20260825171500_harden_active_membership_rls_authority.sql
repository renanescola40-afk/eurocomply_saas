begin;

-- P0 tenant-authorization closure.
-- The governed licensing identity adds organization_members.status, but the
-- canonical private RLS helpers historically authorized any membership row.
-- Once status exists, suspended/deprovisioned memberships must cease to be
-- tenant authority for PostgREST and Storage immediately.

do $preconditions$
begin
  if to_regclass('public.organization_members') is null then
    raise exception 'organization_members is missing';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organization_members'
      and column_name = 'status'
      and is_nullable = 'NO'
  ) then
    raise exception 'organization_members.status is missing or nullable';
  end if;

  if to_regprocedure('app_private.is_org_member(uuid)') is null
     or to_regprocedure('app_private.has_org_role(uuid,text[])') is null then
    raise exception 'canonical private organization authorization helpers are missing';
  end if;
end
$preconditions$;

create or replace function app_private.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select target_organization_id is not null
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id = target_organization_id
        and lower(coalesce(om.status, '')) = 'active'
        and (
          (
            public.current_legacy_user_id() is not null
            and om.user_id = public.current_legacy_user_id()
          )
          or (
            public.current_clerk_user_id() is not null
            and om.clerk_user_id = public.current_clerk_user_id()
          )
        )
    );
$$;

create or replace function app_private.has_org_role(
  target_organization_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select target_organization_id is not null
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id = target_organization_id
        and lower(coalesce(om.status, '')) = 'active'
        and lower(om.role) = any(allowed_roles)
        and (
          (
            public.current_legacy_user_id() is not null
            and om.user_id = public.current_legacy_user_id()
          )
          or (
            public.current_clerk_user_id() is not null
            and om.clerk_user_id = public.current_clerk_user_id()
          )
        )
    );
$$;

-- Preserve the existing private-helper execution model used by RLS policies.
revoke all on function app_private.is_org_member(uuid) from public, anon;
revoke all on function app_private.has_org_role(uuid, text[]) from public, anon;
grant execute on function app_private.is_org_member(uuid) to authenticated, service_role;
grant execute on function app_private.has_org_role(uuid, text[]) to authenticated, service_role;

do $postconditions$
declare
  member_definition text;
  role_definition text;
  status_constraint_valid boolean := false;
begin
  select pg_get_functiondef('app_private.is_org_member(uuid)'::regprocedure)
    into member_definition;
  select pg_get_functiondef('app_private.has_org_role(uuid,text[])'::regprocedure)
    into role_definition;

  if coalesce(member_definition, '') not like '%status%active%'
     or coalesce(role_definition, '') not like '%status%active%' then
    raise exception 'canonical private RLS helpers are not active-membership aware';
  end if;

  select exists (
    select 1
    from pg_constraint constraint_row
    where constraint_row.conrelid = 'public.organization_members'::regclass
      and constraint_row.conname = 'organization_members_status_check'
      and constraint_row.convalidated
      and pg_get_constraintdef(constraint_row.oid) like '%active%'
      and pg_get_constraintdef(constraint_row.oid) like '%suspended%'
      and pg_get_constraintdef(constraint_row.oid) like '%deprovisioned%'
  ) into status_constraint_valid;

  if not status_constraint_valid then
    raise exception 'organization_members status constraint is not canonical';
  end if;

  if has_function_privilege('anon', 'app_private.is_org_member(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'app_private.has_org_role(uuid,text[])', 'EXECUTE')
     or not has_function_privilege('authenticated', 'app_private.is_org_member(uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'app_private.has_org_role(uuid,text[])', 'EXECUTE')
     or not has_function_privilege('service_role', 'app_private.is_org_member(uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'app_private.has_org_role(uuid,text[])', 'EXECUTE') then
    raise exception 'canonical private RLS helper privileges drifted';
  end if;
end
$postconditions$;

notify pgrst, 'reload schema';

commit;
