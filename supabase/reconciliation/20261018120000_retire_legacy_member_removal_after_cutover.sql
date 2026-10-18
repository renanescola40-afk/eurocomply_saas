-- MANUAL CUTOVER ONLY, NOT AN AUTOMATIC MIGRATION.
-- Apply only AFTER the new API code is deployed, exercised with real synthetic
-- Auth+AAL2 tenant fixtures, and exact-SHA backup/rollback targets are proven.
-- Before this phase, the older published app still requires legacy EXECUTE.
begin;
do $preflight$
declare
  v_legacy oid;
  v_audited oid;
  v_owner text;
begin
  v_legacy := to_regprocedure('public.remove_organization_member_atomic(uuid,uuid,uuid,text)');
  v_audited := to_regprocedure('public.remove_organization_member_audited_atomic(uuid,uuid,uuid,text,uuid,uuid,timestamptz,text,text,text,jsonb)');
  if v_legacy is null or v_audited is null then
    raise exception 'P0-C cutover preflight missing legacy or audited function';
  end if;
  if not (select prosecdef from pg_proc where oid=v_audited) then
    raise exception 'P0-C audited function must be security definer';
  end if;
  if has_function_privilege('anon',v_audited,'EXECUTE')
     or has_function_privilege('authenticated',v_audited,'EXECUTE')
     or not has_function_privilege('service_role',v_audited,'EXECUTE') then
    raise exception 'P0-C audited function ACL mismatch';
  end if;
  select pg_get_userbyid(proowner) into v_owner from pg_proc where oid=v_audited;
  if v_owner is null or not has_function_privilege(v_owner,v_legacy,'EXECUTE') then
    raise exception 'P0-C audited function owner cannot invoke guarded legacy inner RPC';
  end if;
end $preflight$;

revoke execute on function public.remove_organization_member_atomic(uuid,uuid,uuid,text)
  from service_role;

do $postcondition$
declare
  v_legacy oid := to_regprocedure('public.remove_organization_member_atomic(uuid,uuid,uuid,text)');
  v_audited oid := to_regprocedure('public.remove_organization_member_audited_atomic(uuid,uuid,uuid,text,uuid,uuid,timestamptz,text,text,text,jsonb)');
begin
  if has_function_privilege('service_role',v_legacy,'EXECUTE')
    or has_function_privilege('anon',v_legacy,'EXECUTE')
    or has_function_privilege('authenticated',v_legacy,'EXECUTE')
    or not has_function_privilege('service_role',v_audited,'EXECUTE') then
    raise exception 'P0-C cutover ACL postcondition failed';
  end if;
end $postcondition$;
notify pgrst,'reload schema';
commit;
