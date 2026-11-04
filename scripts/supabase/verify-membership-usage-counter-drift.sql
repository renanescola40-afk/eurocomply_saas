-- P0-F / DAT-02: tenant aggregate counter drift, read-only, no tenant identities emitted.
-- FULL OUTER JOIN detects missing usage rows for organizations with members.
-- Run before and after governed migration/cutover; do not publish tenant-level rows.
with actual as (
  select organization_id,
    count(*) filter (where status = 'active')::integer as active_members,
    count(*) filter (where status = 'active' and seat_type = 'full')::integer as full_users,
    count(*) filter (where status = 'active' and seat_type = 'participant')::integer as participants,
    count(*) filter (where status = 'active' and seat_type = 'viewer')::integer as viewers,
    count(*) filter (where status = 'active' and lower(coalesce(role, '')) in ('owner','admin'))::integer as active_admins
  from public.organization_members
  group by organization_id
), drift as (
  select
    usage.organization_id is null as missing_usage_row,
    (usage.organization_id is null
      or usage.active_members is distinct from coalesce(a.active_members,0)) as members_mismatch,
    (usage.organization_id is null
      or usage.full_users is distinct from coalesce(a.full_users,0)
      or usage.participants is distinct from coalesce(a.participants,0)
      or usage.viewers is distinct from coalesce(a.viewers,0)) as seats_mismatch,
    (usage.organization_id is null
      or usage.active_admins is distinct from coalesce(a.active_admins,0)) as admin_mismatch
  from public.organization_usage as usage
  full outer join actual as a on a.organization_id = usage.organization_id
)
select count(*)::integer as organizations_checked,
  count(*) filter (where missing_usage_row)::integer as missing_usage_rows,
  count(*) filter (where members_mismatch)::integer as members_counter_drift,
  count(*) filter (where seats_mismatch)::integer as seat_counter_drift,
  count(*) filter (where admin_mismatch)::integer as admin_counter_drift
from drift;
