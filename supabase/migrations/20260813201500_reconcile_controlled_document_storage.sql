begin;

-- Forward-only reconciliation for the controlled document runtime contract.
-- Historical storage/upload migrations are not used as production execution
-- identities when their lineage is ambiguous. Existing document rows are not
-- rewritten; prospective constraints remain fail-closed for new writes.

do $document_guard$
begin
  if to_regclass('public.documents') is null then
    raise exception 'public.documents must exist before controlled storage reconciliation';
  end if;
end
$document_guard$;

-- Materialize every column written by src/app/api/documents/upload/route.ts.
-- Nullable columns preserve legacy rows. Security booleans/metadata use safe
-- defaults so future backend writes have deterministic values.
alter table public.documents
  add column if not exists uploaded_by uuid,
  add column if not exists storage_path text,
  add column if not exists checksum_sha256 text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists scan_status text,
  add column if not exists scan_provider text,
  add column if not exists scan_required boolean not null default false,
  add column if not exists scan_checked_at timestamptz,
  add column if not exists file_hash text,
  add column if not exists file_size bigint,
  add column if not exists mime_detected text,
  add column if not exists upload_security_metadata jsonb not null default '{}'::jsonb;

alter table public.documents enable row level security;
alter table public.documents force row level security;

-- Recreate prospective constraints under the canonical definitions. NOT VALID
-- avoids claiming that legacy rows were already normalized while still enforcing
-- the constraints for every future INSERT/UPDATE.
alter table public.documents
  drop constraint if exists documents_storage_path_org_prefix_chk,
  drop constraint if exists documents_scan_status_chk;

alter table public.documents
  add constraint documents_storage_path_org_prefix_chk
    check (
      storage_path is null
      or (
        organization_id is not null
        and storage_path like organization_id::text || '/%'
      )
    ) not valid,
  add constraint documents_scan_status_chk
    check (
      scan_status is null
      or scan_status in (
        'clean',
        'infected',
        'suspicious',
        'not_configured',
        'unavailable',
        'error',
        'not_run'
      )
    ) not valid;

create index if not exists documents_upload_scan_status_idx
  on public.documents (organization_id, scan_status, created_at desc);
create index if not exists documents_file_hash_idx
  on public.documents (organization_id, file_hash)
  where file_hash is not null;

-- Prospective tenant-consistent uploader attribution. Null remains permitted for
-- legacy rows and non-UUID external identities; any recorded UUID must be a
-- member of the document organization.
create or replace function public.enforce_document_uploader_member_scope()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.uploaded_by is null then
    return new;
  end if;

  if new.organization_id is null or not exists (
    select 1
    from public.organization_members as membership
    where membership.organization_id = new.organization_id
      and membership.user_id = new.uploaded_by
  ) then
    raise exception using
      errcode = '23514',
      message = 'Document uploader must belong to the document organization';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_document_uploader_member_scope() from public;
revoke all on function public.enforce_document_uploader_member_scope() from anon;
revoke all on function public.enforce_document_uploader_member_scope() from authenticated;
grant execute on function public.enforce_document_uploader_member_scope() to service_role;

drop trigger if exists enforce_document_uploader_member_scope on public.documents;
create trigger enforce_document_uploader_member_scope
before insert or update of organization_id, uploaded_by
on public.documents
for each row
execute function public.enforce_document_uploader_member_scope();

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

-- Direct browser access would bypass application RBAC, audit logging, malware
-- scanning and short-lived URL issuance. The trusted service-role backend is the
-- only controlled-document object path.
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
  runtime_column_count integer;
  uploader_function_oid oid := to_regprocedure('public.enforce_document_uploader_member_scope()');
begin
  select count(*)
    into runtime_column_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'documents'
    and column_name in (
      'uploaded_by',
      'storage_path',
      'checksum_sha256',
      'mime_type',
      'size_bytes',
      'scan_status',
      'scan_provider',
      'scan_required',
      'scan_checked_at',
      'file_hash',
      'file_size',
      'mime_detected',
      'upload_security_metadata'
    );

  if runtime_column_count <> 13 then
    raise exception 'controlled document runtime columns are incomplete';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'documents'
      and c.relrowsecurity
      and c.relforcerowsecurity
  ) then
    raise exception 'documents must have RLS and FORCE RLS enabled';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_storage_path_org_prefix_chk'
      and conrelid = 'public.documents'::regclass
  ) or not exists (
    select 1
    from pg_constraint
    where conname = 'documents_scan_status_chk'
      and conrelid = 'public.documents'::regclass
  ) then
    raise exception 'controlled document prospective constraints are incomplete';
  end if;

  if uploader_function_oid is null then
    raise exception 'document uploader membership function is missing';
  end if;

  if has_function_privilege('anon', uploader_function_oid, 'EXECUTE')
     or has_function_privilege('authenticated', uploader_function_oid, 'EXECUTE') then
    raise exception 'browser roles unexpectedly retain uploader function execution';
  end if;

  if not has_function_privilege('service_role', uploader_function_oid, 'EXECUTE') then
    raise exception 'service_role lacks uploader function execution';
  end if;

  if not exists (
    select 1
    from pg_proc p
    cross join lateral unnest(coalesce(p.proconfig, array[]::text[])) setting
    where p.oid = uploader_function_oid
      and p.prosecdef
      and setting = 'search_path=pg_catalog'
  ) then
    raise exception 'document uploader function security configuration is not fixed';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.documents'::regclass
      and tgname = 'enforce_document_uploader_member_scope'
      and not tgisinternal
  ) then
    raise exception 'document uploader membership trigger is missing';
  end if;

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
end
$verify$;

notify pgrst, 'reload schema';
commit;
