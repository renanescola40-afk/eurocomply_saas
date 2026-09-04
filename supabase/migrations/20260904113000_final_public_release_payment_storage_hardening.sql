begin;

-- Final public-release payment/storage hardening.
-- This migration is intentionally forward-only and follows the current live
-- Production ledger head (20260904065952). It does not repair or rewrite
-- migration history.

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
end
$preconditions$;

-- Tables introduced/reconciled after the original payment-first data-plane
-- migration must be subject to the same RESTRICTIVE commercial authority.
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

-- The legacy compliance-documents bucket is still exercised by the protected
-- technical proof. Membership by itself is therefore no longer sufficient.
-- Use the non-throwing canonical path parser instead of casting attacker input.
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

-- Bound Evidence Vault resource use at the Storage control plane. Formats are
-- deliberately limited to common documentary evidence; executable/web-active
-- formats and archives remain denied unless separately reviewed later.
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

if not found then
  raise exception 'required compliance-evidence Storage bucket is missing';
end if;

-- Mirror the Storage bound at the metadata contract so direct database/API
-- writes cannot reserve an attachment larger than the bucket will accept.
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

-- Fail closed if any of the intended commercial controls did not materialize.
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
  bucket_limit bigint;
  bucket_mimes text[];
  unsafe_storage_mutation_policies bigint;
begin
  foreach target_table in array target_tables loop
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
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Members can read organization document objects'
      and cmd = 'SELECT'
      and coalesce(qual, '') like '%has_commercial_authority%'
  ) then
    raise exception 'compliance-documents read policy is not payment-first';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Members can upload organization document objects'
      and cmd = 'INSERT'
      and coalesce(with_check, '') like '%has_commercial_authority%'
      and coalesce(with_check, '') like '%has_org_role%'
  ) then
    raise exception 'compliance-documents upload policy is not payment-first/RBAC-bound';
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

  select file_size_limit, allowed_mime_types
    into bucket_limit, bucket_mimes
  from storage.buckets
  where id = 'compliance-evidence';

  if bucket_limit is distinct from 10485760 then
    raise exception 'compliance-evidence file_size_limit is not 10 MiB';
  end if;
  if bucket_mimes is null or cardinality(bucket_mimes) <> 9 then
    raise exception 'compliance-evidence MIME allowlist is missing or unexpected';
  end if;
end
$postconditions$;

notify pgrst, 'reload schema';
commit;
