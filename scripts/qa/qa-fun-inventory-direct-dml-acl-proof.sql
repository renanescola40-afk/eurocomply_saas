-- #2764: isolated QA, read-only role-level DML planning proof.
-- No DDL, grants, data writes or signed-session claims.
-- EXPLAIN without ANALYZE must reject every plan at the table ACL boundary.
-- Run only against QA zrxrrfbllsxtleyxjpsz; never substitute for signed HTTP tests.
BEGIN READ ONLY;
DO $proof$
DECLARE principal text; t text; op text; cmd text; denied int:=0;
BEGIN
 FOR principal IN SELECT unnest(ARRAY['anon','authenticated']) LOOP
  EXECUTE format('SET LOCAL ROLE %I',principal);
  IF current_user <> principal THEN RAISE EXCEPTION 'role_precondition_failed'; END IF;
  FOREACH t IN ARRAY ARRAY['ai_systems','ai_system_history','audit_events','audit_logs'] LOOP
   FOREACH op IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
    cmd := CASE op WHEN 'INSERT' THEN format('EXPLAIN INSERT INTO public.%I DEFAULT VALUES',t) WHEN 'UPDATE' THEN format('EXPLAIN UPDATE public.%I SET id=id WHERE false',t) ELSE format('EXPLAIN DELETE FROM public.%I WHERE false',t) END;
    BEGIN
     EXECUTE cmd;
     RAISE EXCEPTION 'unexpected_dml_plan_authorized';
    EXCEPTION WHEN insufficient_privilege THEN
     IF SQLERRM NOT LIKE 'permission denied for table %' THEN RAISE EXCEPTION 'unexpected_denial_reason'; END IF;
     denied:=denied+1;
    END;
   END LOOP;
  END LOOP;
  RESET ROLE;
 END LOOP;
 IF denied<>24 THEN RAISE EXCEPTION 'unexpected_case_count'; END IF;
 PERFORM set_config('risck_qa.dml_plan_denials',denied::text,true);
END $proof$;
SELECT current_setting('risck_qa.dml_plan_denials',true)::int AS denied_dml_plans,24 AS expected,'SQL_ROLE_PLANNING_ONLY_NO_EXECUTION' AS evidence_class;
ROLLBACK;
