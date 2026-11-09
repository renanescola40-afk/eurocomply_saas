-- RISCK COMPLY SEC-02: metadata-only QA readback, safe for production read-only.
-- Not equivalent to authenticated Data API negative tests or formal acceptance.
-- Expect two rows with structural_guard=READY only after governed policy rollout.
WITH targets(table_name, policy_name) AS (
  VALUES
    ('audit_logs'::text, 'sec02_audit_logs_role_select'::text),
    ('audit_events'::text, 'sec02_audit_events_role_select'::text)
),
proof AS (
  SELECT
    t.table_name,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS force_rls,
    has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_select,
    has_table_privilege('anon', c.oid, 'SELECT') AS anon_select,
    EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = t.table_name
        AND p.policyname = t.policy_name
        AND p.permissive = 'RESTRICTIVE'
        AND p.cmd = 'SELECT'
        AND 'authenticated' = ANY(p.roles)
        AND p.qual ILIKE '%app_private.has_org_role%'
        AND p.qual ILIKE '%owner%'
        AND p.qual ILIKE '%admin%'
    ) AS owner_admin_restrictive_policy
  FROM targets t
  LEFT JOIN pg_class c
    ON c.oid = to_regclass(format('%I.%I','public',t.table_name))
)
SELECT table_name,rls_enabled,force_rls,authenticated_select,anon_select,
       owner_admin_restrictive_policy,
       CASE
         WHEN rls_enabled AND force_rls AND owner_admin_restrictive_policy
           THEN 'STRUCTURAL_GUARD_PRESENT__RUNTIME_NOT_PROVEN'
         ELSE 'NEEDS_HARDENING'
       END AS sec02_readback
FROM proof ORDER BY table_name;
