begin;

create schema if not exists app_private;

-- These membership helpers are intentionally SECURITY DEFINER because RLS must
-- evaluate active membership without recursively depending on the caller's
-- visibility into organization_members. They must not, however, remain in the
-- exposed public API schema where PostgREST publishes them as RPC endpoints.
do $$
begin
  if to_regprocedure('public.enterprise_member_can_read(uuid)') is not null then
    if to_regprocedure('app_private.enterprise_member_can_read(uuid)') is not null then
      raise exception 'duplicate enterprise_member_can_read helper exists in app_private';
    end if;
    execute 'alter function public.enterprise_member_can_read(uuid) set schema app_private';
  end if;

  if to_regprocedure('public.enterprise_member_can_manage(uuid)') is not null then
    if to_regprocedure('app_private.enterprise_member_can_manage(uuid)') is not null then
      raise exception 'duplicate enterprise_member_can_manage helper exists in app_private';
    end if;
    execute 'alter function public.enterprise_member_can_manage(uuid) set schema app_private';
  end if;
end
$$;

revoke all on function app_private.enterprise_member_can_read(uuid) from public, anon;
revoke all on function app_private.enterprise_member_can_manage(uuid) from public, anon;
grant execute on function app_private.enterprise_member_can_read(uuid) to authenticated, service_role;
grant execute on function app_private.enterprise_member_can_manage(uuid) to authenticated, service_role;

-- Trigger helpers do not need a mutable caller-controlled search_path. This is
-- deliberately fail-closed: the helper is part of the reviewed append-only QMS
-- surface, so a missing function must abort the migration rather than silently
-- skipping hardening.
alter function public.prevent_ai_qms_decision_mutation()
  set search_path = pg_catalog;

-- Fail closed if the exposed RPC surface or search_path hardening regresses.
do $$
declare
  decision_search_path text[];
begin
  if to_regprocedure('public.enterprise_member_can_read(uuid)') is not null
     or to_regprocedure('public.enterprise_member_can_manage(uuid)') is not null then
    raise exception 'Enterprise membership SECURITY DEFINER helpers remain exposed in public schema';
  end if;

  if to_regprocedure('app_private.enterprise_member_can_read(uuid)') is null
     or to_regprocedure('app_private.enterprise_member_can_manage(uuid)') is null then
    raise exception 'Enterprise membership helpers are missing from app_private';
  end if;

  if not has_function_privilege('authenticated', 'app_private.enterprise_member_can_read(uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'app_private.enterprise_member_can_manage(uuid)', 'EXECUTE') then
    raise exception 'Authenticated RLS helper execution grant is missing';
  end if;

  if has_function_privilege('anon', 'app_private.enterprise_member_can_read(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'app_private.enterprise_member_can_manage(uuid)', 'EXECUTE') then
    raise exception 'Anonymous role can execute private Enterprise membership helpers';
  end if;

  if exists (
    select 1
    from pg_policies
    where (coalesce(qual, '') ilike '%enterprise_member_can_read%'
           or coalesce(with_check, '') ilike '%enterprise_member_can_read%')
      and coalesce(qual, '') not ilike '%app_private.enterprise_member_can_read%'
      and coalesce(with_check, '') not ilike '%app_private.enterprise_member_can_read%'
  ) then
    raise exception 'An RLS policy still resolves enterprise_member_can_read outside app_private';
  end if;

  select p.proconfig
    into decision_search_path
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'prevent_ai_qms_decision_mutation'
    and pg_get_function_identity_arguments(p.oid) = '';

  if decision_search_path is null
     or not ('search_path=pg_catalog' = any(decision_search_path)) then
    raise exception 'prevent_ai_qms_decision_mutation search_path is not fixed to pg_catalog';
  end if;
end
$$;

commit;
