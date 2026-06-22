-- Persist enterprise upload malware-scan evidence on document metadata.
-- These columns mirror audit-event metadata so runtime checks can prove uploads were scanned before storage.

alter table if exists public.documents
  add column if not exists scan_status text,
  add column if not exists scan_provider text,
  add column if not exists scan_required boolean not null default false,
  add column if not exists scan_checked_at timestamptz,
  add column if not exists file_hash text,
  add column if not exists file_size bigint,
  add column if not exists mime_detected text,
  add column if not exists upload_security_metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_scan_status_chk'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
      add constraint documents_scan_status_chk
      check (
        scan_status is null
        or scan_status in ('clean', 'infected', 'suspicious', 'not_configured', 'unavailable', 'error', 'not_run')
      ) not valid;
  end if;
end $$;

create index if not exists documents_scan_status_idx on public.documents (organization_id, scan_status);
create index if not exists documents_file_hash_idx on public.documents (organization_id, file_hash) where file_hash is not null;

comment on column public.documents.scan_status is 'Malware scan verdict for the uploaded document bytes.';
comment on column public.documents.scan_provider is 'Configured malware scanner provider that produced the verdict.';
comment on column public.documents.scan_required is 'Whether REQUIRE_MALWARE_SCAN_FOR_UPLOADS was true for the upload.';
comment on column public.documents.scan_checked_at is 'Server timestamp for malware scan verdict.';
comment on column public.documents.file_hash is 'SHA-256 hash of the exact uploaded bytes.';
comment on column public.documents.file_size is 'Uploaded file size in bytes.';
comment on column public.documents.mime_detected is 'Server-detected MIME type from magic number/file signature validation.';
comment on column public.documents.upload_security_metadata is 'Redacted upload security metadata; must never contain file contents.';
