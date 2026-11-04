-- RISCK COMPLY / NORMAL_PRODUCT_TRUST V20
-- Read-only QA metadata probe. Run ONLY against QA project zrxrrfbllsxtleyxjpsz.
-- No customer rows, credentials, tenant data, or provider writes are queried.
-- This proves only existence/RLS/role EXECUTE grants, not tenant runtime isolation.
WITH expected(name) AS (
  VALUES
  ('ai_systems'),('ai_assessments'),('ai_fria_assessments'),('ai_fria_evidence'),
  ('ai_fria_decisions'),('ai_annex_iv_packages'),('ai_article50_assessments'),
  ('ai_literacy_programs'),('ai_prohibited_practice_reviews'),
  ('ai_provider_data_programs'),('ai_qms_systems'),('ai_conformity_assessments'),
  ('evidence_items'),('data_subject_requests'),('documents'),
  ('gap_assessments'),('compliance_findings')
), checked AS (
  SELECT expected.name,
         c.oid IS NOT NULL AS present,
         coalesce(c.relrowsecurity,false) AS rls,
         coalesce(c.relforcerowsecurity,false) AS force_rls
  FROM expected
  LEFT JOIN pg_namespace n ON n.nspname='public'
  LEFT JOIN pg_class c ON c.relnamespace=n.oid
    AND c.relname=expected.name AND c.relkind IN ('r','p')
), rpc AS (
  SELECT p.proname AS name,
         bool_and(has_function_privilege('service_role',p.oid,'EXECUTE')) AS service_role_execute,
         bool_or(has_function_privilege('anon',p.oid,'EXECUTE')) AS anon_execute,
         bool_or(has_function_privilege('authenticated',p.oid,'EXECUTE')) AS authenticated_execute
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.proname IN ('complete_onboarding_activation_atomic',
     'create_fria_assessment_atomic','approve_fria_assessment_atomic',
     'compensate_fria_approval_audit_failure')
  GROUP BY p.proname
)
SELECT jsonb_build_object(
  'observed_at_utc',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'project','zrxrrfbllsxtleyxjpsz',
  'postgres_version',current_setting('server_version'),
  'tables_expected',(SELECT count(*) FROM checked),
  'tables_present',(SELECT count(*) FROM checked WHERE present),
  'present_tables_rls_and_force',(SELECT count(*) FROM checked WHERE present AND rls AND force_rls),
  'missing_tables',(SELECT coalesce(jsonb_agg(name ORDER BY name),'[]'::jsonb) FROM checked WHERE NOT present),
  'rpcs_expected',4,
  'rpcs_found',(SELECT count(*) FROM rpc),
  'rpcs_all_service_role_only',(SELECT coalesce(bool_and(service_role_execute AND NOT anon_execute AND NOT authenticated_execute),false) FROM rpc),
  'rpc_names',(SELECT coalesce(jsonb_agg(name ORDER BY name),'[]'::jsonb) FROM rpc)
) AS qa_product_module_metadata;
