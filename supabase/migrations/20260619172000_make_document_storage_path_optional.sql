-- Keep the live tenant-isolation validator compatible with both older and newer
-- document schemas. Some deployed databases do not expose storage_path, while
-- older local migrations required it. The validator does not rely on this field
-- for tenant-isolation checks, so it must be optional.

alter table if exists public.documents
  add column if not exists storage_path text;

alter table if exists public.documents
  alter column storage_path drop not null;
