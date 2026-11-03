-- Local isolated PostgreSQL 17 fixture only. Never applied to QA/PROD.
-- Reproduce mixed UUID Supabase Auth and text Clerk JWT subject semantics.
-- The existing baseline auth.uid() fixture deliberately casts to uuid to catch
-- use of auth.uid() on non-UUID Clerk subjects (Postgres 22P02).

alter table public.organization_members add column clerk_user_id text;

create or replace function public.current_jwt_subject()
returns text language sql stable set search_path = pg_catalog
as $function$
  select nullif(coalesce(
    current_setting('request.jwt.claim.sub', true),
    (nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'sub')
  ), '');
$function$;

create or replace function public.current_legacy_user_id()
returns uuid language sql stable set search_path = pg_catalog
as $function$
  select case
    when public.current_jwt_subject() ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.current_jwt_subject()::uuid
    else null
  end;
$function$;

create or replace function public.current_clerk_user_id()
returns text language sql stable set search_path = pg_catalog
as $function$
  select case
    when public.current_jwt_subject() is null then null
    when public.current_jwt_subject() ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then null
    else public.current_jwt_subject()
  end;
$function$;

create or replace function app_private.is_org_member(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog
as $function$
  select target_organization_id is not null
    and public.tenant_mfa_satisfied(target_organization_id)
    and exists (
      select 1 from public.organization_members om
      where om.organization_id = target_organization_id
        and lower(coalesce(om.status,'')) = 'active'
        and (
          (public.current_legacy_user_id() is not null
           and om.user_id = public.current_legacy_user_id())
          or
          (public.current_clerk_user_id() is not null
           and om.clerk_user_id = public.current_clerk_user_id())
        )
    );
$function$;

create or replace function app_private.has_org_role(
  target_organization_id uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = pg_catalog
as $function$
  select target_organization_id is not null
    and public.tenant_mfa_satisfied(target_organization_id)
    and exists (
      select 1 from public.organization_members om
      where om.organization_id = target_organization_id
        and lower(coalesce(om.status,'')) = 'active'
        and lower(om.role) = any(allowed_roles)
        and (
          (public.current_legacy_user_id() is not null
           and om.user_id = public.current_legacy_user_id())
          or
          (public.current_clerk_user_id() is not null
           and om.clerk_user_id = public.current_clerk_user_id())
        )
    );
$function$;

revoke all on function public.current_jwt_subject() from public, anon;
revoke all on function public.current_legacy_user_id() from public, anon;
revoke all on function public.current_clerk_user_id() from public, anon;
revoke all on function app_private.is_org_member(uuid) from public, anon;
revoke all on function app_private.has_org_role(uuid,text[]) from public, anon;

grant execute on function public.current_jwt_subject() to authenticated, service_role;
grant execute on function public.current_legacy_user_id() to authenticated, service_role;
grant execute on function public.current_clerk_user_id() to authenticated, service_role;
grant execute on function app_private.is_org_member(uuid) to authenticated, service_role;
grant execute on function app_private.has_org_role(uuid,text[]) to authenticated, service_role;
