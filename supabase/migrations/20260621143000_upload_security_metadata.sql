-- Enterprise upload security metadata
-- Apply after the controlled document storage migrations.

alter table if exists public.documents
  add column if not exists scan_status text,
  add column if not exists scan_provider text,
  add column if not exists scan_required boolean,
  add column if not exists scan_checked_at timestamptz,
  add column if not exists file_hash text,
  add column if not exists file_size bigint,
  add column if not exists mime_detected text;

create index if not exists documents_upload_scan_status_idx
  on public.documents (organization_id, scan_status, created_at desc);

comment on column public.documents.scan_status is 'Malware/content scan verdict recorded before controlled document storage.';
comment on column public.documents.scan_provider is 'Configured MALWARE_SCANNER_PROVIDER that produced the scan verdict.';
comment on column public.documents.scan_required is 'Whether REQUIRE_MALWARE_SCAN_FOR_UPLOADS was true when the upload was processed.';
comment on column public.documents.scan_checked_at is 'Server timestamp returned by the malware scan provider wrapper.';
comment on column public.documents.file_hash is 'SHA-256 hash of the exact bytes accepted for storage.';
comment on column public.documents.file_size is 'Size in bytes of the exact upload accepted for storage.';
comment on column public.documents.mime_detected is 'Server-detected MIME type from magic-number/file-signature validation.';
