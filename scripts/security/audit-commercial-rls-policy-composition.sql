-- Read-only SQL audit. Run using authorized database read access.
-- Reports candidate gaps; does NOT replace synthetic tenant isolation tests.
WITH commercial_tables AS (
 SELECT DISTINCT tablename
 FROM pg_policies
 WHERE schemaname = 'public'
   AND (coalesce(qual,'') || ' ' || coalesce(with_check,'')) ~*
       'has_commercial_authority|has_minimum_commercial_plan'
), policy_features AS (
 SELECT c.tablename,
        count(*) FILTER (WHERE p.permissive = 'PERMISSIVE') AS permissive_count,
        count(*) FILTER (
          WHERE p.permissive = 'PERMISSIVE'
            AND (coalesce(p.qual,'') || ' ' || coalesce(p.with_check,'')) ~*
                'is_org_member|has_org_role|enterprise_member_can_read|enterprise_member_can_manage'
        ) AS permissive_membership_count,
        count(*) FILTER (
          WHERE p.permissive = 'RESTRICTIVE'
            AND (coalesce(p.qual,'') || ' ' || coalesce(p.with_check,'')) ~*
                'is_org_member|has_org_role|enterprise_member_can_read|enterprise_member_can_manage'
        ) AS restrictive_membership_count
 FROM commercial_tables c
 JOIN pg_policies p ON p.schemaname='public' AND p.tablename=c.tablename
 GROUP BY c.tablename
)
SELECT tablename, permissive_count, permissive_membership_count,
       restrictive_membership_count,
       CASE WHEN permissive_count = 0 THEN 'REVIEW_NO_PERMISSIVE'
            WHEN permissive_membership_count = 0 AND restrictive_membership_count = 0
              THEN 'REVIEW_NO_NAMED_MEMBERSHIP_GATE'
            ELSE 'NAMED_MEMBERSHIP_GATE_PRESENT_REQUIRES_BEHAVIOR_TEST'
       END AS triage
FROM policy_features
ORDER BY triage, tablename;
