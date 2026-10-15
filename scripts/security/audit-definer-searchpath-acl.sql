-- READ-ONLY postgresql system-catalog evidence: production SECURITY DEFINER search_path.
-- Invoking this SQL does not execute any of the inspected functions and reads no customer rows.
-- Findings are metadata indicators, not a runtime authorization proof or audit opinion.
WITH definer AS (
 SELECT p.oid, p.proname,
        coalesce((
           SELECT split_part(s, '=', 2)
           FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) s
           WHERE s LIKE 'search_path=%' LIMIT 1
        ), '') AS path
 FROM pg_proc p
 JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.prosecdef
)
SELECT
 (SELECT count(*)::int FROM definer) AS public_security_definer_function_count,
 (SELECT count(*)::int FROM definer WHERE path = '') AS functions_missing_explicit_search_path,
 (SELECT count(*)::int FROM definer
  WHERE path ~* '(^|,)[[:space:]]*("?public"?|"?\$user"?)(,|$)') AS textual_paths_with_public_or_user,
 (SELECT coalesce(jsonb_object_agg(path, cnt), '{}'::jsonb)
  FROM (SELECT path, count(*)::int AS cnt FROM definer GROUP BY path) by_path
 ) AS search_path_distribution,
 has_schema_privilege('anon', 'public', 'CREATE') AS anon_can_create_in_public,
 has_schema_privilege('authenticated', 'public', 'CREATE') AS authenticated_can_create_in_public,
 has_schema_privilege('service_role', 'public', 'CREATE') AS service_role_can_create_in_public;
