-- #2764: independent post-rehearsal readback (execute in a NEW request).
-- Isolated QA zrxrrfbllsxtleyxjpsz; verify provider project before execution.
-- No DDL, data writes, grants or migration history changes.
-- Baseline from verified transaction probe before rehearsal, NOT a fresh baseline
-- substituted after the rehearsal. Fail if legitimate intervening changes occur;
-- reconcile such drift before claiming a successful rehearsal.
BEGIN READ ONLY;
SET LOCAL search_path=pg_catalog;
SET LOCAL statement_timeout='8s';
DO $post_rehearsal$
DECLARE migration_count bigint; migration_hash text;
BEGIN
 IF current_user<>'postgres'
 OR current_setting('server_version_num')::int/10000<>17
 OR (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version IN ('20261120134634','20261120134701'))<>2
 THEN RAISE EXCEPTION 'qa_post_rehearsal_environment_refused'; END IF;
 SELECT count(*),encode(sha256(convert_to(coalesce(string_agg(version,',' ORDER BY version),''),'UTF8')),'hex')
 INTO migration_count,migration_hash FROM supabase_migrations.schema_migrations;
 IF migration_count<>12 OR migration_hash IS DISTINCT FROM '12c77d992f1a8fb7de1710d88a5b55493d584f9d1ba0f98273529fd957474ee6'
 THEN RAISE EXCEPTION 'qa_post_rehearsal_migration_history_drift'; END IF;
 IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE (n.nspname='public' AND p.proname IN ('get_my_mfa_bootstrap_context','qa_create_ai_system_for_session','qa_reassess_ai_system_for_session'))
 OR (n.nspname='app_private' AND p.proname='qa_require_ai_inventory_actor'))
 THEN RAISE EXCEPTION 'qa_post_rehearsal_candidate_or_bridge_present'; END IF;
 IF has_function_privilege('anon','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
 OR has_function_privilege('authenticated','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
 OR has_function_privilege('anon','public.reassess_ai_system_atomic(uuid,uuid,timestamptz,uuid,jsonb)','EXECUTE')
 OR has_function_privilege('authenticated','public.reassess_ai_system_atomic(uuid,uuid,timestamptz,uuid,jsonb)','EXECUTE')
 OR has_function_privilege('anon','public.append_audit_event_chained(uuid,uuid,uuid,text,text,text,jsonb,timestamptz,text,text,text,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.append_audit_event_chained(uuid,uuid,uuid,text,text,text,jsonb,timestamptz,text,text,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'qa_post_rehearsal_privileged_acl_drift'; END IF;
 IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p'))<>115
 OR (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relrowsecurity AND c.relforcerowsecurity)<>115
 OR (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='storage' AND c.relkind IN ('r','p') AND c.relrowsecurity)<>10
 THEN RAISE EXCEPTION 'qa_post_rehearsal_rls_drift'; END IF;
END $post_rehearsal$;
SELECT 'QA_POST_REHEARSAL_CATALOG_BASELINE_MATCH' AS outcome,12 AS migration_count,115 AS public_rls_force,10 AS storage_rls,true AS candidate_names_absent,true AS privileged_acl_restricted,
 'CATALOG_ONLY_REQUIRES_SEPARATE_REHEARSAL_EXECUTION_EVIDENCE' AS evidence_class;
ROLLBACK;
