-- Ensure existing environments block direct authenticated reads of controlled documents.
-- Controlled document access must go through the backend signed URL action, which enforces organization scope, documents:read and audit logging.

drop policy if exists "Members can read controlled documents" on storage.objects;
drop policy if exists "No direct controlled document reads" on storage.objects;

create policy "No direct controlled document reads" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'controlled-documents' and false
  );

update storage.buckets
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    -- Backend-generated template documents only. User uploads are still limited by application validation.
    'text/markdown'
  ]
where id = 'controlled-documents';
