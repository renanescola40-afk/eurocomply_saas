-- RISCK COMPLY P0-E — read-only post-application assertion.
-- This file does NOT install any function, migrate a database, update customer
-- records, grant privileges, or accept an Enterprise gate. It MUST fail closed
-- on original vulnerable function and unexpected installed function identity.
-- Run only on independently authorized QA or after governed release.
DO $verify$
DECLARE
  v_fn oid := to_regprocedure('public.release_organization_seat_atomic(uuid,uuid,uuid,text,text)');
  v_def text;
  v_actor_start integer;
  v_target_start integer;
  v_lock_usage integer;
  v_lock_members integer;
BEGIN
  IF v_fn IS NULL THEN
    RAISE EXCEPTION 'P0E_POSTCONDITION_FUNCTION_MISSING';
  END IF;
  v_def := pg_get_functiondef(v_fn);
  IF md5(v_def) <> 'd14689e31afa4a7e8096fec686d39bd4' THEN
    RAISE EXCEPTION 'P0E_POSTCONDITION_EXACT_FUNCTION_IDENTITY_MISMATCH';
  END IF;
  IF has_function_privilege('public',v_fn,'EXECUTE')
    OR has_function_privilege('anon',v_fn,'EXECUTE')
    OR has_function_privilege('authenticated',v_fn,'EXECUTE')
    OR NOT has_function_privilege('service_role',v_fn,'EXECUTE') THEN
    RAISE EXCEPTION 'P0E_POSTCONDITION_RPC_EXECUTE_ACL_UNSAFE';
  END IF;
  IF position('SECURITY DEFINER' in v_def)=0
    OR position('SET search_path TO ''pg_catalog''' in v_def)=0 THEN
    RAISE EXCEPTION 'P0E_POSTCONDITION_DEFINER_OR_SEARCH_PATH_CHANGED';
  END IF;
  v_actor_start := position('select actor.role into v_actor_role' in v_def);
  v_target_start := position('select member.* into v_membership' in v_def);
  v_lock_usage := position('from public.organization_usage as usage' in v_def);
  v_lock_members := position('order by member.id for update' in v_def);
  IF v_actor_start=0 OR v_target_start=0 OR v_actor_start >= v_target_start
     OR v_lock_usage=0 OR v_lock_members=0 OR v_lock_usage>=v_lock_members THEN
    RAISE EXCEPTION 'P0E_POSTCONDITION_ACTOR_GUARD_OR_LOCK_ORDER';
  END IF;
  IF position('actor.organization_id=p_organization_id' in v_def)=0
     OR position('actor.user_id=p_actor_user_id' in v_def)=0
     OR position('actor.status=''active''' in v_def)=0
     OR position('in (''owner'',''admin'')' in v_def)=0
     OR position('v_active_owner_count<=1' in v_def)=0
     OR position('delete from public.enterprise_seat_operations where id=v_operation_id' in v_def)=0
     OR position('insert into public.audit_logs' in v_def)=0
     OR position('update public.organization_usage set active_members=' in v_def)=0 THEN
    RAISE EXCEPTION 'P0E_POSTCONDITION_AUTHORIZATION_OR_INVARIANT_MISSING';
  END IF;
END $verify$;
SELECT 'P0E_SQL_IDENTITY_AND_ACL_POSTCONDITIONS_PASS' AS result;
