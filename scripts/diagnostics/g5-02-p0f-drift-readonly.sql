-- G5-02 / P0-F diagnostic, READ ONLY.
-- Never uses production identifiers or exports customer rows.
-- Counts are diagnostic and do not supersede the canonical P0-F definition.
WITH memberships AS (
  SELECT organization_id,
         count(*) FILTER (WHERE status = 'active')::integer AS actual_active_members,
         count(*) FILTER (WHERE status = 'active' AND role IN ('owner','admin'))::integer AS actual_active_admins
  FROM public.organization_members
  GROUP BY organization_id
), differences AS (
  SELECT o.id AS organization_id,
         (u.organization_id IS NULL) AS missing_usage,
         (u.organization_id IS NOT NULL AND
          u.active_members IS DISTINCT FROM coalesce(m.actual_active_members, 0)) AS members_mismatch,
         (u.organization_id IS NOT NULL AND
          u.active_admins IS DISTINCT FROM coalesce(m.actual_active_admins, 0)) AS admins_mismatch
  FROM public.organizations o
  LEFT JOIN public.organization_usage u ON u.organization_id = o.id
  LEFT JOIN memberships m ON m.organization_id = o.id
)
SELECT count(*)::integer AS total_organizations,
       count(*) FILTER (WHERE missing_usage)::integer AS missing_usage_rows,
       count(*) FILTER (WHERE members_mismatch)::integer AS member_counter_mismatches,
       count(*) FILTER (WHERE admins_mismatch)::integer AS admin_counter_mismatches,
       count(*) FILTER (WHERE missing_usage OR members_mismatch OR admins_mismatch)::integer AS diagnostic_drift_orgs
FROM differences;
