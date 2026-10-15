-- Read-only production catalog drift check for the feature-flagged Legal Assurance subsystem.
-- A NO_GO_SCHEMA_MISSING result is an evidence finding, NOT authorization to run schema changes.
-- PASS_SCHEMA_METADATA_ONLY would not prove matter access, signed URLs or a completed legal review.
with required_relations(relation_name) as (
  values
    ('legal_review_artifacts'),
    ('legal_review_decisions'),
    ('legal_review_requests'),
    ('counsel_profiles')
),
relations as (
  select
    count(*) as required_count,
    count(*) filter(where to_regclass('public.' || relation_name) is not null) as existing_count,
    coalesce(array_agg(relation_name order by relation_name)
      filter(where to_regclass('public.' || relation_name) is null), array[]::text[]) as missing_relations
  from required_relations
),
artifact_bucket as (
  select
    exists (
      select 1 from storage.buckets
      where id='legal-assurance-artifacts'
        and public is false
        and file_size_limit=5242880
        and allowed_mime_types=array['application/pdf']::text[]
    ) as canonical_private_bucket
),
decision_guard as (
  select
    to_regprocedure('app_private.enforce_legal_decision_artifact_reference()') is not null as guard_function_present,
    exists (
      select 1 from pg_trigger
      where tgrelid=to_regclass('public.legal_review_decisions')
        and tgname='legal_review_decision_artifact_reference_guard'
        and not tgisinternal
    ) as guard_trigger_present
),
browser_policies as (
  select count(*) as direct_deny_policy_count
  from pg_policies
  where schemaname='storage' and tablename='objects'
    and roles=array['authenticated']::name[]
    and policyname in (
      'No direct legal assurance artifact reads',
      'No direct legal assurance artifact uploads',
      'No direct legal assurance artifact updates',
      'No direct legal assurance artifact deletes'
    )
)
select
  r.required_count,
  r.existing_count,
  r.missing_relations,
  b.canonical_private_bucket,
  g.guard_function_present,
  g.guard_trigger_present,
  p.direct_deny_policy_count,
  case when r.required_count=r.existing_count
      and b.canonical_private_bucket
      and g.guard_function_present
      and g.guard_trigger_present
      and p.direct_deny_policy_count=4
    then 'PASS_SCHEMA_METADATA_ONLY'
    else 'NO_GO_SCHEMA_MISSING'
  end as legal_assurance_schema_gate
from relations r
cross join artifact_bucket b
cross join decision_guard g
cross join browser_policies p;
