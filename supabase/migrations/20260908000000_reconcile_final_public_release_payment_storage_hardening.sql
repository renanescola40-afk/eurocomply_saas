begin;

-- V32 forward reconciliation for final public-release payment/storage hardening.
-- Production read-only reconciliation on 2026-09-06 proved that the live ledger
-- head is 20260905075429 while the older V31 package was never materialized.
-- This successor is deliberately above the current live head and does not
-- repair, rewrite, or backfill migration history.

do $preconditions$
begin
  if to_regprocedure('app_private.has_commercial_authority(uuid)') is null then
    raise exception 'required payment-first helper app_private.has_commercial_authority(uuid) is missing';
  end if;
  if to_regprocedure('app_private.is_org_member(uuid)') is null then
    raise exception 'required tenant helper app_private.is_org_member(uuid) is missing';
  end if;
  if to_regprocedure('app_private.has_org_role(uuid,text[])') is null then
    raise exception 'required role helper app_private.has_org_role(uuid,text[]) is missing';
  end if;
  if to_regprocedure('app_private.evidence_storage_organization_id(text)') is null then
    raise exception 'required safe storage path parser is missing';
  end if;
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise exception 'Supabase Storage schema is required';
  end if;
  if to_regclass('public.evidence_items') is null then
    raise exception 'required public.evidence_items table is missing';
  end if;
  if to_regclass('public.gap_assessments') is null
     or to_regclass('public.gap_answers') is null
     or to_regclass('public.compliance_findings') is null then
    raise exception 'required Gap Analysis tenant-boundary tables are missing';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'evidence_items' and column_name = 'file_size_bytes'
  ) then
    raise exception 'public.evidence_items.file_size_bytes is missing';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'evidence_items' and column_name = 'file_mime_type'
  ) then
    raise exception 'public.evidence_items.file_mime_type is missing';
  end if;
end
$preconditions$;

-- Reconcile organization-scoped governance/history tables with the same
-- RESTRICTIVE payment-first authority used by the canonical commercial plane.
do $auxiliary_payment_first$
declare
  target_table text;
  target_tables constant text[] := array[
    'ai_fria_assessments',
    'ai_fria_decisions',
    'ai_fria_evidence',
    'ai_literacy_programs',
    'ai_literacy_courses',
    'ai_literacy_assignments',
    'ai_literacy_evidence',
    'ai_system_history',
    'vendor_review_history',
    'evidence_item_audit_events',
    'email_notification_events'
  ];
begin
  foreach target_table in array target_tables loop
    if to_regclass(format('public.%I', target_table)) is null then
      raise exception 'required commercial table public.% is missing', target_table;
    end if;

    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = target_table
        and column_name = 'organization_id'
    ) then
      raise exception 'commercial table public.% has no organization_id authority column', target_table;
    end if;

    execute format('alter table public.%I enable row level security', target_table);
    execute format('alter table public.%I force row level security', target_table);
    execute format('drop policy if exists payment_first_commercial_authority on public.%I', target_table);
    execute format(
      'create policy payment_first_commercial_authority on public.%I as restrictive for all to authenticated using (app_private.has_commercial_authority(organization_id)) with check (app_private.has_commercial_authority(organization_id))',
      target_table
    );
  end loop;
end
$auxiliary_payment_first$;

-- Gap Analysis is currently served only through the authenticated server API,
-- but the underlying tables still expose authenticated DML. Payment-first alone
-- proves that a target organization is licensed; it does not prove that the
-- caller belongs to that organization. Bind the direct data plane to active
-- membership as an independent RESTRICTIVE condition so a known paid tenant UUID
-- cannot be used for cross-tenant record injection/BOLA.
do $gap_tenant_preflight$
begin
  if exists (
    select 1
    from public.gap_assessments assessment
    where assessment.organization_id is not null
      and not exists (
        select 1
        from public.organization_members member
        where member.organization_id = assessment.organization_id
          and member.user_id = assessment.user_id
          and lower(coalesce(member.status, '')) = 'active'
      )
  ) then
    raise exception 'Existing gap assessment actor is outside active organization membership';
  end if;

  if exists (
    select 1
    from public.compliance_findings finding
    where finding.organization_id is not null
      and not exists (
        select 1
        from public.organization_members member
        where member.organization_id = finding.organization_id
          and member.user_id = finding.user_id
          and lower(coalesce(member.status, '')) = 'active'
      )
  ) then
    raise exception 'Existing compliance finding actor is outside active organization membership';
  end if;

  if exists (
    select 1
    from public.compliance_findings finding
    join public.gap_assessments assessment on assessment.id = finding.assessment_id
    where finding.assessment_id is not null
      and finding.organization_id is distinct from assessment.organization_id
  ) then
    raise exception 'Existing compliance finding references a cross-organization assessment';
  end if;
end
$gap_tenant_preflight$;

alter table public.gap_assessments enable row level security;
alter table public.gap_assessments force row level security;
drop policy if exists restrict_gap_assessments_active_membership on public.gap_assessments;
create policy restrict_gap_assessments_active_membership
  on public.gap_assessments
  as restrictive
  for all
  to authenticated
  using (
    organization_id is not null
    and app_private.is_org_member(organization_id)
  )
  with check (
    organization_id is not null
    and app_private.is_org_member(organization_id)
  );

alter table public.gap_answers enable row level security;
alter table public.gap_answers force row level security;
drop policy if exists restrict_gap_answers_active_membership on public.gap_answers;
create policy restrict_gap_answers_active_membership
  on public.gap_answers
  as restrictive
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.gap_assessments assessment
      where assessment.id = gap_answers.assessment_id
        and assessment.organization_id is not null
        and app_private.is_org_member(assessment.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from public.gap_assessments assessment
      where assessment.id = gap_answers.assessment_id
        and assessment.organization_id is not null
        and app_private.is_org_member(assessment.organization_id)
    )
  );

alter table public.compliance_findings enable row level security;
alter table public.compliance_findings force row level security;
drop policy if exists restrict_compliance_findings_active_membership on public.compliance_findings;
create policy restrict_compliance_findings_active_membership
  on public.compliance_findings
  as restrictive
  for all
  to authenticated
  using (
    organization_id is not null
    and app_private.is_org_member(organization_id)
    and (
      assessment_id is null
      or exists (
        select 1
        from public.gap_assessments assessment
        where assessment.id = compliance_findings.assessment_id
          and assessment.organization_id = compliance_findings.organization_id
      )
    )
  )
  with check (
    organization_id is not null
    and app_private.is_org_member(organization_id)
    and (
      assessment_id is null
      or exists (
        select 1
        from public.gap_assessments assessment
        where assessment.id = compliance_findings.assessment_id
          and assessment.organization_id = compliance_findings.organization_id
      )
    )
  );

-- The legacy compliance-documents bucket is exercised by protected technical
-- proofs. Membership alone is insufficient: access must also be commercially
-- authorized, and writes remain role-bound. The canonical parser is
-- non-throwing for attacker-controlled object names.
drop policy if exists "Members can read organization document objects" on storage.objects;
create policy "Members can read organization document objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'compliance-documents'
    and app_private.evidence_storage_organization_id(name) is not null
    and app_private.is_org_member(app_private.evidence_storage_organization_id(name))
    and app_private.has_commercial_authority(app_private.evidence_storage_organization_id(name))
  );

drop policy if exists "Members can upload organization document objects" on storage.objects;
create policy "Members can upload organization document objects"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'compliance-documents'
    and app_private.evidence_storage_organization_id(name) is not null
    and app_private.has_org_role(
      app_private.evidence_storage_organization_id(name),
      array['owner','admin','editor','member']::text[]
    )
    and app_private.has_commercial_authority(app_private.evidence_storage_organization_id(name))
  );

-- Bound Evidence Vault resource use at the Storage control plane. Active/web
-- executable formats and archives remain denied unless separately reviewed.
update storage.buckets
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]::text[]
where id = 'compliance-evidence';

do $bucket_exists$
begin
  if not exists (select 1 from storage.buckets where id = 'compliance-evidence') then
    raise exception 'required compliance-evidence Storage bucket is missing';
  end if;
end
$bucket_exists$;

-- Mirror Storage bounds in metadata so direct API/database writes cannot claim
-- an object that the Evidence Vault itself would reject.
alter table public.evidence_items
  drop constraint if exists evidence_items_file_size_bytes_check;
alter table public.evidence_items
  add constraint evidence_items_file_size_bytes_check
  check (
    file_size_bytes is null
    or (file_size_bytes >= 0 and file_size_bytes <= 10485760)
  ) not valid;
alter table public.evidence_items validate constraint evidence_items_file_size_bytes_check;

alter table public.evidence_items
  drop constraint if exists evidence_items_file_mime_type_check;
alter table public.evidence_items
  add constraint evidence_items_file_mime_type_check
  check (
    file_mime_type is null
    or file_mime_type in (
      'application/pdf',
      'image/png',
      'image/jpeg',
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/json',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  ) not valid;
alter table public.evidence_items validate constraint evidence_items_file_mime_type_check;

-- Fail closed if any intended commercial/storage/tenant control did not materialize.
do $postconditions$
declare
  target_table text;
  target_tables constant text[] := array[
    'ai_fria_assessments',
    'ai_fria_decisions',
    'ai_fria_evidence',
    'ai_literacy_programs',
    'ai_literacy_courses',
    'ai_literacy_assignments',
    'ai_literacy_evidence',
    'ai_system_history',
    'vendor_review_history',
    'evidence_item_audit_events',
    'email_notification_events'
  ];
  expected_bucket_mimes constant text[] := array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]::text[];
  bucket_public boolean;
  bucket_limit bigint;
  bucket_mimes text[];
  unsafe_storage_mutation_policies bigint;
begin
  foreach target_table in array target_tables loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = target_table
        and c.relrowsecurity
        and c.relforcerowsecurity
    ) then
      raise exception 'RLS/FORCE RLS missing on public.%', target_table;
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
        and policyname = 'payment_first_commercial_authority'
        and permissive = 'RESTRICTIVE'
        and roles @> array['authenticated']::name[]
        and coalesce(qual, '') like '%has_commercial_authority%'
        and coalesce(with_check, '') like '%has_commercial_authority%'
    ) then
      raise exception 'payment-first restrictive policy missing or malformed on public.%', target_table;
    end if;
  end loop;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='gap_assessments'
      and policyname='restrict_gap_assessments_active_membership'
      and permissive='RESTRICTIVE'
      and roles @> array['authenticated']::name[]
      and coalesce(qual,'') like '%is_org_member%'
      and coalesce(with_check,'') like '%is_org_member%'
  ) then
    raise exception 'Gap assessment active-membership boundary is missing';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='gap_answers'
      and policyname='restrict_gap_answers_active_membership'
      and permissive='RESTRICTIVE'
      and roles @> array['authenticated']::name[]
      and coalesce(qual,'') like '%is_org_member%'
      and coalesce(with_check,'') like '%is_org_member%'
  ) then
    raise exception 'Gap answer active-membership boundary is missing';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='compliance_findings'
      and policyname='restrict_compliance_findings_active_membership'
      and permissive='RESTRICTIVE'
      and roles @> array['authenticated']::name[]
      and coalesce(qual,'') like '%is_org_member%'
      and coalesce(qual,'') like '%organization_id%'
      and coalesce(with_check,'') like '%is_org_member%'
      and coalesce(with_check,'') like '%organization_id%'
  ) then
    raise exception 'Compliance finding active-membership/assessment tenant boundary is missing';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Members can read organization document objects'
      and cmd = 'SELECT'
      and coalesce(qual, '') like '%evidence_storage_organization_id%'
      and coalesce(qual, '') like '%is_org_member%'
      and coalesce(qual, '') like '%has_commercial_authority%'
  ) then
    raise exception 'compliance-documents read policy is not parser/member/payment-first bound';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Members can upload organization document objects'
      and cmd = 'INSERT'
      and coalesce(with_check, '') like '%evidence_storage_organization_id%'
      and coalesce(with_check, '') like '%has_commercial_authority%'
      and coalesce(with_check, '') like '%has_org_role%'
  ) then
    raise exception 'compliance-documents upload policy is not parser/payment-first/RBAC-bound';
  end if;

  select count(*) into unsafe_storage_mutation_policies
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and cmd in ('UPDATE','DELETE')
    and (
      coalesce(qual, '') like '%compliance-documents%'
      or coalesce(with_check, '') like '%compliance-documents%'
    );

  if unsafe_storage_mutation_policies > 0 then
    raise exception 'unexpected direct UPDATE/DELETE policy survived for compliance-documents';
  end if;

  select public, file_size_limit, allowed_mime_types
    into bucket_public, bucket_limit, bucket_mimes
  from storage.buckets
  where id = 'compliance-evidence';

  if bucket_public is distinct from false then
    raise exception 'compliance-evidence bucket unexpectedly public';
  end if;
  if bucket_limit is distinct from 10485760 then
    raise exception 'compliance-evidence file_size_limit is not 10 MiB';
  end if;
  if bucket_mimes is null
     or cardinality(bucket_mimes) <> cardinality(expected_bucket_mimes)
     or not (bucket_mimes @> expected_bucket_mimes)
     or not (expected_bucket_mimes @> bucket_mimes) then
    raise exception 'compliance-evidence MIME allowlist is missing or unexpected';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    join pg_namespace n on n.oid = r.relnamespace
    where n.nspname = 'public'
      and r.relname = 'evidence_items'
      and c.conname = 'evidence_items_file_size_bytes_check'
      and c.convalidated
  ) then
    raise exception 'validated evidence_items file-size constraint is missing';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    join pg_namespace n on n.oid = r.relnamespace
    where n.nspname = 'public'
      and r.relname = 'evidence_items'
      and c.conname = 'evidence_items_file_mime_type_check'
      and c.convalidated
  ) then
    raise exception 'validated evidence_items MIME constraint is missing';
  end if;
end
$postconditions$;

notify pgrst, 'reload schema';
commit;
