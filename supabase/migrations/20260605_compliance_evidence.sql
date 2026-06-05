-- EuroComply AI - Compliance Evidence schema
-- Links documents and evidence to findings, tasks, and EU AI Act articles.

create table if not exists public.compliance_evidence (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid null,
  user_id uuid not null references auth.users(id) on delete cascade,
  finding_id uuid references public.compliance_findings(id) on delete set null,
  task_id uuid references public.compliance_tasks(id) on delete set null,
  article text,
  title text not null,
  description text,
  file_name text,
  file_path text,
  file_url text,
  file_type text,
  file_size bigint,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists compliance_evidence_user_status_idx
  on public.compliance_evidence(user_id, status, created_at desc);

create index if not exists compliance_evidence_workspace_status_idx
  on public.compliance_evidence(workspace_id, status, created_at desc)
  where workspace_id is not null;

create index if not exists compliance_evidence_finding_idx
  on public.compliance_evidence(finding_id);

create index if not exists compliance_evidence_task_idx
  on public.compliance_evidence(task_id);

alter table public.compliance_evidence enable row level security;

create policy if not exists "users can read own compliance evidence"
  on public.compliance_evidence for select
  using (user_id = auth.uid());

create policy if not exists "users can insert own compliance evidence"
  on public.compliance_evidence for insert
  with check (user_id = auth.uid());

create policy if not exists "users can update own compliance evidence"
  on public.compliance_evidence for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy if not exists "users can delete own compliance evidence"
  on public.compliance_evidence for delete
  using (user_id = auth.uid());

-- Storage bucket. Public is false; files are accessed by authenticated users through signed URLs later.
insert into storage.buckets (id, name, public)
values ('compliance-evidence', 'compliance-evidence', false)
on conflict (id) do nothing;

create policy if not exists "users can upload own compliance evidence files"
  on storage.objects for insert
  with check (
    bucket_id = 'compliance-evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy if not exists "users can read own compliance evidence files"
  on storage.objects for select
  using (
    bucket_id = 'compliance-evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy if not exists "users can update own compliance evidence files"
  on storage.objects for update
  using (
    bucket_id = 'compliance-evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'compliance-evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy if not exists "users can delete own compliance evidence files"
  on storage.objects for delete
  using (
    bucket_id = 'compliance-evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
