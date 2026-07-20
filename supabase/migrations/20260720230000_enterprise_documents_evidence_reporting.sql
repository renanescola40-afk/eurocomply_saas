begin;

create table if not exists public.enterprise_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_type text not null check (document_type in ('policy','procedure','assessment','annex_iv','fria','conformity','incident','vendor','procurement','executive_report')),
  title text not null check (char_length(title) between 3 and 180),
  status text not null default 'draft' check (status in ('draft','in_review','changes_required','approved','published','superseded','archived')),
  classification text not null default 'confidential' check (classification in ('public','internal','confidential','restricted')),
  current_version integer not null default 1 check (current_version > 0),
  owner_id uuid not null references auth.users(id),
  approver_id uuid references auth.users(id),
  approved_at timestamptz,
  published_at timestamptz,
  retention_until timestamptz,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (owner_id <> approver_id),
  check ((status in ('approved','published')) = (approver_id is not null and approved_at is not null)),
  check (status <> 'published' or published_at is not null)
);

create table if not exists public.enterprise_document_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.enterprise_documents(id) on delete cascade,
  version integer not null check (version > 0),
  content_digest_sha256 text not null check (content_digest_sha256 ~ '^[0-9a-f]{64}$'),
  storage_path text not null check (char_length(storage_path) between 3 and 500),
  mime_type text not null check (mime_type in ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/markdown','application/json')),
  change_summary text not null check (char_length(change_summary) between 3 and 1000),
  generated_by text not null check (generated_by in ('human','system','assisted')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (document_id, version)
);

create table if not exists public.enterprise_document_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.enterprise_documents(id) on delete cascade,
  version integer not null check (version > 0),
  reviewer_id uuid not null references auth.users(id),
  decision text not null check (decision in ('approved','changes_required','rejected')),
  rationale text not null check (char_length(rationale) between 3 and 2000),
  created_at timestamptz not null default now(),
  unique (document_id, version, reviewer_id)
);

create table if not exists public.enterprise_report_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid references public.enterprise_documents(id) on delete set null,
  report_type text not null check (report_type in ('executive','board','audit','procurement','regulatory','evidence_pack')),
  format text not null check (format in ('pdf','docx','json','csv')),
  status text not null default 'queued' check (status in ('queued','processing','completed','failed','expired')),
  digest_sha256 text check (digest_sha256 is null or digest_sha256 ~ '^[0-9a-f]{64}$'),
  storage_path text,
  requested_by uuid not null references auth.users(id),
  completed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status = 'completed') = (digest_sha256 is not null and storage_path is not null and completed_at is not null))
);

alter table public.enterprise_documents enable row level security;
alter table public.enterprise_documents force row level security;
alter table public.enterprise_document_versions enable row level security;
alter table public.enterprise_document_versions force row level security;
alter table public.enterprise_document_reviews enable row level security;
alter table public.enterprise_document_reviews force row level security;
alter table public.enterprise_report_exports enable row level security;
alter table public.enterprise_report_exports force row level security;

create policy enterprise_documents_read on public.enterprise_documents for select to authenticated using (exists (select 1 from public.organization_members m where m.organization_id = enterprise_documents.organization_id and m.user_id = auth.uid()));
create policy enterprise_documents_insert on public.enterprise_documents for insert to authenticated with check (created_by = auth.uid() and exists (select 1 from public.organization_members m where m.organization_id = enterprise_documents.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));
create policy enterprise_documents_update on public.enterprise_documents for update to authenticated using (exists (select 1 from public.organization_members m where m.organization_id = enterprise_documents.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin'))) with check (exists (select 1 from public.organization_members m where m.organization_id = enterprise_documents.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));
create policy enterprise_documents_delete on public.enterprise_documents for delete to authenticated using (status = 'draft' and created_by = auth.uid());

create policy enterprise_versions_read on public.enterprise_document_versions for select to authenticated using (exists (select 1 from public.organization_members m where m.organization_id = enterprise_document_versions.organization_id and m.user_id = auth.uid()));
create policy enterprise_versions_insert on public.enterprise_document_versions for insert to authenticated with check (created_by = auth.uid() and exists (select 1 from public.organization_members m where m.organization_id = enterprise_document_versions.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));
create policy enterprise_versions_update_deny on public.enterprise_document_versions for update to authenticated using (false) with check (false);
create policy enterprise_versions_delete_deny on public.enterprise_document_versions for delete to authenticated using (false);

create policy enterprise_reviews_read on public.enterprise_document_reviews for select to authenticated using (exists (select 1 from public.organization_members m where m.organization_id = enterprise_document_reviews.organization_id and m.user_id = auth.uid()));
create policy enterprise_reviews_insert on public.enterprise_document_reviews for insert to authenticated with check (reviewer_id = auth.uid() and exists (select 1 from public.organization_members m where m.organization_id = enterprise_document_reviews.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));
create policy enterprise_reviews_update_deny on public.enterprise_document_reviews for update to authenticated using (false) with check (false);
create policy enterprise_reviews_delete_deny on public.enterprise_document_reviews for delete to authenticated using (false);

create policy enterprise_exports_read on public.enterprise_report_exports for select to authenticated using (exists (select 1 from public.organization_members m where m.organization_id = enterprise_report_exports.organization_id and m.user_id = auth.uid()));
create policy enterprise_exports_insert on public.enterprise_report_exports for insert to authenticated with check (requested_by = auth.uid() and exists (select 1 from public.organization_members m where m.organization_id = enterprise_report_exports.organization_id and m.user_id = auth.uid()));
create policy enterprise_exports_update on public.enterprise_report_exports for update to authenticated using (exists (select 1 from public.organization_members m where m.organization_id = enterprise_report_exports.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin'))) with check (exists (select 1 from public.organization_members m where m.organization_id = enterprise_report_exports.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));
create policy enterprise_exports_delete on public.enterprise_report_exports for delete to authenticated using (requested_by = auth.uid() and status in ('queued','failed','expired'));

create index if not exists enterprise_documents_org_status_idx on public.enterprise_documents (organization_id, status, updated_at desc);
create index if not exists enterprise_versions_document_idx on public.enterprise_document_versions (document_id, version desc);
create index if not exists enterprise_reviews_document_idx on public.enterprise_document_reviews (document_id, version, created_at desc);
create index if not exists enterprise_exports_org_status_idx on public.enterprise_report_exports (organization_id, status, created_at desc);

commit;