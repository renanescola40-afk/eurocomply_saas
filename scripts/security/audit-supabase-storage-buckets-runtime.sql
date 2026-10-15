-- Read-only Supabase Storage catalog check. Metadata PASS != effective tenant isolation PASS.
-- Run against an explicitly identified target project and retain SHA + query output.
-- Never infer signed URL, service-role endpoint or cross-tenant access safety from this inventory.
with expected(id) as (
  values
    ('compliance-documents'),
    ('compliance-evidence'),
    ('controlled-documents'),
    ('enterprise-access-exports')
),
bucket_controls as (
  select
    e.id as bucket_id,
    b.id is not null as exists_bucket,
    (b.id is not null and b.public is false) as private_bucket,
    (b.id is not null and b.file_size_limit is not null
      and b.file_size_limit > 0 and b.file_size_limit <= 52428800) as bounded_file_size,
    (b.id is not null and cardinality(b.allowed_mime_types) > 0) as mime_allowlist
  from expected e
  left join storage.buckets b on b.id = e.id
),
rls_controls as (
  select coalesce(bool_or(c.relrowsecurity), false) as object_rls_on
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'storage'
    and c.relname = 'objects'
    and c.relkind = 'r'
),
anonymous_policy as (
  select count(*) as anon_or_public_policy_count
  from pg_policies p
  where p.schemaname = 'storage'
    and p.tablename = 'objects'
    and p.roles && array['anon', 'public']::name[]
)
select
  bc.*,
  rc.object_rls_on,
  ap.anon_or_public_policy_count,
  case
    when bc.exists_bucket
      and bc.private_bucket
      and bc.bounded_file_size
      and bc.mime_allowlist
      and rc.object_rls_on
      and ap.anon_or_public_policy_count = 0
      then 'PASS_METADATA_ONLY'
    else 'REVIEW'
  end as audit_result
from bucket_controls bc
cross join rls_controls rc
cross join anonymous_policy ap
order by bc.bucket_id;
