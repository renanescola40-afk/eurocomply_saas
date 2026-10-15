-- READ ONLY. Per-command authenticated permissions and commercial RLS policy composition.
-- Catalog policy expressions are text, NOT proof of effective tenant isolation.
-- An apparent named membership helper in a predicate does not guarantee every OR branch is safe.
-- Preserve static-only labels and follow with real two-tenant negative tests.
with commercial_tables as (
  select distinct c.oid, c.relname as tablename
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
  where c.relkind = 'r'
    and (coalesce(p.qual, '') || ' ' || coalesce(p.with_check, ''))
      ~* 'has_commercial_authority|has_minimum_commercial_plan'
),
commands as (
  select unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) as operation
),
applicable as (
  select c.oid, c.tablename, a.operation, p.policyname, p.permissive,
    coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '') as predicate_text
  from commercial_tables c
  cross join commands a
  left join pg_policies p on p.schemaname = 'public'
    and p.tablename = c.tablename
    and p.cmd in ('ALL', a.operation)
    and p.roles && array['authenticated', 'public']::name[]
),
per_command as (
  select oid, tablename, operation,
    count(policyname) filter(where permissive = 'PERMISSIVE') as permissive_count,
    count(policyname) filter(
      where permissive = 'PERMISSIVE'
        and predicate_text ~* 'is_org_member|has_org_role|enterprise_member_can_read|enterprise_member_can_manage'
    ) as membership_permissive_count,
    count(policyname) filter(
      where permissive = 'RESTRICTIVE'
        and predicate_text ~* 'is_org_member|has_org_role|enterprise_member_can_read|enterprise_member_can_manage'
    ) as membership_restrictive_count,
    count(policyname) filter(
      where permissive = 'PERMISSIVE'
        and predicate_text ilike '%organization_id IS NULL%'
        and predicate_text ilike '%workspace_id IS NULL%'
        and predicate_text ilike '%auth.uid()%'
    ) as personal_permissive_count,
    count(policyname) filter(
      where permissive = 'RESTRICTIVE'
        and predicate_text ilike '%organization_id IS NULL%'
        and predicate_text ilike '%workspace_id IS NULL%'
        and predicate_text ilike '%auth.uid()%'
    ) as personal_restrictive_count
  from applicable
  group by oid, tablename, operation
),
triaged as (
  select tablename, operation,
    has_table_privilege('authenticated', oid, operation) as direct_auth_grant,
    permissive_count, membership_permissive_count, membership_restrictive_count,
    personal_permissive_count, personal_restrictive_count,
    case
      when not has_table_privilege('authenticated', oid, operation)
        then 'NO_DIRECT_AUTH_GRANT'
      when permissive_count = 0
        then 'NO_APPLICABLE_PERMISSIVE_POLICY'
      when membership_permissive_count = permissive_count
        then 'NAMED_MEMBERSHIP_PERMISSIVE_STATIC'
      when membership_restrictive_count > 0
        then 'NAMED_MEMBERSHIP_RESTRICTIVE_STATIC'
      when personal_permissive_count > 0 and personal_restrictive_count > 0
        then 'PERSONAL_ONLY_RESTRICTION_STATIC'
      else 'REVIEW_POLICY_COMPOSITION'
    end as static_triage
  from per_command
)
select * from triaged order by operation, tablename;
