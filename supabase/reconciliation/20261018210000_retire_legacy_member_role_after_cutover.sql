-- P0-D: FINAL MANUAL CUTOVER ONLY. NOT an automatic migration.
-- The legacy role RPC intentionally remains callable by service_role while
-- Production still runs its old route. Do NOT apply to Production until:
-- 1) P0-B/P0-C/P0-D are integrated and tested in isolated PostgreSQL,
-- 2) P0-C legacy removal cutover has already been independently accepted,
-- 3) the new Step-Up role API is deployed and exercised with synthetic tenants,
-- 4) exact source/deployment SHA, signed audit chain, backup and rollback pass,
-- 5) owner-approved maintenance and read-only verification prove readiness.
-- Never make this an auto-applied supabase/migrations file.
begin;

do $preflight$
declare
  v_legacy oid;
  v_audited oid;
  v_legacy_removal oid;
  v_audited_removal oid;
  v_owner text;
begin
  v_legacy := to_regprocedure('public.change_organization_member_role_atomic(uuid,uuid,text,text)');
  v_audited := to_regprocedure('public.change_organization_member_role_audited_atomic(uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,text,text,text,jsonb)');
  v_legacy_removal := to_regprocedure('public.remove_organization_member_atomic(uuid,uuid,uuid,text)');
  v_audited_removal := to_regprocedure('public.remove_organization_member_audited_atomic(uuid,uuid,uuid,text,uuid,uuid,timestamptz,text,text,text,jsonb)');

  if v_legacy is null or v_audited is null
     or v_legacy_removal is null or v_audited_removal is null then
    raise exception 'P0-D cutover missing role or P0-C removal RPC dependency';
  end if;

  if not (select prosecdef from pg_proc where oid = v_audited) then
    raise exception 'P0-D audited role RPC must be security definer';
  end if;

  if has_function_privilege('anon', v_audited, 'EXECUTE')
     or has_function_privilege('authenticated', v_audited, 'EXECUTE')
     or not has_function_privilege('service_role', v_audited, 'EXECUTE') then
    raise exception 'P0-D audited role RPC has unacceptable ACL';
  end if;

  -- P0-C cutover must be complete before this dependent role cutover.
  if has_function_privilege('service_role', v_legacy_removal, 'EXECUTE')
     or not has_function_privilege('service_role', v_audited_removal, 'EXECUTE') then
    raise exception 'P0-D requires accepted P0-C audited removal cutover';
  end if;

  -- The audited SECURITY DEFINER function still invokes the guarded legacy
  -- inner RPC as its owner after service_role direct execution is revoked.
  select pg_get_userbyid(proowner) into v_owner from pg_proc where oid = v_audited;
  if v_owner is null or not has_function_privilege(v_owner, v_legacy, 'EXECUTE') then
    raise exception 'P0-D audited function owner cannot execute legacy inner role RPC';
  end if;
end $preflight$;

revoke execute on function public.change_organization_member_role_atomic(uuid,uuid,text,text)
  from service_role;

do $postcondition$
declare
  v_legacy oid := to_regprocedure('public.change_organization_member_role_atomic(uuid,uuid,text,text)');
  v_audited oid := to_regprocedure('public.change_organization_member_role_audited_atomic(uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,text,text,text,jsonb)');
begin
  if has_function_privilege('service_role', v_legacy, 'EXECUTE')
     or has_function_privilege('anon', v_legacy, 'EXECUTE')
     or has_function_privilege('authenticated', v_legacy, 'EXECUTE')
     or not has_function_privilege('service_role', v_audited, 'EXECUTE')
     or has_function_privilege('anon', v_audited, 'EXECUTE')
     or has_function_privilege('authenticated', v_audited, 'EXECUTE') then
    raise exception 'P0-D role RPC cutover ACL postcondition failed';
  end if;
end $postcondition$;

notify pgrst, 'reload schema';
commit;
