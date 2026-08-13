begin;

-- Forward-only reconciliation for the controlled document bucket. Historical
-- storage migrations are not used as production execution identities when their
-- lineage is ambiguous; this migration materializes the current backend-only
-- storage contract under a unique version.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'controlled-documents',
  'controlled-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/markdown'
  ]
)
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $document_path_guard$
begin
  if to_regclass('public.documents') is null then
    raise exception 'public.documents must exist before controlled storage reconciliation';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_storage_path_org_prefix_chk'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
      add constraint documents_storage_path_org_prefix_chk
      check (storage_path is null or storage_path like organization_id::text || '/%') not valid;
  end if;
end
$document_path_guard$;

-- Remove every known historical browser policy before recreating the canonical
-- explicit deny surface. Trusted reads/writes are performed with service-role
-- credentials only after application authorization, audit, and malware checks.
drop policy if exists "Members can read controlled documents" on storage.objects;
drop policy if exists "Members can upload controlled documents" on storage.objects;
drop policy if exists "Members can update controlled documents" on storage.objects;
drop policy if exists "Members can delete controlled documents" on storage.objects;
drop policy if exists "No direct controlled document reads" on storage.objects;
drop policy if exists "No direct controlled document uploads" on storage.objects;
drop policy if exists "No direct controlled document updates" on storage.objects;
drop policy if exists "No direct controlled document deletes" on storage.objects;

create policy "No direct controlled document reads"
  on storage.objects for select to authenticated
  using (bucket_id = 'controlled-documents' and false);

create policy "No direct controlled document uploads"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'controlled-documents' and false);

create policy "No direct controlled document updates"
  on storage.objects for update to authenticated
  using (bucket_id = 'controlled-documents' and false)
  with check (bucket_id = 'controlled-documents' and false);

create policy "No direct controlled document deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'controlled-documents' and false);

do $verify$
declare
  bucket_record record;
  policy_count integer;
begin
  select id, public, file_size_limit, allowed_mime_types
    into bucket_record
  from storage.buckets
  where id = 'controlled-documents';

  if bucket_record.id is null
     or bucket_record.public
     or bucket_record.file_size_limit <> 10485760 then
    raise exception 'controlled document bucket boundary is not canonical';
  end if;

  select count(*)
    into policy_count
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname in (
      'No direct controlled document reads',
      'No direct controlled document uploads',
      'No direct controlled document updates',
      'No direct controlled document deletes'
    )
    and roles = array['authenticated']::name[];

  if policy_count <> 4 then
    raise exception 'controlled document browser-deny policy set is incomplete';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_storage_path_org_prefix_chk'
      and conrelid = 'public.documents'::regclass
  ) then
    raise exception 'controlled document organization-prefix constraint is missing';
  end if;
end
$verify$;

commit;
